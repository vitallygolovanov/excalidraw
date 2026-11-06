import type { ExcalidrawFrameTitleElement } from "@excalidraw/element/types";

import { t } from "./i18n";

import type { ResolveFrameTitle } from "./types";

export function getDisplayedFrameTitle(
  element: ExcalidrawFrameTitleElement,
  resolveFrameTitle?: ResolveFrameTitle,
) {
  if (element.type !== "editor_frame") {
    return element.name?.trim() || t("element.frame");
  }

  const resolvedTitle = resolveFrameTitle?.(element)?.trim();

  return resolvedTitle || element.name?.trim() || t("element.frame");
}