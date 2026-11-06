import { Emitter } from "@excalidraw/common";

import {
  CaptureUpdateAction,
  StoreChange,
  StoreDelta,
} from "@excalidraw/element";

import type { StoreSnapshot, Store } from "@excalidraw/element";

import type { SceneElementsMap } from "@excalidraw/element/types";

import type { AppState, ObservedElementsAppState } from "./types";

// [fork:skip-selection-only-history] observed appState keys that only describe what is selected or
// being edited. A Record over `ObservedElementsAppState` makes an upstream-added key a type error here.
// `viewBackgroundColor` and `name` (ObservedStandaloneAppState) are document edits and stay recorded.
const SELECTION_ONLY_APP_STATE_KEYS: Record<keyof ObservedElementsAppState, true> = {
  selectedElementIds: true,
  selectedGroupIds: true,
  editingGroupId: true,
  selectedLinearElementId: true,
  editingLinearElementId: true,
  croppingElementId: true,
  activeLockedId: true,
  lockedMultiSelections: true,
};

const isSelectionOnlyDelta = (delta: HistoryDelta) =>
  delta.elements.isEmpty() &&
  Object.keys({
    ...delta.appState.delta.deleted,
    ...delta.appState.delta.inserted,
  }).every((key) => Object.hasOwn(SELECTION_ONLY_APP_STATE_KEYS, key));

export class HistoryDelta extends StoreDelta {
  /**
   * Apply the delta to the passed elements and appState, does not modify the snapshot.
   */
  public applyTo(
    elements: SceneElementsMap,
    appState: AppState,
    snapshot: StoreSnapshot,
  ): [SceneElementsMap, AppState, boolean] {
    const [nextElements, elementsContainVisibleChange] = this.elements.applyTo(
      elements,
      // used to fallback into local snapshot in case we couldn't apply the delta
      // due to a missing (force deleted) elements in the scene
      snapshot.elements,
      // we don't want to apply the `version` and `versionNonce` properties for history
      // as we always need to end up with a new version due to collaboration,
      // approaching each undo / redo as a new user action
      {
        excludedProperties: new Set(["version", "versionNonce"]),
      },
    );

    const [nextAppState, appStateContainsVisibleChange] = this.appState.applyTo(
      appState,
      nextElements,
    );

    const appliedVisibleChanges =
      elementsContainVisibleChange || appStateContainsVisibleChange;

    return [nextElements, nextAppState, appliedVisibleChanges];
  }

  /**
   * Overriding once to avoid type casting everywhere.
   */
  public static override calculate(
    prevSnapshot: StoreSnapshot,
    nextSnapshot: StoreSnapshot,
  ) {
    return super.calculate(prevSnapshot, nextSnapshot) as HistoryDelta;
  }

  /**
   * Overriding once to avoid type casting everywhere.
   */
  public static override inverse(delta: StoreDelta): HistoryDelta {
    return super.inverse(delta) as HistoryDelta;
  }

  /**
   * Overriding once to avoid type casting everywhere.
   */
  public static override applyLatestChanges(
    delta: StoreDelta,
    prevElements: SceneElementsMap,
    nextElements: SceneElementsMap,
    modifierOptions?: "deleted" | "inserted",
  ) {
    return super.applyLatestChanges(
      delta,
      prevElements,
      nextElements,
      modifierOptions,
    ) as HistoryDelta;
  }
}

export class HistoryChangedEvent {
  constructor(
    public readonly isUndoStackEmpty: boolean = true,
    public readonly isRedoStackEmpty: boolean = true,
  ) {}
}

export type HistoryActionType = "undo" | "redo";

// [fork:history-action-event] emitted after an undo/redo was applied, with the ids of every element
// the applied entries touched, so the host can bring an off-screen change into view.
export class HistoryActionEvent {
  constructor(
    public readonly type: HistoryActionType,
    public readonly elementIds: readonly string[],
  ) {}
}

export class History {
  public readonly onHistoryChangedEmitter = new Emitter<
    [HistoryChangedEvent]
  >();

  // [fork:history-action-event]
  public readonly onHistoryActionEmitter = new Emitter<[HistoryActionEvent]>();

  public readonly undoStack: HistoryDelta[] = [];
  public readonly redoStack: HistoryDelta[] = [];

  public get isUndoStackEmpty() {
    return this.undoStack.length === 0;
  }

  public get isRedoStackEmpty() {
    return this.redoStack.length === 0;
  }

  // [fork:skip-selection-only-history] opt-in (`recordSelectionHistory={false}`); upstream default.
  constructor(
    private readonly store: Store,
    private readonly options: { recordSelectionChanges?: boolean } = {},
  ) {}

