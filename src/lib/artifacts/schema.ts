import { z } from "zod";

export const artifactTypeSchema = z.enum([
  "code/html",
  "code/react",
  "code/svg",
  "code/javascript",
  "code/python",
  "code/typescript",
  "text/markdown",
  "text/plain",
]);

export type ArtifactType = z.infer<typeof artifactTypeSchema>;

export const artifactSchema = z.object({
  type: artifactTypeSchema.describe(
    "Type of artifact being generated. Use code/html for HTML with inline styles/scripts, code/react for React components, code/svg for SVG graphics, text/markdown for formatted text.",
  ),
  title: z
    .string()
    .describe("Short, descriptive title for the artifact (max 60 characters)."),
  description: z
    .string()
    .optional()
    .describe("Brief description of what this artifact does or shows."),
  code: z
    .string()
    .describe(
      "Complete, runnable code for the artifact. Must be self-contained and executable.",
    ),
  reasoning: z
    .string()
    .optional()
    .describe("Explanation of implementation choices and approach."),
});

export type ArtifactSchema = z.infer<typeof artifactSchema>;

export interface ArtifactMessage {
  id: string;
  role: "assistant";
  artifact: ArtifactSchema;
  timestamp: number;
}
