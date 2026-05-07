export type FollowViewportCameraState = {
  scrollX: number;
  scrollY: number;
  zoomValue: number;
};

export type FollowViewportTarget = FollowViewportCameraState & {
  sequence: number;
};

export type FollowViewportDebugPathPoint = {
  sequence: number | null;
  sceneX: number;
  sceneY: number;
  recordedAt: number;
};

type FollowViewportCenterCameraState = {
  centerSceneX: number;
  centerSceneY: number;
  zoomValue: number;
};

type FollowViewportSmootherOptions = {
  smoothingMs?: number;
  maxDeltaMs?: number;
  positionEpsilon?: number;
  zoomEpsilon?: number;
};

const DEFAULT_SMOOTHING_MS = 80;
const DEFAULT_MAX_DELTA_MS = 64;
const DEFAULT_POSITION_EPSILON = 0.5;
const DEFAULT_ZOOM_EPSILON = 0.001;
const FOLLOW_VIEWPORT_DEBUG_PATH_LIMIT = 96;

export class FollowViewportSmoother {
  private readonly smoothingMs: number;
  private readonly maxDeltaMs: number;
  private readonly positionEpsilon: number;
  private readonly zoomEpsilon: number;
  private target: FollowViewportTarget | null = null;
  private previousTickAt: number | null = null;

  constructor(options?: FollowViewportSmootherOptions) {
    this.smoothingMs = options?.smoothingMs ?? DEFAULT_SMOOTHING_MS;
    this.maxDeltaMs = options?.maxDeltaMs ?? DEFAULT_MAX_DELTA_MS;
    this.positionEpsilon =
      options?.positionEpsilon ?? DEFAULT_POSITION_EPSILON;
    this.zoomEpsilon = options?.zoomEpsilon ?? DEFAULT_ZOOM_EPSILON;
  }

  public hasTarget() {
    return this.target !== null;
  }

  public reset() {
    this.target = null;
    this.previousTickAt = null;
  }

  public setTarget(target: FollowViewportTarget) {
    this.target = target;
  }

  public tick(args: {
    now: number;
    current: FollowViewportCameraState;
    viewportWidth: number;
    viewportHeight: number;
  }): FollowViewportCameraState | null {
    const { now, current, viewportWidth, viewportHeight } = args;

    if (!this.target) {
      this.previousTickAt = null;
      return null;
    }

    if (
      !Number.isFinite(viewportWidth) ||
      viewportWidth <= 0 ||
      !Number.isFinite(viewportHeight) ||
      viewportHeight <= 0
    ) {
      return null;
    }

    const currentCenterCamera = this.toCenterCameraState({
      camera: current,
      viewportWidth,
      viewportHeight,
    });
    const targetCenterCamera = this.toCenterCameraState({
      camera: this.target,
      viewportWidth,
      viewportHeight,
    });

    if (this.isSettled(currentCenterCamera, targetCenterCamera)) {
      const nextCamera = this.toCameraState(this.target);
      this.reset();
      return nextCamera;
    }

    if (this.previousTickAt == null) {
      this.previousTickAt = now;
      return null;
    }

    const deltaMs = Math.max(
      0,
      Math.min(now - this.previousTickAt, this.maxDeltaMs),
    );
    this.previousTickAt = now;

    if (deltaMs === 0) {
      return null;
    }

    const alpha = 1 - Math.exp(-deltaMs / this.smoothingMs);
    const nextCenterCamera: FollowViewportCenterCameraState = {
      centerSceneX:
        currentCenterCamera.centerSceneX +
        (targetCenterCamera.centerSceneX - currentCenterCamera.centerSceneX) *
          alpha,
      centerSceneY:
        currentCenterCamera.centerSceneY +
        (targetCenterCamera.centerSceneY - currentCenterCamera.centerSceneY) *
          alpha,
      zoomValue: this.interpolateZoom(
        currentCenterCamera.zoomValue,
        targetCenterCamera.zoomValue,
        alpha,
      ),
    };

    const nextCamera = this.fromCenterCameraState({
      camera: nextCenterCamera,
      viewportWidth,
      viewportHeight,
    });

    if (this.isSettled(nextCenterCamera, targetCenterCamera)) {
      const settledCamera = this.toCameraState(this.target);
      this.reset();
      return settledCamera;
    }

    return nextCamera;
  }

  private interpolateZoom(from: number, to: number, alpha: number) {
    if (from <= 0 || to <= 0) {
      return to;
    }

    return Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * alpha);
  }

  private isSettled(
    current: FollowViewportCenterCameraState,
    target: FollowViewportCenterCameraState,
  ) {
    return (
      Math.abs(current.centerSceneX - target.centerSceneX) <=
        this.positionEpsilon &&
      Math.abs(current.centerSceneY - target.centerSceneY) <=
        this.positionEpsilon &&
      Math.abs(current.zoomValue - target.zoomValue) <= this.zoomEpsilon
    );
  }

  private toCenterCameraState(args: {
    camera: FollowViewportCameraState;
    viewportWidth: number;
    viewportHeight: number;
  }): FollowViewportCenterCameraState {
    const { camera, viewportWidth, viewportHeight } = args;

    return {
      centerSceneX: viewportWidth / (2 * camera.zoomValue) - camera.scrollX,
      centerSceneY: viewportHeight / (2 * camera.zoomValue) - camera.scrollY,
      zoomValue: camera.zoomValue,
    };
  }

  private fromCenterCameraState(args: {
    camera: FollowViewportCenterCameraState;
    viewportWidth: number;
    viewportHeight: number;
  }): FollowViewportCameraState {
    const { camera, viewportWidth, viewportHeight } = args;

    return {
      scrollX: viewportWidth / (2 * camera.zoomValue) - camera.centerSceneX,
      scrollY: viewportHeight / (2 * camera.zoomValue) - camera.centerSceneY,
      zoomValue: camera.zoomValue,
    };
  }

  private toCameraState(target: FollowViewportTarget): FollowViewportCameraState {
    return {
      scrollX: target.scrollX,
      scrollY: target.scrollY,
      zoomValue: target.zoomValue,
    };
  }
}

