import { describe, expect, it } from "vitest";
import { sanitizeFileName } from "./file";

describe("sanitizeFileName", () => {
  it("should keep valid filenames unchanged", () => {
    expect(sanitizeFileName("document.pdf")).toBe("document.pdf");
    expect(sanitizeFileName("my-file_123.txt")).toBe("my-file_123.txt");
    expect(sanitizeFileName("data.json")).toBe("data.json");
  });

  it("should replace spaces with underscores", () => {
    expect(sanitizeFileName("my document.pdf")).toBe("my_document.pdf");
    expect(sanitizeFileName("hello world.txt")).toBe("hello_world.txt");
  });

  it("should replace special characters with underscores", () => {
    expect(sanitizeFileName("file@#$%.txt")).toBe("file____.txt");
    expect(sanitizeFileName("document (1).pdf")).toBe("document__1_.pdf");
    expect(sanitizeFileName("my*file?.docx")).toBe("my_file_.docx");
  });

  it("should preserve dots, dashes, and underscores in basename", () => {
    expect(sanitizeFileName("my.file-name_v1.txt")).toBe("my.file-name_v1.txt");
    expect(sanitizeFileName("data-2024.01.15.csv")).toBe("data-2024.01.15.csv");
  });

  it("should handle files without extensions", () => {
    expect(sanitizeFileName("README")).toBe("README");
    expect(sanitizeFileName("my file")).toBe("my_file");
    expect(sanitizeFileName("config@server")).toBe("config_server");
  });

  it("should handle multiple dots in filename", () => {
    expect(sanitizeFileName("archive.tar.gz")).toBe("archive.tar.gz");
    expect(sanitizeFileName("backup.2024.01.15.zip")).toBe(
      "backup.2024.01.15.zip",
    );
  });

  it("should sanitize extension with special characters", () => {
    expect(sanitizeFileName("file.tx@t")).toBe("file.txt");
    expect(sanitizeFileName("document.pdf!")).toBe("document.pdf");
  });

  it("should handle Chinese/Unicode characters", () => {
    expect(sanitizeFileName("文件.pdf")).toBe("__.pdf");
    expect(sanitizeFileName("測試檔案.txt")).toBe("____.txt");
    expect(sanitizeFileName("document_中文.pdf")).toBe("document___.pdf");
  });

  it("should handle edge cases", () => {
    expect(sanitizeFileName("")).toBe("");
    expect(sanitizeFileName(".")).toBe(".");
    expect(sanitizeFileName(".gitignore")).toBe(".gitignore");
    expect(sanitizeFileName("...")).toBe("...");
  });

  it("should handle very long filenames", () => {
    const longName = `${"a".repeat(100)}.txt`;
    const result = sanitizeFileName(longName);
    expect(result).toBe(longName);
    expect(result.endsWith(".txt")).toBe(true);
  });

  it("should handle multiple consecutive special characters", () => {
    expect(sanitizeFileName("file@#$%^&*().txt")).toBe("file_________.txt");
    expect(sanitizeFileName("my!!!file???.pdf")).toBe("my___file___.pdf");
  });

  it("should preserve allowed characters only", () => {
    const validChars = "abcABC123._-";
    expect(sanitizeFileName(`${validChars}.txt`)).toBe(`${validChars}.txt`);
  });

  it("should handle paths (should only sanitize the filename part)", () => {
    expect(sanitizeFileName("my/file.txt")).toBe("my_file.txt");
    expect(sanitizeFileName("folder\\document.pdf")).toBe(
      "folder_document.pdf",
    );
  });
});