  public clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  /**
   * Record a non-empty local durable increment, which will go into the undo stack..
   * Do not re-record history entries, which were already pushed to undo / redo stack, as part of history action.
   */
  public record(delta: StoreDelta) {
    if (delta.isEmpty() || delta instanceof HistoryDelta) {
      return;
    }

    // construct history entry, so once it's emitted, it's not recorded again
    const historyDelta = HistoryDelta.inverse(delta);

    // [fork:skip-selection-only-history] when opted in, a selection change is not an undo step:
    // upstream records it, so a plain click makes the next Ctrl+Z look like a no-op. Element entries
    // still carry their appState delta, so undoing an edit restores its selection as before;
    // appState-only document edits (canvas background, name) stay undoable.
    if (
      this.options.recordSelectionChanges === false &&
      isSelectionOnlyDelta(historyDelta)
    ) {
      return;
    }

    this.undoStack.push(historyDelta);

    if (!historyDelta.elements.isEmpty()) {
      // don't reset redo stack on local appState changes,
      // as a simple click (unselect) could lead to losing all the redo entries
      // only reset on non empty elements changes!
      this.redoStack.length = 0;
    }

    this.onHistoryChangedEmitter.trigger(
      new HistoryChangedEvent(this.isUndoStackEmpty, this.isRedoStackEmpty),
    );
  }

  public undo(elements: SceneElementsMap, appState: AppState) {
    return this.perform(
      "undo",
      elements,
      appState,
      () => History.pop(this.undoStack),
      (entry: HistoryDelta) => History.push(this.redoStack, entry),
    );
  }

  public redo(elements: SceneElementsMap, appState: AppState) {
    return this.perform(
      "redo",
      elements,
      appState,
      () => History.pop(this.redoStack),
      (entry: HistoryDelta) => History.push(this.undoStack, entry),
    );
  }

  private perform(
    type: HistoryActionType,
    elements: SceneElementsMap,
    appState: AppState,
    pop: () => HistoryDelta | null,
    push: (entry: HistoryDelta) => void,
  ): [SceneElementsMap, AppState] | void {
    // [fork:history-action-event]
    const touchedElementIds = new Set<string>();

    try {
      let historyDelta = pop();

      if (historyDelta === null) {
        return;
      }

      const action = CaptureUpdateAction.IMMEDIATELY;

      let prevSnapshot = this.store.snapshot;

      let nextElements = elements;
      let nextAppState = appState;
      let containsVisibleChange = false;

      // iterate through the history entries in case ;they result in no visible changes
      while (historyDelta) {
        try {
          for (const id of Object.keys(historyDelta.elements.added)) {
            touchedElementIds.add(id);
          }
          for (const id of Object.keys(historyDelta.elements.removed)) {
            touchedElementIds.add(id);
          }
          for (const id of Object.keys(historyDelta.elements.updated)) {
            touchedElementIds.add(id);
          }

          [nextElements, nextAppState, containsVisibleChange] =
            historyDelta.applyTo(nextElements, nextAppState, prevSnapshot);

          const prevElements = prevSnapshot.elements;
          const nextSnapshot = prevSnapshot.maybeClone(
            action,
            nextElements,
            nextAppState,
          );

          const change = StoreChange.create(prevSnapshot, nextSnapshot);
          const delta = HistoryDelta.applyLatestChanges(
            historyDelta,
            prevElements,
            nextElements,
          );

          if (!delta.isEmpty()) {
            // schedule immediate capture, so that it's emitted for the sync purposes
            this.store.scheduleMicroAction({
              action,
              change,
              delta,
            });

            historyDelta = delta;
          }

          prevSnapshot = nextSnapshot;
        } finally {
          push(historyDelta);
        }

        if (containsVisibleChange) {
          break;
        }

        historyDelta = pop();
      }

      return [nextElements, nextAppState];
    } finally {
      // trigger the history change event before returning completely
      // also trigger it just once, no need doing so on each entry
      this.onHistoryChangedEmitter.trigger(
        new HistoryChangedEvent(this.isUndoStackEmpty, this.isRedoStackEmpty),
      );

      // [fork:history-action-event]
      if (touchedElementIds.size > 0) {
        this.onHistoryActionEmitter.trigger(
          new HistoryActionEvent(type, Array.from(touchedElementIds)),
        );
      }
    }
  }

  private static pop(stack: HistoryDelta[]): HistoryDelta | null {
    if (!stack.length) {
      return null;
    }

    const entry = stack.pop();

    if (entry !== undefined) {
      return entry;
    }

    return null;
  }

  private static push(stack: HistoryDelta[], entry: HistoryDelta) {
    const inversedEntry = HistoryDelta.inverse(entry);
    return stack.push(inversedEntry);
  }
}
