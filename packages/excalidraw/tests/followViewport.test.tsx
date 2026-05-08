import React from "react";
import { vi } from "vitest";

import { Excalidraw } from "../index";
import { getNormalizedZoom } from "../scene";
import { getStateForZoom } from "../scene/zoom";

import { API } from "./helpers/api";
import { act, render, unmountComponent } from "./test-utils";

import type {
  Collaborator,
  CollaboratorViewportFrame,
  SocketId,
} from "../types";

const { h } = window;

function createViewportFrames(
  sequences: readonly number[],
): CollaboratorViewportFrame[] {
  return sequences.map((sequence) => ({
    sequence,
    scrollX: sequence * 10,
    scrollY: sequence * -5,
    zoomValue: 1 + sequence * 0.01,
  }));
}

function getAnchorScenePoint(args: {
  anchorViewportXRatio: number;
  anchorViewportYRatio: number;
}) {
  const anchorViewportX = h.state.width * args.anchorViewportXRatio;
  const anchorViewportY = h.state.height * args.anchorViewportYRatio;

  return {
    x: anchorViewportX / h.state.zoom.value - h.state.scrollX,
    y: anchorViewportY / h.state.zoom.value - h.state.scrollY,
  };
}

function setFollowedCollaboratorViewport(args: {
  socketId: SocketId;
  frames: readonly CollaboratorViewportFrame[];
  frameIntervalMs?: number;
}) {
  const {
    socketId,
    frames,
    frameIntervalMs = 20,
  } = args;

  API.updateScene({
    collaborators: new Map<SocketId, Collaborator>([
      [
        socketId,
        {
          socketId,
          username: "Remote user",
          viewport: {
            frameIntervalMs,
            frames,
          },
        },
      ],
    ]),
  });
}

function flushAnimationFrames(args: {
  animationFrames: ReturnType<typeof createManualAnimationFrames>;
  startAt: number;
  stepMs?: number;
  maxFrames?: number;
}) {
  const {
    animationFrames,
    startAt,
    stepMs = 16,
    maxFrames = 40,
  } = args;
  let nextNow = startAt;
  let remainingFrames = maxFrames;

  while (animationFrames.length > 0 && remainingFrames > 0) {
    animationFrames.runNext(nextNow);
    nextNow += stepMs;
    remainingFrames -= 1;
  }

  if (animationFrames.length > 0) {
    throw new Error("Expected follow viewport animation frames to settle");
  }
}

function createManualAnimationFrames() {
  const callbacks: FrameRequestCallback[] = [];

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callbacks.push(callback);
    return callbacks.length;
  });

  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

  return {
    clear() {
      callbacks.length = 0;
    },
    get length() {
      return callbacks.length;
    },
    runNext(now: number) {
      const callback = callbacks.shift();
      if (!callback) {
        throw new Error("Expected a queued animation frame callback");
      }

      act(() => {
        callback(now);
      });
    },
  };
}

