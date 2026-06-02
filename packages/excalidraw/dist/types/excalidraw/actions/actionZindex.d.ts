/// <reference types="react" />
import type { AppState } from "../types";
export declare const actionSendBackward: {
    name: "sendBackward";
    label: string;
    keywords: string[];
    icon: import("react/jsx-runtime").JSX.Element;
    trackEvent: {
        category: "element";
    };
    perform: (elements: readonly import("@excalidraw/element/types").OrderedExcalidrawElement[], appState: Readonly<AppState>, value: any, app: import("../types").AppClassProperties) => {
        elements: readonly import("@excalidraw/element/types").ExcalidrawElement[];
        appState: Readonly<AppState>;
        captureUpdate: "IMMEDIATELY";
    };
    keyPriority: number;
    keyTest: (event: import("react").KeyboardEvent<Element> | KeyboardEvent, appState: AppState) => boolean;
    PanelComponent: ({ updateData, appState }: import("./types").PanelComponentProps) => import("react/jsx-runtime").JSX.Element;
} & {
    keyTest?: ((event: import("react").KeyboardEvent<Element> | KeyboardEvent, appState: AppState) => boolean) | undefined;
};
export declare const actionBringForward: {
    name: "bringForward";
    label: string;
    keywords: string[];
    icon: import("react/jsx-runtime").JSX.Element;
    trackEvent: {
        category: "element";
    };
    perform: (elements: readonly import("@excalidraw/element/types").OrderedExcalidrawElement[], appState: Readonly<AppState>, value: any, app: import("../types").AppClassProperties) => {
        elements: readonly import("@excalidraw/element/types").ExcalidrawElement[];
        appState: Readonly<AppState>;
        captureUpdate: "IMMEDIATELY";
    };
    keyPriority: number;
    keyTest: (event: import("react").KeyboardEvent<Element> | KeyboardEvent, appState: AppState) => boolean;
    PanelComponent: ({ updateData, appState }: import("./types").PanelComponentProps) => import("react/jsx-runtime").JSX.Element;
} & {
    keyTest?: ((event: import("react").KeyboardEvent<Element> | KeyboardEvent, appState: AppState) => boolean) | undefined;
};
export declare const actionSendToBack: {
    name: "sendToBack";
    label: string;
    keywords: string[];
    icon: import("react/jsx-runtime").JSX.Element;
    trackEvent: {
        category: "element";
    };
    perform: (elements: readonly import("@excalidraw/element/types").OrderedExcalidrawElement[], appState: Readonly<AppState>) => {
        elements: readonly import("@excalidraw/element/types").ExcalidrawElement[] | import("@excalidraw/element/types").ExcalidrawElement[];
        appState: Readonly<AppState>;
        captureUpdate: "IMMEDIATELY";
    };
    keyTest: (event: import("react").KeyboardEvent<Element> | KeyboardEvent, appState: AppState) => boolean;
    PanelComponent: ({ updateData, appState }: import("./types").PanelComponentProps) => import("react/jsx-runtime").JSX.Element;
} & {
    keyTest?: ((event: import("react").KeyboardEvent<Element> | KeyboardEvent, appState: AppState) => boolean) | undefined;
};
export declare const actionBringToFront: {
    name: "bringToFront";
    label: string;
    keywords: string[];
    icon: import("react/jsx-runtime").JSX.Element;
    trackEvent: {
        category: "element";
    };
    perform: (elements: readonly import("@excalidraw/element/types").OrderedExcalidrawElement[], appState: Readonly<AppState>) => {
        elements: readonly import("@excalidraw/element/types").ExcalidrawElement[] | import("@excalidraw/element/types").ExcalidrawElement[];
        appState: Readonly<AppState>;
        captureUpdate: "IMMEDIATELY";
    };
    keyTest: (event: import("react").KeyboardEvent<Element> | KeyboardEvent, appState: AppState) => boolean;
    PanelComponent: ({ updateData, appState }: import("./types").PanelComponentProps) => import("react/jsx-runtime").JSX.Element;
} & {
    keyTest?: ((event: import("react").KeyboardEvent<Element> | KeyboardEvent, appState: AppState) => boolean) | undefined;
};
