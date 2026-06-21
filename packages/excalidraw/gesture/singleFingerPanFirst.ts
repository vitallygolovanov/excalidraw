/**
 * Pure decision helper for the fork-only `singleFingerPanFirst` prop.
 *
 * The host (xmp.pro Blackboard) wants a single finger on the bare canvas to PAN
 * rather than rubber-band/draw, while a press-and-hold-then-drag still selects
 * or moves the element under the finger. App.tsx owns the timing/teardown of
 * that deferred gesture; this module isolates the *gating* decision so it can be
 * unit-tested without a DOM/pointer harness (mirroring `hostPinchGesture.ts`).
 *
 * The decision is intentionally narrow — it only engages for the primary touch
 * pointer of a single-finger gesture with the selection tool, so:
 * - mouse/pen input is never affected (desktop unchanged),
 * - multi-touch pinch/pan keeps flowing through the native/host pinch path,
 * - drawing tools keep drawing with a single finger (you chose to draw),
 * - hand tool / view mode already pan natively, so they are left alone.
 */
export function shouldEngageSingleFingerPanFirst(args: {
  /** The `singleFingerPanFirst` prop value. */
  enabled: boolean;
  /** True while App.tsx is replaying a pointerdown into the native path. */
  bypass: boolean;
  pointerType: string;
  isPrimary: boolean;
  /** `event.button` — only the main button arms pan-first. */
  button: number;
  /** Active touch points after this pointerdown (`gesture.pointers.size`). */
  activePointerCount: number;
  viewModeEnabled: boolean;
  isHandToolActive: boolean;
  activeToolType: string;
  isEditingText: boolean;
}): boolean {
  const {
    enabled,
    bypass,
    pointerType,
    isPrimary,
    button,
    activePointerCount,
    viewModeEnabled,
    isHandToolActive,
    activeToolType,
    isEditingText,
  } = args;

  if (!enabled || bypass) {
    return false;
  }
  if (pointerType !== "touch" || !isPrimary) {
    return false;
  }
  // Main button only. Touch pointerdowns report button 0 (main); a non-zero
  // button here means an unusual input we should not hijack.
  if (button !== 0) {
    return false;
  }
  // Strictly single finger. The 2nd touch makes this a pinch/pan that native
  // Excalidraw (or the host pinch controller) must own.
  if (activePointerCount !== 1) {
    return false;
  }
  // View mode and the hand tool already pan a single finger natively; text
  // editing must keep its caret/selection. Pan-first only adds value for the
  // default selection tool on the editable board.
  if (viewModeEnabled || isHandToolActive || isEditingText) {
    return false;
  }
  return activeToolType === "selection";
}
