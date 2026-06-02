import { describe, expect, it } from "vitest";

import {
  isPinchZoomWheelEvent,
  shouldWheelEventZoomCanvas,
} from "../src/wheel";

describe("wheel helpers", () => {
  it("detects pinch zoom wheel events", () => {
    expect(
      isPinchZoomWheelEvent(
        new WheelEvent("wheel", {
          ctrlKey: true,
          deltaMode: WheelEvent.DOM_DELTA_PIXEL,
          deltaY: -4,
        }),
      ),
    ).toBe(true);

    expect(
      isPinchZoomWheelEvent(
        new WheelEvent("wheel", {
          ctrlKey: true,
          deltaMode: WheelEvent.DOM_DELTA_LINE,
          deltaY: -120,
        }),
      ),
    ).toBe(false);

    expect(
      isPinchZoomWheelEvent(
        new WheelEvent("wheel", {
          ctrlKey: true,
          deltaMode: WheelEvent.DOM_DELTA_PIXEL,
          deltaY: -120,
        }),
      ),
    ).toBe(false);
  });

  it("zooms on plain wheel and pinch, scrolls on ctrl+line wheel", () => {
    expect(
      shouldWheelEventZoomCanvas(
        new WheelEvent("wheel", { deltaMode: WheelEvent.DOM_DELTA_LINE, deltaY: -120 }),
      ),
    ).toBe(true);

    expect(
      shouldWheelEventZoomCanvas(
        new WheelEvent("wheel", {
          ctrlKey: true,
          deltaMode: WheelEvent.DOM_DELTA_PIXEL,
          deltaY: -3,
        }),
      ),
    ).toBe(true);

    expect(
      shouldWheelEventZoomCanvas(
        new WheelEvent("wheel", {
          ctrlKey: true,
          deltaMode: WheelEvent.DOM_DELTA_LINE,
          deltaY: -120,
        }),
      ),
    ).toBe(false);

    expect(
      shouldWheelEventZoomCanvas(
        new WheelEvent("wheel", {
          ctrlKey: true,
          deltaMode: WheelEvent.DOM_DELTA_PIXEL,
          deltaY: -120,
        }),
      ),
    ).toBe(false);
  });
});
