import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "documents";
const MAX_FILES = 20;
const MAX_TOTAL_MB = 100;
const MAX_FILE_MB = 10;

interface UploadUrlRequest {
  files: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized - Please refresh the page to sign in",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      );
    }

    const body = (await req.json()) as UploadUrlRequest;
    const { files } = body;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // DoS prevention: check file count
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: `Too many files. Maximum ${MAX_FILES} files allowed per request.`,
          limit: MAX_FILES,
          provided: files.length,
        },
        { status: 413 },
      );
    }

    // DoS prevention: check individual file sizes
    const tooLargeFile = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooLargeFile) {
      return NextResponse.json(
        {
          error: `File "${tooLargeFile.name}" exceeds ${MAX_FILE_MB} MB limit`,
          limit: `${MAX_FILE_MB} MB`,
          fileName: tooLargeFile.name,
          fileSize: `${(tooLargeFile.size / 1024 / 1024).toFixed(2)} MB`,
        },
        { status: 413 },
      );
    }

    // DoS prevention: check total size
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalMB = totalSize / 1024 / 1024;
    if (totalMB > MAX_TOTAL_MB) {
      return NextResponse.json(
        {
          error: `Total file size exceeds ${MAX_TOTAL_MB} MB limit`,
          limit: `${MAX_TOTAL_MB} MB`,
          totalSize: `${totalMB.toFixed(2)} MB`,
          fileCount: files.length,
        },
        { status: 413 },
      );
    }

    const supabase = await createClient();
    const uploadUrls: Array<{
      documentId: string;
      fileName: string;
      filePath: string;
      signedUrl: string;
      token: string;
    }> = [];

    // Generate presigned upload URL for each file
    for (const file of files) {
      const documentId = nanoid();
      const sanitizedFileName = sanitizeFileName(file.name);
      const filePath = `${userId}/${documentId}/${sanitizedFileName}`;

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUploadUrl(filePath);

      if (error) {
        console.error("Failed to create signed upload URL:", error);
        return NextResponse.json(
          {
            error: "Failed to generate upload URL",
            message: error.message,
          },
          { status: 500 },
        );
      }

      uploadUrls.push({
        documentId,
        fileName: file.name,
        filePath,
        signedUrl: data.signedUrl,
        token: data.token,
      });
    }

    return NextResponse.json({
      uploadUrls,
      expiresIn: 7200, // 2 hours in seconds
    });
  } catch (error) {
    console.error("Upload URL generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate upload URLs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function sanitizeFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : "";
  const baseName =
    lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;

  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const sanitizedExtension = extension.replace(/[^a-zA-Z0-9.]/g, "");

  return sanitizedBaseName + sanitizedExtension;
}
