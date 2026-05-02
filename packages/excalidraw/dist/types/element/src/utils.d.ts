import { type GlobalPoint } from "@excalidraw/math";
import type { Curve, LineSegment } from "@excalidraw/math";
import type { Zoom } from "@excalidraw/excalidraw/types";
import type { ExcalidrawDiamondElement, ExcalidrawElement, ExcalidrawFreeDrawElement, ExcalidrawLinearElement, ExcalidrawRectanguloidElement } from "./types";
export declare function deconstructLinearOrFreeDrawElement(element: ExcalidrawLinearElement | ExcalidrawFreeDrawElement): [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]];
/**
 * Get the building components of a rectanguloid element in the form of
 * line segments and curves.
 *
 * @param element Target rectanguloid element
 * @param offset Optional offset to expand the rectanguloid shape
 * @returns Tuple of line segments (0) and curves (1)
 */
export declare function deconstructRectanguloidElement(element: ExcalidrawRectanguloidElement, offset?: number): [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]];
/**
 * Get the building components of a diamond element in the form of
 * line segments and curves as a tuple, in this order.
 *
 * @param element The element to deconstruct
 * @param offset An optional offset
 * @returns Tuple of line segments (0) and curves (1)
 */
export declare function deconstructDiamondElement(element: ExcalidrawDiamondElement, offset?: number): [LineSegment<GlobalPoint>[], Curve<GlobalPoint>[]];
export declare const isPathALoop: (points: ExcalidrawLinearElement["points"], zoomValue?: Zoom["value"]) => boolean;
export declare const getCornerRadius: (x: number, element: ExcalidrawElement) => number;
