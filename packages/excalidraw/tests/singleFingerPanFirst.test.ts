import { describe, expect, it } from "vitest";

import { shouldEngageSingleFingerPanFirst } from "../gesture/singleFingerPanFirst";

const base = {
  enabled: true,
  bypass: false,
  pointerType: "touch",
  isPrimary: true,
  button: 0,
  activePointerCount: 1,
  viewModeEnabled: false,
  isHandToolActive: false,
  activeToolType: "selection",
  isEditingText: false,
};

describe("shouldEngageSingleFingerPanFirst", () => {
  it("engages for a primary single-finger touch on the selection tool", () => {
    expect(shouldEngageSingleFingerPanFirst(base)).toBe(true);
  });

  it("never engages when the prop is disabled", () => {
    expect(
      shouldEngageSingleFingerPanFirst({ ...base, enabled: false }),
    ).toBe(false);
  });

  it("does not re-engage while App is replaying a pointerdown (bypass)", () => {
    expect(shouldEngageSingleFingerPanFirst({ ...base, bypass: true })).toBe(
      false,
    );
  });

  it("leaves mouse and pen input untouched (desktop unchanged)", () => {
    expect(
      shouldEngageSingleFingerPanFirst({ ...base, pointerType: "mouse" }),
    ).toBe(false);
    expect(
      shouldEngageSingleFingerPanFirst({ ...base, pointerType: "pen" }),
    ).toBe(false);
  });

  it("ignores the non-primary / second touch so pinch keeps working", () => {
    expect(
      shouldEngageSingleFingerPanFirst({ ...base, isPrimary: false }),
    ).toBe(false);
    expect(
      shouldEngageSingleFingerPanFirst({ ...base, activePointerCount: 2 }),
    ).toBe(false);
  });

  it("only arms on the main button", () => {
    expect(shouldEngageSingleFingerPanFirst({ ...base, button: 2 })).toBe(false);
  });

  it("defers to native panning in view mode / hand tool", () => {
    expect(
      shouldEngageSingleFingerPanFirst({ ...base, viewModeEnabled: true }),
    ).toBe(false);
    expect(
      shouldEngageSingleFingerPanFirst({ ...base, isHandToolActive: true }),
    ).toBe(false);
  });

  it("keeps drawing tools drawing with a single finger", () => {
    expect(
      shouldEngageSingleFingerPanFirst({ ...base, activeToolType: "freedraw" }),
    ).toBe(false);
    expect(
      shouldEngageSingleFingerPanFirst({ ...base, activeToolType: "rectangle" }),
    ).toBe(false);
  });

  it("does not hijack the caret while editing text", () => {
    expect(
      shouldEngageSingleFingerPanFirst({ ...base, isEditingText: true }),
    ).toBe(false);
  });
});
