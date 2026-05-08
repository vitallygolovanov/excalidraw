export type FollowViewportCameraState = {
  scrollX: number;
  scrollY: number;
  zoomValue: number;
};

export type FollowViewportTarget = FollowViewportCameraState & {
  sequence: number;
  anchorViewportXRatio?: number;
  anchorViewportYRatio?: number;
};

export type FollowViewportDebugPathPoint = {
  sequence: number | null;
  sceneX: number;
  sceneY: number;
  recordedAt: number;
};

type FollowViewportAnchor = {
  viewportX: number;
  viewportY: number;
};

type FollowViewportAnchoredCameraState = {
  anchorSceneX: number;
  anchorSceneY: number;
  inverseZoom: number;
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

    const anchor = this.resolveAnchor({
      viewportWidth,
      viewportHeight,
      target: this.target,
    });

    const currentAnchoredCamera = this.toAnchoredCameraState({
      camera: current,
      anchor,
    });
    const targetAnchoredCamera = this.toAnchoredCameraState({
      camera: this.target,
      anchor,
    });

    if (this.isSettled(currentAnchoredCamera, targetAnchoredCamera)) {
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
    const nextAnchoredCamera: FollowViewportAnchoredCameraState = {
      anchorSceneX:
        currentAnchoredCamera.anchorSceneX +
        (targetAnchoredCamera.anchorSceneX - currentAnchoredCamera.anchorSceneX) *
          alpha,
      anchorSceneY:
        currentAnchoredCamera.anchorSceneY +
        (targetAnchoredCamera.anchorSceneY - currentAnchoredCamera.anchorSceneY) *
          alpha,
      inverseZoom:
        currentAnchoredCamera.inverseZoom +
        (targetAnchoredCamera.inverseZoom - currentAnchoredCamera.inverseZoom) *
          alpha,
    };

    const nextCamera = this.fromAnchoredCameraState({
      camera: nextAnchoredCamera,
      anchor,
    });

    if (this.isSettled(nextAnchoredCamera, targetAnchoredCamera)) {
      const settledCamera = this.toCameraState(this.target);
      this.reset();
      return settledCamera;
    }

    return nextCamera;
  }

  private isSettled(
    current: FollowViewportAnchoredCameraState,
    target: FollowViewportAnchoredCameraState,
  ) {
    return (
      Math.abs(current.anchorSceneX - target.anchorSceneX) <=
        this.positionEpsilon &&
      Math.abs(current.anchorSceneY - target.anchorSceneY) <=
        this.positionEpsilon &&
      Math.abs(1 / current.inverseZoom - 1 / target.inverseZoom) <=
        this.zoomEpsilon
    );
  }

  private resolveAnchor(args: {
    viewportWidth: number;
    viewportHeight: number;
    target: FollowViewportTarget;
  }): FollowViewportAnchor {
    const { viewportWidth, viewportHeight, target } = args;

    const xRatio = this.resolveAnchorRatio(target.anchorViewportXRatio);
    const yRatio = this.resolveAnchorRatio(target.anchorViewportYRatio);

    return {
      viewportX: (xRatio ?? 0.5) * viewportWidth,
      viewportY: (yRatio ?? 0.5) * viewportHeight,
    };
  }

  private resolveAnchorRatio(value: number | undefined) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }

    return Math.min(Math.max(value, 0), 1);
  }

  private toAnchoredCameraState(args: {
    camera: FollowViewportCameraState;
    anchor: FollowViewportAnchor;
  }): FollowViewportAnchoredCameraState {
    const { camera, anchor } = args;

    return {
      anchorSceneX: anchor.viewportX / camera.zoomValue - camera.scrollX,
      anchorSceneY: anchor.viewportY / camera.zoomValue - camera.scrollY,
      inverseZoom: 1 / camera.zoomValue,
    };
  }

  private fromAnchoredCameraState(args: {
    camera: FollowViewportAnchoredCameraState;
    anchor: FollowViewportAnchor;
  }): FollowViewportCameraState {
    const { camera, anchor } = args;
    const zoomValue = 1 / camera.inverseZoom;

    return {
      scrollX: anchor.viewportX * camera.inverseZoom - camera.anchorSceneX,
      scrollY: anchor.viewportY * camera.inverseZoom - camera.anchorSceneY,
      zoomValue,
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