type FollowViewportSmoothingState = {
  smoother: FollowViewportSmoother;
  rafId: number | null;
  currentTargetSequence: number | null;
  rawPath: FollowViewportDebugPathPoint[];
  smoothedPath: FollowViewportDebugPathPoint[];
};

const followViewportSmoothingStates = new WeakMap<
  object,
  FollowViewportSmoothingState
>();

function getFollowViewportSmoothingState(owner: object) {
  let state = followViewportSmoothingStates.get(owner);

  if (!state) {
    state = {
      smoother: new FollowViewportSmoother(),
      rafId: null,
      currentTargetSequence: null,
      rawPath: [],
      smoothedPath: [],
    };
    followViewportSmoothingStates.set(owner, state);
  }

  return state;
}

export function hasFollowViewportSmoothingTarget(owner: object) {
  return getFollowViewportSmoothingState(owner).smoother.hasTarget();
}

export function setFollowViewportSmoothingTarget(
  args: {
    owner: object;
    target: FollowViewportTarget;
    viewportWidth: number;
    viewportHeight: number;
  },
) {
  const state = getFollowViewportSmoothingState(args.owner);
  state.smoother.setTarget(args.target);
  state.currentTargetSequence = args.target.sequence;

  const point = toFollowViewportDebugPathPoint({
    camera: args.target,
    viewportWidth: args.viewportWidth,
    viewportHeight: args.viewportHeight,
    sequence: args.target.sequence,
  });

  if (point) {
    pushFollowViewportDebugPathPoint(state.rawPath, point);
  }
}

export function runFollowViewportSmoothingTick(args: {
  owner: object;
  now: number;
  current: FollowViewportCameraState;
  viewportWidth: number;
  viewportHeight: number;
}) {
  const state = getFollowViewportSmoothingState(args.owner);
  state.rafId = null;

  const nextCamera = state.smoother.tick({
    now: args.now,
    current: args.current,
    viewportWidth: args.viewportWidth,
    viewportHeight: args.viewportHeight,
  });

  if (nextCamera) {
    const point = toFollowViewportDebugPathPoint({
      camera: nextCamera,
      viewportWidth: args.viewportWidth,
      viewportHeight: args.viewportHeight,
      sequence: state.currentTargetSequence,
    });

    if (point) {
      pushFollowViewportDebugPathPoint(state.smoothedPath, point);
    }
  }

  if (!state.smoother.hasTarget()) {
    state.currentTargetSequence = null;
  }

  return nextCamera;
}

export function ensureFollowViewportSmoothingLoop(args: {
  owner: object;
  requestAnimationFrame: typeof window.requestAnimationFrame;
  onTick: FrameRequestCallback;
}) {
  const state = getFollowViewportSmoothingState(args.owner);

  if (state.rafId != null || !state.smoother.hasTarget()) {
    return;
  }

  state.rafId = args.requestAnimationFrame(args.onTick);
}

export function resetFollowViewportSmoothing(args: {
  owner: object;
  cancelAnimationFrame: typeof window.cancelAnimationFrame;
}) {
  const state = getFollowViewportSmoothingState(args.owner);

  if (state.rafId != null) {
    args.cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }

  state.smoother.reset();
  state.currentTargetSequence = null;
}

export function clearFollowViewportSmoothingDebug(owner: object) {
  const state = getFollowViewportSmoothingState(owner);
  state.rawPath = [];
  state.smoothedPath = [];
}

export function getFollowViewportSmoothingDebugPaths(owner: object) {
  const state = getFollowViewportSmoothingState(owner);

  return {
    rawPath: state.rawPath,
    smoothedPath: state.smoothedPath,
  };
}

function toFollowViewportDebugPathPoint(args: {
  camera: FollowViewportCameraState;
  viewportWidth: number;
  viewportHeight: number;
  sequence: number | null;
}): FollowViewportDebugPathPoint | null {
  const { camera, viewportWidth, viewportHeight, sequence } = args;

  if (
    !Number.isFinite(viewportWidth) ||
    viewportWidth <= 0 ||
    !Number.isFinite(viewportHeight) ||
    viewportHeight <= 0 ||
    !Number.isFinite(camera.zoomValue) ||
    camera.zoomValue <= 0
  ) {
    return null;
  }

  return {
    sequence,
    sceneX: viewportWidth / (2 * camera.zoomValue) - camera.scrollX,
    sceneY: viewportHeight / (2 * camera.zoomValue) - camera.scrollY,
    recordedAt: performance.now(),
  };
}

function pushFollowViewportDebugPathPoint(
  path: FollowViewportDebugPathPoint[],
  point: FollowViewportDebugPathPoint,
) {
  const previousPoint = path[path.length - 1];

  if (
    previousPoint &&
    previousPoint.sceneX === point.sceneX &&
    previousPoint.sceneY === point.sceneY &&
    previousPoint.sequence === point.sequence
  ) {
    return;
  }

  path.push(point);

  if (path.length > FOLLOW_VIEWPORT_DEBUG_PATH_LIMIT) {
    path.splice(0, path.length - FOLLOW_VIEWPORT_DEBUG_PATH_LIMIT);
  }
}