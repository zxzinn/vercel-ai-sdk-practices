import { openai } from "@ai-sdk/openai";
import { experimental_generateImage as generateImage } from "ai";
import { z } from "zod";
import { uploadGeneratedImage } from "@/lib/storage/server";
import { createClient } from "@/lib/supabase/server";

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
      // Get authenticated user
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Authentication required to generate images");
      }

      // Generate image using DALL-E 3
      const { image } = await generateImage({
        model: openai.image("dall-e-3"),
        prompt,
        size,
        providerOptions: {
          openai: {
            quality,
            style: "vivid",
          },
        },
      });

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(image.base64, "base64");

      // Upload to Supabase Storage with authentication
      const { signedUrl, filename } = await uploadGeneratedImage({
        userId: user.id,
        imageBuffer,
        mediaType: image.mediaType,
        prompt,
      });

      return {
        url: signedUrl,
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
