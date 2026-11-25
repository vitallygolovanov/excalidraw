import { Emitter } from "@excalidraw/common";
import { StoreDelta } from "@excalidraw/element";
import type { StoreSnapshot, Store } from "@excalidraw/element";
import type { SceneElementsMap } from "@excalidraw/element/types";
import type { AppState } from "./types";
export declare class HistoryDelta extends StoreDelta {
    /**
     * Apply the delta to the passed elements and appState, does not modify the snapshot.
     */
    applyTo(elements: SceneElementsMap, appState: AppState, snapshot: StoreSnapshot): [SceneElementsMap, AppState, boolean];
    /**
     * Overriding once to avoid type casting everywhere.
     */
    static calculate(prevSnapshot: StoreSnapshot, nextSnapshot: StoreSnapshot): HistoryDelta;
    /**
     * Overriding once to avoid type casting everywhere.
     */
    static inverse(delta: StoreDelta): HistoryDelta;
    /**
     * Overriding once to avoid type casting everywhere.
     */
    static applyLatestChanges(delta: StoreDelta, prevElements: SceneElementsMap, nextElements: SceneElementsMap, modifierOptions?: "deleted" | "inserted"): HistoryDelta;
}
export declare class HistoryChangedEvent {
    readonly isUndoStackEmpty: boolean;
    readonly isRedoStackEmpty: boolean;
    constructor(isUndoStackEmpty?: boolean, isRedoStackEmpty?: boolean);
}
export type HistoryActionType = "undo" | "redo";
export declare class HistoryActionEvent {
    readonly type: HistoryActionType;
    readonly elementIds: readonly string[];
    constructor(type: HistoryActionType, elementIds: readonly string[]);
}
/**
 * [fork:host-history-stacks] The undo/redo stacks, owned by whoever creates them. A host that keeps one
 * object per document and passes it back (`historyStacks` prop) gets its undo history through a remount
 * of the editor: React Activity hide/reveal re-runs mount (which resets history), and a host that
 * rebuilds its collaboration room remounts the editor outright. Opaque to hosts: create one with
 * `createHistoryStacks()` and never touch the entries.
 */
export type HistoryStacks = {
    readonly undoStack: HistoryDelta[];
    readonly redoStack: HistoryDelta[];
};
export declare const createHistoryStacks: () => HistoryStacks;
export declare class History {
    private readonly store;
    private readonly options;
    readonly onHistoryChangedEmitter: Emitter<[HistoryChangedEvent]>;
    readonly onHistoryActionEmitter: Emitter<[HistoryActionEvent]>;
    readonly undoStack: HistoryDelta[];
    readonly redoStack: HistoryDelta[];
    get isUndoStackEmpty(): boolean;
    get isRedoStackEmpty(): boolean;
    constructor(store: Store, options?: {
        recordSelectionChanges?: boolean;
        stacks?: HistoryStacks;
    });
    clear(): void;
    /**
     * Record a non-empty local durable increment, which will go into the undo stack..
     * Do not re-record history entries, which were already pushed to undo / redo stack, as part of history action.
     */
    record(delta: StoreDelta): void;
    undo(elements: SceneElementsMap, appState: AppState): void | [SceneElementsMap, AppState];
    redo(elements: SceneElementsMap, appState: AppState): void | [SceneElementsMap, AppState];
    private perform;
    private static pop;
    private static push;
}
