import { getCenter, getDistance } from "../gesture";
import { getStateForZoom } from "../scene/zoom";
import type {
  AppState,
  Gesture,
  HostPinchGestureResult,
  HostPinchPointer,
  NormalizedZoomValue,
} from "../types";

export type PinchGestureApplySource = "host" | "native-move";

export type ApplyPinchGestureDeps = Readonly<{
  gesture: Gesture;
  zoomValue: NormalizedZoomValue;
  isFreedrawPenMode: boolean;
  getNormalizedZoom: (zoom: number) => NormalizedZoomValue;
  rememberFollowViewportZoomAnchor: (viewportX: number, viewportY: number) => void;
  resetShouldCacheIgnoreZoomDebounced: () => void;
  setState: (updater: (state: AppState) => AppState | void) => void;
  translateCanvas: (opts: {
    zoom: AppState["zoom"];
    scrollX: number;
    scrollY: number;
    shouldCacheIgnoreZoom: boolean;
  }) => void;
}>;

export const clearPinchGestureBaselines = (gesture: Gesture) => {
  gesture.lastCenter = gesture.initialDistance = gesture.initialScale = null;
};

export const replaceGesturePointersFromHost = (
  gesture: Gesture,
  pointers: readonly HostPinchPointer[],
) => {
  gesture.pointers.clear();
  for (const pointer of pointers) {
    gesture.pointers.set(pointer.pointerId, {
      x: pointer.x,
      y: pointer.y,
    });
  }
};

export const resetPinchGestureState = (gesture: Gesture) => {
  gesture.pointers.clear();
  clearPinchGestureBaselines(gesture);
};

const hasPinchBaseline = (gesture: Gesture) =>
  gesture.lastCenter != null
  && gesture.initialScale != null
  && gesture.initialDistance != null;

const initializePinchBaseline = (
  gesture: Gesture,
  zoomValue: NormalizedZoomValue,
  markMultiTouch: boolean,
) => {
  if (markMultiTouch) {
    gesture.wasMultiTouchGesture = true;
  }
  gesture.lastCenter = getCenter(gesture.pointers);
  gesture.initialScale = zoomValue;
  gesture.initialDistance = getDistance(
    Array.from(gesture.pointers.values()),
  );
};

const applyPinchZoomPan = (deps: ApplyPinchGestureDeps) => {
  const { gesture, isFreedrawPenMode, getNormalizedZoom } = deps;
  const initialScale = gesture.initialScale!;
  const center = getCenter(gesture.pointers);
  const deltaX = center.x - gesture.lastCenter!.x;
  const deltaY = center.y - gesture.lastCenter!.y;
  gesture.lastCenter = center;

  const distance = getDistance(Array.from(gesture.pointers.values()));
  const scaleFactor = isFreedrawPenMode ? 1 : distance / gesture.initialDistance!;
  const nextZoom = scaleFactor
    ? getNormalizedZoom(initialScale * scaleFactor)
    : deps.zoomValue;

  deps.rememberFollowViewportZoomAnchor(center.x, center.y);

  deps.setState((state) => {
    const zoomState = getStateForZoom(
      {
        viewportX: center.x,
        viewportY: center.y,
        nextZoom,
      },
      state,
    );

    deps.translateCanvas({
      zoom: zoomState.zoom,
      scrollX: zoomState.scrollX + 2 * (deltaX / nextZoom),
      scrollY: zoomState.scrollY + 2 * (deltaY / nextZoom),
      shouldCacheIgnoreZoom: true,
    });
  });
  deps.resetShouldCacheIgnoreZoomDebounced();
};

export const applyPinchGestureStep = (
  deps: ApplyPinchGestureDeps,
  source: PinchGestureApplySource,
): HostPinchGestureResult => {
  const { gesture } = deps;
  const pointerCount = gesture.pointers.size;

  if (pointerCount !== 2) {
    clearPinchGestureBaselines(gesture);
    if (pointerCount === 0) {
      return "ignored";
    }
    return "reset";
  }

  if (hasPinchBaseline(gesture)) {
    applyPinchZoomPan(deps);
    return "applied";
  }

  if (source === "host") {
    initializePinchBaseline(gesture, deps.zoomValue, true);
    return "started";
  }

  clearPinchGestureBaselines(gesture);
  return "ignored";
};
