import { describe, expect, it, vi } from "vitest";

import {
  applyPinchGestureStep,
  clearPinchGestureBaselines,
  replaceGesturePointersFromHost,
  resetPinchGestureState,
} from "../gesture/hostPinchGesture";
import type { Gesture, HostPinchPointer } from "../types";

const createGesture = (): Gesture => ({
  pointers: new Map(),
  lastCenter: null,
  initialDistance: null,
  initialScale: null,
  wasMultiTouchGesture: false,
});

const twoPointers = (
  distance: number,
  center: { x: number; y: number } = { x: 100, y: 100 },
): HostPinchPointer[] => {
  const half = distance / 2;
  return [
    { pointerId: 1, x: center.x - half, y: center.y },
    { pointerId: 2, x: center.x + half, y: center.y },
  ];
};

describe("hostPinchGesture", () => {
  it("ignores fewer than two pointers", () => {
    const gesture = createGesture();
    replaceGesturePointersFromHost(gesture, [
      { pointerId: 1, x: 10, y: 10 },
    ]);

    const result = applyPinchGestureStep(
      {
        gesture,
        zoomValue: 1,
        isFreedrawPenMode: false,
        getNormalizedZoom: (zoom) => zoom as never,
        rememberFollowViewportZoomAnchor: vi.fn(),
        resetShouldCacheIgnoreZoomDebounced: vi.fn(),
        setState: vi.fn(),
        translateCanvas: vi.fn(),
      },
      "host",
    );

    expect(result).toBe("reset");
    expect(gesture.initialDistance).toBeNull();
  });

  it("initializes baseline on first host two-pointer call", () => {
    const gesture = createGesture();
    replaceGesturePointersFromHost(gesture, twoPointers(80));

    const result = applyPinchGestureStep(
      {
        gesture,
        zoomValue: 1,
        isFreedrawPenMode: false,
        getNormalizedZoom: (zoom) => zoom as never,
        rememberFollowViewportZoomAnchor: vi.fn(),
        resetShouldCacheIgnoreZoomDebounced: vi.fn(),
        setState: vi.fn(),
        translateCanvas: vi.fn(),
      },
      "host",
    );

    expect(result).toBe("started");
    expect(gesture.initialDistance).toBe(80);
    expect(gesture.initialScale).toBe(1);
    expect(gesture.lastCenter).toEqual({ x: 100, y: 100 });
    expect(gesture.wasMultiTouchGesture).toBe(true);
  });

  it("applies zoom when distance increases", () => {
    const gesture = createGesture();
    const rememberFollowViewportZoomAnchor = vi.fn();
    const translateCanvas = vi.fn();
    const setState = vi.fn((updater) => {
      updater({
        offsetLeft: 0,
        offsetTop: 0,
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 },
      } as never);
    });

    replaceGesturePointersFromHost(gesture, twoPointers(80));
    applyPinchGestureStep(
      {
        gesture,
        zoomValue: 1,
        isFreedrawPenMode: false,
        getNormalizedZoom: (zoom) => zoom as never,
        rememberFollowViewportZoomAnchor,
        resetShouldCacheIgnoreZoomDebounced: vi.fn(),
        setState,
        translateCanvas,
      },
      "host",
    );

    replaceGesturePointersFromHost(gesture, twoPointers(160));
    const result = applyPinchGestureStep(
      {
        gesture,
        zoomValue: 1,
        isFreedrawPenMode: false,
        getNormalizedZoom: (zoom) => zoom as never,
        rememberFollowViewportZoomAnchor,
        resetShouldCacheIgnoreZoomDebounced: vi.fn(),
        setState,
        translateCanvas,
      },
      "host",
    );

    expect(result).toBe("applied");
    expect(rememberFollowViewportZoomAnchor).toHaveBeenCalled();
    expect(translateCanvas).toHaveBeenCalled();
    expect(translateCanvas.mock.calls[0][0].zoom.value).toBe(2);
  });

  it("applies pan when center moves", () => {
    const gesture = createGesture();
    const translateCanvas = vi.fn();
    const setState = vi.fn((updater) => {
      updater({
        offsetLeft: 0,
        offsetTop: 0,
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 },
      } as never);
    });
    const deps = {
      gesture,
      zoomValue: 1 as never,
      isFreedrawPenMode: false,
      getNormalizedZoom: (zoom: number) => zoom as never,
      rememberFollowViewportZoomAnchor: vi.fn(),
      resetShouldCacheIgnoreZoomDebounced: vi.fn(),
      setState,
      translateCanvas,
    };

    replaceGesturePointersFromHost(gesture, twoPointers(80, { x: 100, y: 100 }));
    applyPinchGestureStep(deps, "host");
    replaceGesturePointersFromHost(gesture, twoPointers(80, { x: 120, y: 100 }));
    applyPinchGestureStep(deps, "host");

    expect(translateCanvas.mock.calls[0][0].scrollX).toBe(40);
    expect(translateCanvas.mock.calls[0][0].scrollY).toBe(0);
  });

  it("resets baselines when pointers drop below two", () => {
    const gesture = createGesture();
    replaceGesturePointersFromHost(gesture, twoPointers(80));
    applyPinchGestureStep(
      {
        gesture,
        zoomValue: 1,
        isFreedrawPenMode: false,
        getNormalizedZoom: (zoom) => zoom as never,
        rememberFollowViewportZoomAnchor: vi.fn(),
        resetShouldCacheIgnoreZoomDebounced: vi.fn(),
        setState: vi.fn(),
        translateCanvas: vi.fn(),
      },
      "host",
    );

    replaceGesturePointersFromHost(gesture, [
      { pointerId: 1, x: 10, y: 10 },
    ]);
    const result = applyPinchGestureStep(
      {
        gesture,
        zoomValue: 1,
        isFreedrawPenMode: false,
        getNormalizedZoom: (zoom) => zoom as never,
        rememberFollowViewportZoomAnchor: vi.fn(),
        resetShouldCacheIgnoreZoomDebounced: vi.fn(),
        setState: vi.fn(),
        translateCanvas: vi.fn(),
      },
      "host",
    );

    expect(result).toBe("reset");
    expect(gesture.initialDistance).toBeNull();
  });

  it("clears gesture state on resetPinchGestureState", () => {
    const gesture = createGesture();
    replaceGesturePointersFromHost(gesture, twoPointers(80));
    clearPinchGestureBaselines(gesture);
    gesture.pointers.set(1, { x: 0, y: 0 });

    resetPinchGestureState(gesture);

    expect(gesture.pointers.size).toBe(0);
    expect(gesture.initialDistance).toBeNull();
  });
});
