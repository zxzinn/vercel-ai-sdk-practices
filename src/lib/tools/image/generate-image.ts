import { openai } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { experimental_generateImage as generateImage } from "ai";
import { z } from "zod";

const BUCKET_NAME = "generated-images";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set for image generation",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export const generateImageTool = {
  description:
    "Generate an image based on a text prompt. Use this when the user asks to create, generate, draw, or visualize an image. Provide a detailed and descriptive prompt for best results.",
  inputSchema: z.object({
    prompt: z
      .string()
      .describe(
        "A detailed, descriptive prompt for the image to generate. Be specific about style, composition, colors, and subject matter.",
      ),
    size: z
      .enum(["1024x1024", "1792x1024", "1024x1792"])
      .default("1024x1024")
      .optional()
      .describe("Image dimensions"),
    quality: z
      .enum(["standard", "hd"])
      .default("standard")
      .optional()
      .describe("Image quality level"),
  }),
  execute: async ({
    prompt,
    size = "1024x1024",
    quality = "standard",
  }: {
    prompt: string;
    size?: "1024x1024" | "1792x1024" | "1024x1792";
    quality?: "standard" | "hd";
  }) => {
    try {
      // Get Supabase client (lazy initialization)
      const supabase = getSupabaseClient();

      // Generate image using DALL-E 3
      const { image } = await generateImage({
        model: openai.image("dall-e-3"),
        prompt,
        size,
        providerOptions: {
          openai: {
            quality,
            style: "vivid", // 'vivid' for more dramatic, 'natural' for more realistic
          },
        },
      });

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(image.base64, "base64");

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedPrompt = prompt
        .slice(0, 50)
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const filename = `${timestamp}_${sanitizedPrompt}.png`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filename, imageBuffer, {
          contentType: image.mediaType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Failed to upload image to Supabase:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get signed URL (valid for 1 hour)
      // This works even if bucket is private
      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(filename, 3600); // 3600 seconds = 1 hour

      if (signedUrlError || !signedUrlData) {
        console.error("Failed to create signed URL:", signedUrlError);
        throw new Error(
          `Signed URL creation failed: ${signedUrlError?.message}`,
        );
      }

      return {
        url: signedUrlData.signedUrl,
        prompt,
        size,
        quality,
        filename,
      };
    } catch (error) {
      console.error("Image generation failed:", error);
      throw error;
    }
  },
};
