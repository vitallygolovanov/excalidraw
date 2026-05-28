import type { GlobalPoint, Radians } from "@excalidraw/math";
import type { Bounds } from "@excalidraw/element";
import type { ElementsMap, NonDeletedExcalidrawElement, Theme } from "@excalidraw/element/types";
import type { AppState, UIAppState } from "../../types";
export declare const DEFAULT_LINK_SIZE = 12;
/**
 * Corner link icons are rasterized onto Excalidraw's static canvas (see
 * `renderLinkIcon` in `renderer/staticScene.ts`), not exposed as DOM nodes.
 * Host-app CSS cannot restyle them; theme-aware assets are built here instead.
 */
export declare const LINK_ICON_STROKE_BY_THEME: {
    readonly light: "#1971c2";
    /** Mantine dark `--mantine-color-text` equivalent for Blackboard MVP. */
    readonly dark: "#C1C2C5";
};
type LinkIconVariant = "external" | "element";
export declare const getLinkIconImage: (variant: LinkIconVariant, theme: Theme) => HTMLImageElement;
export declare const getExternalLinkImg: (theme: Theme) => HTMLImageElement;
export declare const getElementLinkImg: (theme: Theme) => HTMLImageElement;
/** @deprecated Prefer `getExternalLinkImg(theme)` — light-theme default for legacy imports. */
export declare const EXTERNAL_LINK_IMG: HTMLImageElement;
/** @deprecated Prefer `getElementLinkImg(theme)` — light-theme default for legacy imports. */
export declare const ELEMENT_LINK_IMG: HTMLImageElement;
export declare const getLinkHandleFromCoords: ([x1, y1, x2, y2]: Bounds, angle: Radians, appState: Pick<UIAppState, "zoom">) => Bounds;
export declare const isPointHittingLinkIcon: (element: NonDeletedExcalidrawElement, elementsMap: ElementsMap, appState: AppState, [x, y]: GlobalPoint) => boolean;
export declare const isPointHittingLink: (element: NonDeletedExcalidrawElement, elementsMap: ElementsMap, appState: AppState, [x, y]: GlobalPoint, isMobile: boolean) => boolean;
export {};
