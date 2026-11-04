// [fork:insert-elements] tests for the host-driven insert API.
import React from "react";

import { getCommonBounds } from "@excalidraw/element";
import { resolvablePromise } from "@excalidraw/common";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { act, render } from "./test-utils";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import type { ExcalidrawImperativeAPI, NormalizedZoomValue } from "../types";

const { h } = window;

const centerOf = (elements: readonly ExcalidrawElement[]) => {
  const [minX, minY, maxX, maxY] = getCommonBounds(elements);
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
};

describe("insertElements()", () => {
  let excalidrawAPI: ExcalidrawImperativeAPI;

  beforeEach(async () => {
    const excalidrawAPIPromise = resolvablePromise<ExcalidrawImperativeAPI>();
    await render(
      <Excalidraw
        initialData={{
          appState: { zoom: { value: 1 as NormalizedZoomValue } },
        }}
        excalidrawAPI={(api) => excalidrawAPIPromise.resolve(api as any)}
      />,
    );
    excalidrawAPI = await excalidrawAPIPromise;
  });

  it("is exposed on the package API as the app's onInsertElements", () => {
    expect(excalidrawAPI.insertElements).toBe(h.app.onInsertElements);
  });

  it("inserts copies with fresh ids and returns them", () => {
    const rectangle = API.createElement({ type: "rectangle" });

    let inserted: readonly ExcalidrawElement[] | null = null;
    act(() => {
      inserted = excalidrawAPI.insertElements([rectangle], {
        position: { sceneX: 0, sceneY: 0 },
      });
    });

    expect(inserted).toHaveLength(1);
    expect(h.elements).toHaveLength(1);
    expect(h.elements[0].id).not.toBe(rectangle.id);
    expect(inserted![0].id).toBe(h.elements[0].id);
    expect(h.state.selectedElementIds[h.elements[0].id]).toBe(true);
  });

  it("keeps a bound-text container bound under the new ids", () => {
    const [container, text] = API.createTextContainer();

    act(() => {
      excalidrawAPI.insertElements([container, text], {
        position: { sceneX: 0, sceneY: 0 },
      });
    });

    const newContainer = h.elements.find((el) => el.type === "rectangle")!;
    const newText = h.elements.find((el) => el.type === "text")!;
    expect(newContainer.id).not.toBe(container.id);
    expect(newText.id).not.toBe(text.id);
    expect(newText).toMatchObject({ containerId: newContainer.id });
    expect(newContainer.boundElements).toEqual([
      { type: "text", id: newText.id },
    ]);
  });

  it("centres the inserted group on a scene point", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 40,
    });

    act(() => {
      excalidrawAPI.insertElements([rectangle], {
        position: { sceneX: 500, sceneY: 300 },
      });
    });

    expect(centerOf(h.elements)).toEqual({ x: 500, y: 300 });
  });

  it("centres the inserted group on a client point", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 40,
    });
    const { offsetLeft, offsetTop, scrollX, scrollY } = h.state;

    act(() => {
      excalidrawAPI.insertElements([rectangle], {
        position: { clientX: offsetLeft + 200, clientY: offsetTop + 150 },
      });
    });

    expect(centerOf(h.elements)).toEqual({
      x: 200 - scrollX,
      y: 150 - scrollY,
    });
  });

  it("defaults to the viewport centre without files (upstream callers)", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 40,
    });
    const { width, height, scrollX, scrollY } = h.state;

    act(() => {
      h.app.onInsertElements([rectangle]);
    });

    expect(centerOf(h.elements)).toEqual({
      x: width / 2 - scrollX,
      y: height / 2 - scrollY,
    });
  });

  it("returns [] for an empty list without touching the scene", () => {
    let inserted: readonly ExcalidrawElement[] | null = null;
    act(() => {
      inserted = excalidrawAPI.insertElements([]);
    });
    expect(inserted).toEqual([]);
    expect(h.elements).toHaveLength(0);
  });

  it("refuses to insert in view mode", () => {
    API.setAppState({ viewModeEnabled: true });
    const rectangle = API.createElement({ type: "rectangle" });

    let inserted: readonly ExcalidrawElement[] | null = [];
    act(() => {
      inserted = excalidrawAPI.insertElements([rectangle]);
    });

    expect(inserted).toBeNull();
    expect(h.elements).toHaveLength(0);
  });
});
