import React from "react";
import { vi } from "vitest";

import { Excalidraw } from "../index";

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

  it("buffers followed viewport frames before applying the first remote camera frame", () => {
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
      frames: createViewportFrames([0, 1, 2, 3, 4, 5]),
    });

    animationFrames.runNext(150);

    expect(applySpy).not.toHaveBeenCalled();
    expect(h.state.scrollX).toBe(0);
    expect(h.state.scrollY).toBe(0);

    animationFrames.runNext(170);

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledWith(
      expect.objectContaining({ sequence: 0 }),
    );
    expect(h.state.scrollX).toBe(0);
    expect(h.state.scrollY).toBe(0);
  });

  it("drops overdue frames and applies only the newest due frame per animation tick", () => {
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
      frames: createViewportFrames([0, 1, 2, 3, 4, 5]),
    });

    animationFrames.runNext(260);

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledWith(
      expect.objectContaining({ sequence: 5 }),
    );
    expect(h.state.scrollX).toBe(50);
    expect(h.state.scrollY).toBe(-25);
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
      frames: createViewportFrames([0, 1, 2, 3, 4, 5]),
    });

    animationFrames.runNext(260);

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ sequence: 5 }),
    );
    expect(animationFrames.length).toBe(0);
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
      frames: createViewportFrames([0, 1, 2, 3, 4, 5]),
    });

    animationFrames.runNext(170);
    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ sequence: 0 }),
    );

    now = 200;
    setFollowedCollaboratorViewport({
      socketId,
      frames: createViewportFrames([20, 21, 22, 23, 24, 25]),
    });

    animationFrames.runNext(300);
    expect(applySpy).toHaveBeenCalledTimes(1);

    animationFrames.runNext(370);
    expect(applySpy).toHaveBeenCalledTimes(2);
    expect(applySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ sequence: 20 }),
    );
  });
});