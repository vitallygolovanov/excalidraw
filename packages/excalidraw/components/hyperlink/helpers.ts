import { pointFrom, pointRotateRads } from "@excalidraw/math";

import { MIME_TYPES, THEME } from "@excalidraw/common";
import { getElementAbsoluteCoords } from "@excalidraw/element";
import { hitElementBoundingBox } from "@excalidraw/element";

import type { GlobalPoint, Radians } from "@excalidraw/math";

import type { Bounds } from "@excalidraw/element";
import type {
  ElementsMap,
  NonDeletedExcalidrawElement,
  Theme,
} from "@excalidraw/element/types";

import type { AppState, UIAppState } from "../../types";

export const DEFAULT_LINK_SIZE = 12;

/**
 * Corner link icons are rasterized onto Excalidraw's static canvas (see
 * `renderLinkIcon` in `renderer/staticScene.ts`), not exposed as DOM nodes.
 * Host-app CSS cannot restyle them; theme-aware assets are built here instead.
 */
export const LINK_ICON_STROKE_BY_THEME = {
  [THEME.LIGHT]: "#1971c2",
  /** Mantine dark `--mantine-color-text` equivalent for Blackboard MVP. */
  [THEME.DARK]: "#C1C2C5",
} as const satisfies Record<Theme, string>;

type LinkIconVariant = "external" | "element";

const linkIconImageCache = new Map<string, HTMLImageElement>();

const buildExternalLinkSvg = (stroke: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="feather feather-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;

const buildElementLinkSvg = (stroke: string) =>
  `<svg  xmlns="http://www.w3.org/2000/svg"  width="16"  height="16"  viewBox="0 0 24 24"  fill="none"  stroke="${stroke}"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-big-right-line"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 9v-3.586a1 1 0 0 1 1.707 -.707l6.586 6.586a1 1 0 0 1 0 1.414l-6.586 6.586a1 1 0 0 1 -1.707 -.707v-3.586h-6v-6h6z" /><path d="M3 9v6" /></svg>`;

const createLinkIconImage = (variant: LinkIconVariant, theme: Theme) => {
  const stroke = LINK_ICON_STROKE_BY_THEME[theme];
  const svg =
    variant === "external"
      ? buildExternalLinkSvg(stroke)
      : buildElementLinkSvg(stroke);
  const img = document.createElement("img");
  img.src = `data:${MIME_TYPES.svg}, ${encodeURIComponent(svg)}`;
  return img;
};

export const getLinkIconImage = (
  variant: LinkIconVariant,
  theme: Theme,
): HTMLImageElement => {
  const cacheKey = `${variant}:${theme}`;
  const cached = linkIconImageCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const img = createLinkIconImage(variant, theme);
  linkIconImageCache.set(cacheKey, img);
  return img;
};

export const getExternalLinkImg = (theme: Theme) =>
  getLinkIconImage("external", theme);

export const getElementLinkImg = (theme: Theme) =>
  getLinkIconImage("element", theme);

/** @deprecated Prefer `getExternalLinkImg(theme)` — light-theme default for legacy imports. */
export const EXTERNAL_LINK_IMG = getExternalLinkImg(THEME.LIGHT);

/** @deprecated Prefer `getElementLinkImg(theme)` — light-theme default for legacy imports. */
export const ELEMENT_LINK_IMG = getElementLinkImg(THEME.LIGHT);

export const getLinkHandleFromCoords = (
  [x1, y1, x2, y2]: Bounds,
  angle: Radians,
  appState: Pick<UIAppState, "zoom">,
): Bounds => {
  const size = DEFAULT_LINK_SIZE;
  const zoom = appState.zoom.value > 1 ? appState.zoom.value : 1;
  const linkWidth = size / zoom;
  const linkHeight = size / zoom;
  const linkMarginY = size / zoom;
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const centeringOffset = (size - 8) / (2 * zoom);
  const dashedLineMargin = 4 / zoom;

  // Same as `ne` resize handle
  const x = x2 + dashedLineMargin - centeringOffset;
  const y = y1 - dashedLineMargin - linkMarginY + centeringOffset;

  const [rotatedX, rotatedY] = pointRotateRads(
    pointFrom(x + linkWidth / 2, y + linkHeight / 2),
    pointFrom(centerX, centerY),
    angle,
  );
  return [
    rotatedX - linkWidth / 2,
    rotatedY - linkHeight / 2,
    linkWidth,
    linkHeight,
  ];
};

export const isPointHittingLinkIcon = (
  element: NonDeletedExcalidrawElement,
  elementsMap: ElementsMap,
  appState: AppState,
  [x, y]: GlobalPoint,
) => {
  const threshold = 4 / appState.zoom.value;
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap);
  const [linkX, linkY, linkWidth, linkHeight] = getLinkHandleFromCoords(
    [x1, y1, x2, y2],
    element.angle,
    appState,
  );
  const hitLink =
    x > linkX - threshold &&
    x < linkX + threshold + linkWidth &&
    y > linkY - threshold &&
    y < linkY + linkHeight + threshold;
  return hitLink;
};

export const isPointHittingLink = (
  element: NonDeletedExcalidrawElement,
  elementsMap: ElementsMap,
  appState: AppState,
  [x, y]: GlobalPoint,
  isMobile: boolean,
) => {
  if (!element.link || appState.selectedElementIds[element.id]) {
    return false;
  }
  if (
    !isMobile &&
    appState.viewModeEnabled &&
    hitElementBoundingBox(pointFrom(x, y), element, elementsMap)
  ) {
    return true;
  }
  return isPointHittingLinkIcon(
    element,
    elementsMap,
    appState,
    pointFrom(x, y),
  );
};
