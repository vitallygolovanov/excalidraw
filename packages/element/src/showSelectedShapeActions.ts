import type { UIAppState } from "@excalidraw/excalidraw/types";

import { getSelectedElements } from "./selection";
import { isEditorFrameElement } from "./typeChecks";

import type { NonDeletedExcalidrawElement } from "./types";

export const showSelectedShapeActions = (
  appState: UIAppState,
  elements: readonly NonDeletedExcalidrawElement[],
) => {
  const selectedElements = getSelectedElements(elements, appState);

  if (
    selectedElements.length === 1 &&
    isEditorFrameElement(selectedElements[0])
  ) {
    return false;
  }

  return Boolean(
    !appState.viewModeEnabled &&
      appState.openDialog?.name !== "elementLinkSelector" &&
      ((appState.activeTool.type !== "custom" &&
        (appState.editingTextElement ||
          (appState.activeTool.type !== "selection" &&
            appState.activeTool.type !== "lasso" &&
            appState.activeTool.type !== "eraser" &&
            appState.activeTool.type !== "hand" &&
            appState.activeTool.type !== "laser"))) ||
        selectedElements.length),
  );
};