describe("followed collaborator viewport playback", () => {
  let now = 0;

  beforeEach(async () => {
    unmountComponent();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(performance, "now").mockImplementation(() => now);
    await render(<Excalidraw />);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("buffers followed viewport frames before targeting the first remote camera frame and then smooths toward it", () => {
    const animationFrames = createManualAnimationFrames();
    const socketId = "remote-1" as SocketId;
    const applySpy = vi.spyOn(h.app as never, "applyFollowedViewportFrame" as never);

    animationFrames.clear();
    API.setAppState({
      userToFollow: {
        socketId,
        username: "Remote user",
      },
    });

    setFollowedCollaboratorViewport({
      socketId,
      frames: createViewportFrames([5, 6, 7, 8, 9, 10]),
    });

    animationFrames.runNext(280);

    expect(applySpy).not.toHaveBeenCalled();
    expect(h.state.scrollX).toBe(0);
    expect(h.state.scrollY).toBe(0);

    animationFrames.runNext(320);

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledWith(
      expect.objectContaining({ sequence: 5 }),
    );
    expect(h.state.scrollX).toBe(0);
    expect(h.state.scrollY).toBe(0);

    animationFrames.runNext(336);
    expect(h.state.scrollX).toBe(0);

    animationFrames.runNext(352);
    expect(h.state.scrollX).toBeGreaterThan(0);
    expect(h.state.scrollX).toBeLessThan(50);
    expect(h.state.scrollY).toBeLessThan(0);
    expect(h.state.scrollY).toBeGreaterThan(-25);
  });

  it("drops overdue frames, targets only the newest due frame, and smooths instead of jumping", () => {
    const animationFrames = createManualAnimationFrames();
    const socketId = "remote-2" as SocketId;
    const applySpy = vi.spyOn(h.app as never, "applyFollowedViewportFrame" as never);

    animationFrames.clear();
    API.setAppState({
      userToFollow: {
        socketId,
        username: "Remote user",
      },
    });

    setFollowedCollaboratorViewport({
      socketId,
      frames: createViewportFrames([5, 6, 7, 8, 9, 10]),
    });

    animationFrames.runNext(420);

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledWith(
      expect.objectContaining({ sequence: 10 }),
    );
    expect(h.state.scrollX).toBe(0);
    expect(h.state.scrollY).toBe(0);

    animationFrames.runNext(436);
    expect(h.state.scrollX).toBe(0);

    animationFrames.runNext(452);
    expect(h.state.scrollX).toBeGreaterThan(0);
    expect(h.state.scrollX).toBeLessThan(100);
    expect(h.state.scrollY).toBeLessThan(0);
    expect(h.state.scrollY).toBeGreaterThan(-50);
  });

  it("does not replay the same stale collaborator batch after playback drains", () => {
    const animationFrames = createManualAnimationFrames();
    const socketId = "remote-2b" as SocketId;
    const applySpy = vi.spyOn(h.app as never, "applyFollowedViewportFrame" as never);

    animationFrames.clear();
    API.setAppState({
      userToFollow: {
        socketId,
        username: "Remote user",
      },
    });

    setFollowedCollaboratorViewport({
      socketId,
      frames: createViewportFrames([5, 6, 7, 8, 9, 10]),
    });

    animationFrames.runNext(420);

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ sequence: 10 }),
    );

    flushAnimationFrames({
      animationFrames,
      startAt: 436,
    });

    setFollowedCollaboratorViewport({
      socketId,
      frames: createViewportFrames([5, 6, 7, 8, 9, 10]),
    });

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(animationFrames.length).toBe(0);
  });

  it("preserves the transmitted off-center anchor point while smoothing zoom", () => {
    const animationFrames = createManualAnimationFrames();
    const socketId = "remote-anchor" as SocketId;
    const anchorViewportXRatio = 0.85;
    const anchorViewportYRatio = 0.15;
    const anchorViewportX =
      h.state.width * anchorViewportXRatio + h.state.offsetLeft;
    const anchorViewportY =
      h.state.height * anchorViewportYRatio + h.state.offsetTop;
    const targetZoomValue = getNormalizedZoom(2);
    const targetCamera = getStateForZoom(
      {
        viewportX: anchorViewportX,
        viewportY: anchorViewportY,
        nextZoom: targetZoomValue,
      },
      h.state,
    );
    const initialAnchorScenePoint = getAnchorScenePoint({
      anchorViewportXRatio,
      anchorViewportYRatio,
    });

    animationFrames.clear();
    API.setAppState({
      userToFollow: {
        socketId,
        username: "Remote user",
      },
    });

    setFollowedCollaboratorViewport({
      socketId,
      frames: [
        {
          sequence: 5,
          scrollX: targetCamera.scrollX,
          scrollY: targetCamera.scrollY,
          zoomValue: targetCamera.zoom.value,
          anchorViewportXRatio,
          anchorViewportYRatio,
        },
      ],
    });

    animationFrames.runNext(400);
    animationFrames.runNext(416);

    for (const nowAt of [432, 448, 464]) {
      animationFrames.runNext(nowAt);

      const currentAnchorScenePoint = getAnchorScenePoint({
        anchorViewportXRatio,
        anchorViewportYRatio,
      });

      expect(currentAnchorScenePoint.x).toBeCloseTo(initialAnchorScenePoint.x, 6);
      expect(currentAnchorScenePoint.y).toBeCloseTo(initialAnchorScenePoint.y, 6);
    }

    expect(h.state.zoom.value).toBeGreaterThan(1);
    expect(h.state.zoom.value).toBeLessThan(targetZoomValue);
  });

  it("rebases playback and restores the follow delay when a new batch has a sequence gap", () => {
    const animationFrames = createManualAnimationFrames();
    const socketId = "remote-3" as SocketId;
    const applySpy = vi.spyOn(h.app as never, "applyFollowedViewportFrame" as never);

    animationFrames.clear();
    API.setAppState({
      userToFollow: {
        socketId,
        username: "Remote user",
      },
    });

    setFollowedCollaboratorViewport({
      socketId,
      frames: createViewportFrames([5, 6, 7, 8, 9, 10]),
    });

    animationFrames.runNext(280);
    expect(applySpy).toHaveBeenCalledTimes(0);

    animationFrames.runNext(320);
    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ sequence: 5 }),
    );

    now = 360;
    setFollowedCollaboratorViewport({
      socketId,
      frames: createViewportFrames([25, 26, 27, 28, 29, 30]),
    });

    animationFrames.runNext(620);
    expect(applySpy).toHaveBeenCalledTimes(1);

    animationFrames.runNext(680);
    expect(applySpy).toHaveBeenCalledTimes(2);
    expect(applySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ sequence: 25 }),
    );
  });
});