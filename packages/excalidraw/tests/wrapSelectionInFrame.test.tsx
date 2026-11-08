import React from "react";

import { validateFractionalIndices } from "@excalidraw/element";

import { actionWrapSelectionInFrame } from "../actions/actionFrame";
import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { render } from "./test-utils";

const { h } = window;

// [fork:wrapFrameIndex] the wrapped frame must leave the action with a valid
// fractional index: Scene.replaceAllElements validates (and throws in dev/test)
// before it would repair a `null` index, which unmounted the host board.
describe("wrapSelectionInFrame", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  const selectTwoRectangles = () => {
    const rect1 = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    });
    const rect2 = API.createElement({
      type: "rectangle",
      x: 100,
      y: 0,
      width: 50,
      height: 50,
    });
    API.setElements([rect1, rect2]);
    API.setSelectedElements([rect1, rect2]);
    return [rect1, rect2];
  };

  it("returns elements whose fractional indices are already valid", () => {
    selectTwoRectangles();

    const result = actionWrapSelectionInFrame.perform(
      h.elements,
      h.state,
      null,
      h.app,
    );

    if (!result || result instanceof Promise || !result.elements) {
      throw new Error("expected a synchronous result carrying elements");
    }
    const { elements } = result;
    const frame = elements.find((element) => element.type === "frame");
    expect(frame?.index).toEqual(expect.any(String));
    expect(() =>
      validateFractionalIndices(elements, {
        shouldThrow: true,
        ignoreLogs: true,
      }),
    ).not.toThrow();
  });

  it("wraps the selection into a new, selected frame", () => {
    const [rect1, rect2] = selectTwoRectangles();

    API.executeAction(actionWrapSelectionInFrame);

    const frame = h.elements.find((element) => element.type === "frame");
    expect(frame).toBeDefined();
    expect(API.getElement(rect1).frameId).toBe(frame!.id);
    expect(API.getElement(rect2).frameId).toBe(frame!.id);
    expect(Object.keys(h.state.selectedElementIds)).toEqual([frame!.id]);
  });
});
