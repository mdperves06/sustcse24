import { describe, expect, it } from "vitest";
import { sanitizeFileName, sniffFileType } from "@/lib/uploads";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

describe("upload validation", () => {
  it("recognises real image and PDF signatures", () => {
    expect(sniffFileType(bytes(0xff, 0xd8, 0xff, 0xe0), "a.jpg")?.mime).toBe("image/jpeg");
    expect(sniffFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "a.png")?.mime).toBe("image/png");
    expect(sniffFileType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), "cv.pdf")?.mime).toBe("application/pdf");
  });

  it("rejects HTML/SVG disguised with an image extension", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
    expect(sniffFileType(html, "photo.png")).toBeNull();
    expect(sniffFileType(svg, "photo.svg")).toBeNull();
  });

  it("sanitises file names", () => {
    expect(sanitizeFileName('../../etc/passwd"<x>.pdf')).toBe("....etcpasswdx.pdf");
    expect(sanitizeFileName("")).toBe("file");
  });
});
