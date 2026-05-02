import type { AppState, NormalizedZoomValue } from "./types";
export declare const getDefaultAppState: () => Omit<AppState, "offsetTop" | "offsetLeft" | "width" | "height">;
export declare const clearAppStateForLocalStorage: (appState: Partial<AppState>) => {
    stats?: {
        open: boolean;
        panels: number;
    } | undefined;
    exportWithDarkMode?: boolean | undefined;
    cursorButton?: "up" | "down" | undefined;
    scrollX?: number | undefined;
    scrollY?: number | undefined;
    showWelcomeScreen?: boolean | undefined;
    activeTool?: ({
        lastActiveTool: import("./types").ActiveTool | null;
        locked: boolean;
        fromSelection: boolean;
    } & import("./types").ActiveTool) | undefined;
    penMode?: boolean | undefined;
    penDetected?: boolean | undefined;
    exportBackground?: boolean | undefined;
    exportEmbedScene?: boolean | undefined;
    exportScale?: number | undefined;
    currentItemStrokeColor?: string | undefined;
    currentItemBackgroundColor?: string | undefined;
    currentItemFillStyle?: import("@excalidraw/element/types").FillStyle | undefined;
    currentItemStrokeWidth?: number | undefined;
    currentItemStrokeStyle?: import("@excalidraw/element/types").StrokeStyle | undefined;
    currentItemRoughness?: number | undefined;
    currentItemOpacity?: number | undefined;
    currentItemFontFamily?: number | undefined;
    currentItemFontSize?: number | undefined;
    currentItemTextAlign?: string | undefined;
    currentItemStartArrowhead?: import("@excalidraw/element/types").Arrowhead | null | undefined;
    currentItemEndArrowhead?: import("@excalidraw/element/types").Arrowhead | null | undefined;
    currentItemRoundness?: import("@excalidraw/element/types").StrokeRoundness | undefined;
    currentItemArrowType?: "round" | "sharp" | "elbow" | undefined;
    viewBackgroundColor?: string | undefined;
    scrolledOutside?: boolean | undefined;
    name?: string | null | undefined;
    zoom?: Readonly<{
        value: NormalizedZoomValue;
    }> | undefined;
    openMenu?: "canvas" | "shape" | null | undefined;
    openSidebar?: {
        name: string;
        tab?: string | undefined;
    } | null | undefined;
    defaultSidebarDockedPreference?: boolean | undefined;
    lastPointerDownWith?: import("@excalidraw/element/types").PointerType | undefined;
    selectedElementIds?: Readonly<{
        [id: string]: true;
    }> | undefined;
    previousSelectedElementIds?: {
        [id: string]: true;
    } | undefined;
    shouldCacheIgnoreZoom?: boolean | undefined;
    zenModeEnabled?: boolean | undefined;
    theme?: import("@excalidraw/element/types").Theme | undefined;
    gridSize?: number | undefined;
    gridStep?: number | undefined;
    gridModeEnabled?: boolean | undefined;
    selectedGroupIds?: {
        [groupId: string]: boolean;
    } | undefined;
    editingGroupId?: string | null | undefined;
    currentChartType?: import("@excalidraw/element/types").ChartType | undefined;
    selectedLinearElement?: import("@excalidraw/element").LinearElementEditor | null | undefined;
    objectsSnapModeEnabled?: boolean | undefined;
    lockedMultiSelections?: {
        [groupId: string]: true;
    } | undefined;
};
export declare const cleanAppStateForExport: (appState: Partial<AppState>) => {
    viewBackgroundColor?: string | undefined;
    gridSize?: number | undefined;
    gridStep?: number | undefined;
    gridModeEnabled?: boolean | undefined;
    lockedMultiSelections?: {
        [groupId: string]: true;
    } | undefined;
};
export declare const clearAppStateForDatabase: (appState: Partial<AppState>) => {
    viewBackgroundColor?: string | undefined;
    gridSize?: number | undefined;
    gridStep?: number | undefined;
    gridModeEnabled?: boolean | undefined;
    lockedMultiSelections?: {
        [groupId: string]: true;
    } | undefined;
};
export declare const isEraserActive: ({ activeTool, }: {
    activeTool: AppState["activeTool"];
}) => boolean;
export declare const isHandToolActive: ({ activeTool, }: {
    activeTool: AppState["activeTool"];
}) => boolean;
