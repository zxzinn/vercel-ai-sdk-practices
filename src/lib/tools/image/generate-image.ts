import { createOpenAI } from "@ai-sdk/openai";
import { experimental_generateImage as generateImage } from "ai";
import { nanoid } from "nanoid";
import { z } from "zod";
import { uploadImageToStorage } from "@/lib/storage/supabase";

export const generateImageTool = {
  description:
    "Generate an image from a text prompt using DALL-E 3. IMPORTANT: The prompt MUST be in English for best results.",
  inputSchema: z.object({
    prompt: z.string().max(1000).describe("Image description in English"),
  }),
  execute: async ({ prompt }: { prompt: string }) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const { image } = await generateImage({
        model: openai.image("dall-e-3"),
        prompt,
        size: "1024x1024",
      });

      // Upload to Supabase Storage and get public URL
      const fileName = `${nanoid()}-${Date.now()}.png`;
      const imageUrl = await uploadImageToStorage(image.base64, fileName);

      return {
        imageUrl,
        prompt,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
};
