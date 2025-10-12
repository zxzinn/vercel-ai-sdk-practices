import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "documents";
const GENERATED_IMAGES_BUCKET = "generated-images";

export interface UploadFileOptions {
  userId: string;
  documentId: string;
  file: File;
}

export interface UploadFileResult {
  storageUrl: string;
  fullPath: string;
}

function sanitizeFileName(fileName: string): string {
  // Extract extension
  const lastDotIndex = fileName.lastIndexOf(".");
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : "";
  const baseName =
    lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;

  // Sanitize base name (only alphanumeric, underscore, hyphen)
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Sanitize extension
  const sanitizedExtension = extension.replace(/[^a-zA-Z0-9.]/g, "");

  return sanitizedBaseName + sanitizedExtension;
}

export async function uploadFile({
  userId,
  documentId,
  file,
}: UploadFileOptions): Promise<UploadFileResult> {
  const supabase = await createClient();

  const sanitizedFileName = sanitizeFileName(file.name);
  const filePath = `${userId}/${documentId}/${sanitizedFileName}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return {
    storageUrl: data.path,
    fullPath: filePath,
  };
}

export async function getDownloadUrl(
  storageUrl: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storageUrl, 3600);

  return data?.signedUrl ?? null;
}

export async function deleteFile(storageUrl: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storageUrl]);

  if (error) {
    console.error("Storage delete error:", error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

export async function deleteFolder(
  userId: string,
  documentId: string,
): Promise<void> {
  const supabase = await createClient();

  const folderPath = `${userId}/${documentId}`;

  const { data: files, error: listError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folderPath);

  if (listError) {
    console.error("Storage list error:", listError);
    throw new Error(`Failed to list files: ${listError.message}`);
  }

  if (files && files.length > 0) {
    const filePaths = files.map((file) => `${folderPath}/${file.name}`);

    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(filePaths);

    if (deleteError) {
      console.error("Storage delete error:", deleteError);
      throw new Error(`Failed to delete files: ${deleteError.message}`);
    }
  }
}

export interface UploadGeneratedImageOptions {
  userId: string;
  imageBuffer: Buffer;
  mediaType: string;
  prompt: string;
}

export interface UploadGeneratedImageResult {
  signedUrl: string;
  filename: string;
}

export async function uploadGeneratedImage({
  userId,
  imageBuffer,
  mediaType,
  prompt,
}: UploadGeneratedImageOptions): Promise<UploadGeneratedImageResult> {
  const supabase = await createClient();

  const timestamp = Date.now();
  const sanitizedPrompt = prompt
    .slice(0, 50)
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  const filename = `${timestamp}_${sanitizedPrompt}.png`;
  const filePath = `${userId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(GENERATED_IMAGES_BUCKET)
    .upload(filePath, imageBuffer, {
      contentType: mediaType,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload image:", uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(GENERATED_IMAGES_BUCKET)
    .createSignedUrl(filePath, 3600);

  if (signedUrlError || !signedUrlData) {
    console.error("Failed to create signed URL:", signedUrlError);
    throw new Error(`Signed URL creation failed: ${signedUrlError?.message}`);
  }

  return {
    signedUrl: signedUrlData.signedUrl,
    filename,
  };
}
