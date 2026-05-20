import type { ExcalidrawFrameTitleElement } from "@excalidraw/element/types";

import { getDisplayedFrameTitle } from "./frameTitle";

function createEditorFrame(
  overrides: Partial<ExcalidrawFrameTitleElement> = {},
): ExcalidrawFrameTitleElement {
  return {
    id: "frame-1",
    type: "editor_frame",
    x: 0,
    y: 0,
    width: 400,
    height: 240,
    angle: 0,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: 0,
    link: null,
    locked: false,
    name: "Persisted fallback",
    customData: null,
    index: null,
    ...overrides,
  } as ExcalidrawFrameTitleElement;
}

describe("getDisplayedFrameTitle", () => {
  it("prefers the resolver result for editor_frame titles", () => {
    const element = createEditorFrame();

    expect(
      getDisplayedFrameTitle(element, () => "Resolved title"),
    ).toBe("Resolved title");
  });

  it("falls back to the persisted element name when the resolver returns empty", () => {
    const element = createEditorFrame({ name: "Persisted fallback" });

    expect(getDisplayedFrameTitle(element, () => "   ")).toBe(
      "Persisted fallback",
    );
    expect(getDisplayedFrameTitle(element, () => null)).toBe(
      "Persisted fallback",
    );
    expect(getDisplayedFrameTitle(element, () => undefined)).toBe(
      "Persisted fallback",
    );
  });

  it('falls back to "Frame" when both resolver and persisted name are unusable', () => {
    const element = createEditorFrame({ name: "   " });

    expect(getDisplayedFrameTitle(element, () => "")).toBe("Frame");
  });
});