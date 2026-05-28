import { THEME } from "@excalidraw/common";
import { describe, expect, it } from "vitest";

import { LINK_ICON_STROKE_BY_THEME } from "./helpers";

describe("link icon dark-mode styling", () => {
  it("uses the default blue stroke in light theme", () => {
    expect(LINK_ICON_STROKE_BY_THEME[THEME.LIGHT]).toBe("#1971c2");
  });

  it("uses the Mantine dark text equivalent in dark theme", () => {
    expect(LINK_ICON_STROKE_BY_THEME[THEME.DARK]).toBe("#C1C2C5");
  });
});
