import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/api-helpers";
import { createErrorFromException, Errors } from "@/lib/errors/api-error";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFileName } from "@/lib/utils/file";
import { validateRequestRaw } from "@/lib/validation/api-validation";

const STORAGE_BUCKET = "documents";
const MAX_FILES = 20;
const MAX_TOTAL_MB = 100;
const MAX_FILE_MB = 10;

const UploadUrlRequestSchema = z
  .object({
    files: z
      .array(
        z.object({
          name: z.string().min(1),
          size: z.number().int().nonnegative(),
          type: z.string().min(1),
        }),
      )
      .min(1),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { userId } = authResult;

    const validation = validateRequestRaw(
      UploadUrlRequestSchema,
      await req.json(),
    );
    if (validation instanceof Response) return validation;
    const { files } = validation;

    // Fail fast: reject unsupported file types (only text/* allowed)
    const invalidType = files.find((f) => !/^text\//.test(f.type || ""));
    if (invalidType) {
      return Errors.badRequest(
        `Unsupported file type: ${invalidType.type}. Only text/* files are allowed.`,
      );
    }

    // DoS prevention: check file count
    if (files.length > MAX_FILES) {
      return Errors.payloadTooLarge(
        `Too many files. Maximum ${MAX_FILES} files allowed per request.`,
        {
          limit: MAX_FILES,
          provided: files.length,
        },
      );
    }

    // DoS prevention: check individual file sizes
    const tooLargeFile = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooLargeFile) {
      return Errors.payloadTooLarge(
        `File "${tooLargeFile.name}" exceeds ${MAX_FILE_MB} MB limit`,
        {
          limit: `${MAX_FILE_MB} MB`,
          fileName: tooLargeFile.name,
          fileSize: `${(tooLargeFile.size / 1024 / 1024).toFixed(2)} MB`,
        },
      );
    }

    // DoS prevention: check total size
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalMB = totalSize / 1024 / 1024;
    if (totalMB > MAX_TOTAL_MB) {
      return Errors.payloadTooLarge(
        `Total file size exceeds ${MAX_TOTAL_MB} MB limit`,
        {
          limit: `${MAX_TOTAL_MB} MB`,
          totalSize: `${totalMB.toFixed(2)} MB`,
          fileCount: files.length,
        },
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
        return Errors.internalError("Failed to generate upload URL", {
          message: error.message,
        });
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
    return createErrorFromException(error, "Failed to generate upload URLs");
  }
}
