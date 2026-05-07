import { SVG_NS, sceneCoordsToViewportCoords } from "@excalidraw/common";

import type { Trail } from "../../animated-trail";
import type { AnimationFrameHandler } from "../../animation-frame-handler";
import type App from "../App";

import {
  clearFollowViewportSmoothingDebug,
  getFollowViewportSmoothingDebugPaths,
} from "./followViewportSmoother";

export class FollowViewportDebugTrail implements Trail {
  private container?: SVGSVGElement;
  private readonly groupElement: SVGGElement;
  private readonly rawPathElement: SVGPathElement;
  private readonly smoothedPathElement: SVGPathElement;

  constructor(
    private animationFrameHandler: AnimationFrameHandler,
    private app: App,
  ) {
    this.animationFrameHandler.register(this, this.onFrame.bind(this));

    this.groupElement = document.createElementNS(SVG_NS, "g");
    this.groupElement.setAttribute("data-follow-viewport-debug", "true");

    this.rawPathElement = document.createElementNS(SVG_NS, "path");
    this.rawPathElement.setAttribute("fill", "none");
    this.rawPathElement.setAttribute("stroke", "#ff6b6b");
    this.rawPathElement.setAttribute("stroke-width", "2");
    this.rawPathElement.setAttribute("stroke-dasharray", "8 6");
    this.rawPathElement.setAttribute("stroke-linecap", "round");
    this.rawPathElement.setAttribute("stroke-linejoin", "round");
    this.rawPathElement.setAttribute("opacity", "0.9");

    this.smoothedPathElement = document.createElementNS(SVG_NS, "path");
    this.smoothedPathElement.setAttribute("fill", "none");
    this.smoothedPathElement.setAttribute("stroke", "#4cc9f0");
    this.smoothedPathElement.setAttribute("stroke-width", "2.5");
    this.smoothedPathElement.setAttribute("stroke-linecap", "round");
    this.smoothedPathElement.setAttribute("stroke-linejoin", "round");
    this.smoothedPathElement.setAttribute("opacity", "0.95");

    this.groupElement.append(this.rawPathElement, this.smoothedPathElement);
  }

  start(container?: SVGSVGElement): void {
    if (container) {
      this.container = container;
    }

    if (!this.container) {
      return;
    }

    if (this.groupElement.parentNode !== this.container) {
      this.container.appendChild(this.groupElement);
    }

    this.animationFrameHandler.start(this);
  }

  restart(): void {
    this.start(this.container);
  }

  stop(): void {
    this.animationFrameHandler.stop(this);

    if (this.groupElement.parentNode === this.container) {
      this.container?.removeChild(this.groupElement);
    }
  }

  startPath(): void {}

  addPointToPath(): void {}

  endPath(): void {}

  private onFrame() {
    if (!this.app.props.debugFollowViewportSmoothingVisible) {
      this.clearPaths();
      clearFollowViewportSmoothingDebug(this.app);
      return true;
    }

    if (!this.app.state.userToFollow) {
      this.clearPaths();
      clearFollowViewportSmoothingDebug(this.app);
      return true;
    }

    const { rawPath, smoothedPath } = getFollowViewportSmoothingDebugPaths(
      this.app,
    );

    this.rawPathElement.setAttribute("d", this.toViewportPathD(rawPath));
    this.smoothedPathElement.setAttribute(
      "d",
      this.toViewportPathD(smoothedPath),
    );

    return false;
  }

  private clearPaths() {
    this.rawPathElement.setAttribute("d", "");
    this.smoothedPathElement.setAttribute("d", "");
  }

  private toViewportPathD(
    points: readonly { sceneX: number; sceneY: number }[],
  ) {
    if (points.length === 0) {
      return "";
    }

    return points
      .map((point, index) => {
        const viewportPoint = sceneCoordsToViewportCoords(
          {
            sceneX: point.sceneX,
            sceneY: point.sceneY,
          },
          this.app.state,
        );

        return `${index === 0 ? "M" : "L"}${viewportPoint.x} ${viewportPoint.y}`;
      })
      .join(" ");
  }
}
