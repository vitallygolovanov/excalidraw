import type { ExcalidrawFrameTitleElement } from "@excalidraw/element/types";

import type { ResolveFrameTitle } from "./types";

export function getDisplayedFrameTitle(
  element: ExcalidrawFrameTitleElement,
  resolveFrameTitle?: ResolveFrameTitle,
) {
  if (element.type !== "editor_frame") {
    return element.name?.trim() || "Frame";
  }

  const resolvedTitle = resolveFrameTitle?.(element)?.trim();

  return resolvedTitle || element.name?.trim() || "Frame";
}