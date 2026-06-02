/**
 * Trackpad pinch-to-zoom is emitted as wheel events with ctrlKey set and
 * DOM_DELTA_PIXEL deltas. After inverting wheel defaults (plain wheel = zoom,
 * Ctrl+wheel = scroll), pinch must still zoom.
 */
const PINCH_ZOOM_MAX_PIXEL_DELTA = 50;

export const isPinchZoomWheelEvent = (event: WheelEvent): boolean => {
  if (!event.ctrlKey && !event.metaKey) {
    return false;
  }

  // Mouse Ctrl+wheel (including on Windows) often reports line deltas.
  if (
    event.deltaMode === WheelEvent.DOM_DELTA_LINE ||
    event.deltaMode === WheelEvent.DOM_DELTA_PAGE
  ) {
    return false;
  }

  const absDelta = Math.abs(event.deltaY);
  if (absDelta === 0) {
    return false;
  }

  // Trackpad pinch uses small pixel deltas; Ctrl+wheel pixel deltas are much larger.
  return absDelta < PINCH_ZOOM_MAX_PIXEL_DELTA;
};

/** Whether the wheel event should zoom the canvas (plain wheel or pinch). */
export const shouldWheelEventZoomCanvas = (event: WheelEvent): boolean => {
  if (event.metaKey || event.ctrlKey) {
    return isPinchZoomWheelEvent(event);
  }
  return true;
};
