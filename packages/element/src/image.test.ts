import { MIME_TYPES } from "@excalidraw/common";

import type { BinaryFiles, DataURL } from "@excalidraw/excalidraw/types";

import { updateImageCache } from "./image";

class MockImage {
  onload: null | (() => void) = null;
  onerror: null | ((error: unknown) => void) = null;
  crossOrigin: string | null = null;
  private _src = "";

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      this.onload?.();
    });
  }

  get src() {
    return this._src;
  }
}

describe("updateImageCache", () => {
  const originalImage = globalThis.Image;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("Image", MockImage as unknown as typeof Image);
  });

  afterAll(() => {
    vi.stubGlobal("Image", originalImage);
  });

  it("normalizes stable upload URLs using same-origin credentials", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["png-binary"], { type: MIME_TYPES.png }), {
        status: 200,
      }),
    );
    const imageCache = new Map();

    const files: BinaryFiles = {
      "file-1": {
        id: "file-1",
        dataURL: "/api/uploads/fbc?c=checksum-1" as DataURL,
        mimeType: MIME_TYPES.png,
        created: 1,
      },
    };

    const result = await updateImageCache({
      fileIds: ["file-1"],
      files,
      imageCache,
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/uploads/fbc?c=checksum-1", {
      credentials: "same-origin",
    });
    expect(result.erroredFiles.size).toBe(0);
    expect(result.updatedFiles.has("file-1")).toBe(true);
    expect(imageCache.has("file-1")).toBe(true);
  });
});
