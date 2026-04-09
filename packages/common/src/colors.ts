import oc from "open-color";

import type { Merge } from "./utility-types";

type RGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const DARK_MODE_COLORS_CACHE = new Map<string, string>();

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const parseRgbChannel = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return clamp(Math.round((Number.parseFloat(trimmed) / 100) * 255), 0, 255);
  }
  return clamp(Math.round(Number.parseFloat(trimmed)), 0, 255);
};

const parseAlphaChannel = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return clamp(Number.parseFloat(trimmed) / 100, 0, 1);
  }
  return clamp(Number.parseFloat(trimmed), 0, 1);
};

const parseHexColor = (color: string): RGBA | null => {
  const hex = color.trim().slice(1);

  if (hex.length === 3 || hex.length === 4) {
    const [r, g, b, a = "f"] = hex.split("");
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
      a: Number.parseInt(`${a}${a}`, 16) / 255,
    };
  }

  if (hex.length === 6 || hex.length === 8) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a:
        hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }

  return null;
};

const parseFunctionalColorParts = (value: string) => {
  const [main, alpha] = value.split("/");
  const parts = (main.includes(",") ? main.split(",") : main.split(/\s+/))
    .map((part) => part.trim())
    .filter(Boolean);

  if (alpha) {
    parts.push(alpha.trim());
  }

  return parts;
};

const hslToRgb = (hue: number, saturation: number, lightness: number) => {
  const h = ((hue % 360) + 360) % 360;
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;

  if (s === 0) {
    const value = Math.round(l * 255);
    return { r: value, g: value, b: value };
  }

  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (huePrime >= 0 && huePrime < 1) {
    r1 = chroma;
    g1 = x;
  } else if (huePrime < 2) {
    r1 = x;
    g1 = chroma;
  } else if (huePrime < 3) {
    g1 = chroma;
    b1 = x;
  } else if (huePrime < 4) {
    g1 = x;
    b1 = chroma;
  } else if (huePrime < 5) {
    r1 = x;
    b1 = chroma;
  } else {
    r1 = chroma;
    b1 = x;
  }

  const match = l - chroma / 2;

  return {
    r: Math.round((r1 + match) * 255),
    g: Math.round((g1 + match) * 255),
    b: Math.round((b1 + match) * 255),
  };
};

const parseRgbColor = (color: string): RGBA | null => {
  const match = color.trim().match(/^rgba?\((.*)\)$/i);
  if (!match) {
    return null;
  }

  const parts = parseFunctionalColorParts(match[1]);
  if (parts.length < 3) {
    return null;
  }

  return {
    r: parseRgbChannel(parts[0]),
    g: parseRgbChannel(parts[1]),
    b: parseRgbChannel(parts[2]),
    a: parts[3] ? parseAlphaChannel(parts[3]) : 1,
  };
};

const parseHslColor = (color: string): RGBA | null => {
  const match = color.trim().match(/^hsla?\((.*)\)$/i);
  if (!match) {
    return null;
  }

  const parts = parseFunctionalColorParts(match[1]);
  if (parts.length < 3) {
    return null;
  }

  const hue = Number.parseFloat(parts[0]);
  const saturation = Number.parseFloat(parts[1]);
  const lightness = Number.parseFloat(parts[2]);

  if (
    Number.isNaN(hue) ||
    Number.isNaN(saturation) ||
    Number.isNaN(lightness)
  ) {
    return null;
  }

  const rgb = hslToRgb(hue, saturation, lightness);

  return {
    ...rgb,
    a: parts[3] ? parseAlphaChannel(parts[3]) : 1,
  };
};

const parseCssColor = (color: string): RGBA | null => {
  const normalized = color.trim().toLowerCase();

  if (normalized === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  if (normalized.startsWith("#")) {
    return parseHexColor(normalized);
  }

  if (normalized.startsWith("rgb")) {
    return parseRgbColor(normalized);
  }

  if (normalized.startsWith("hsl")) {
    return parseHslColor(normalized);
  }

  return null;
};

const cssInvert = (r: number, g: number, b: number, percent: number) => {
  const factor = clamp(percent, 0, 100) / 100;
  const invertChannel = (channel: number) => {
    return Math.round(clamp(channel * (1 - factor) + (255 - channel) * factor, 0, 255));
  };

  return {
    r: invertChannel(r),
    g: invertChannel(g),
    b: invertChannel(b),
  };
};

const cssHueRotate = (r: number, g: number, b: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const matrix = [
    0.213 + cosine * 0.787 - sine * 0.213,
    0.715 - cosine * 0.715 - sine * 0.715,
    0.072 - cosine * 0.072 + sine * 0.928,
    0.213 - cosine * 0.213 + sine * 0.143,
    0.715 + cosine * 0.285 + sine * 0.14,
    0.072 - cosine * 0.072 - sine * 0.283,
    0.213 - cosine * 0.213 - sine * 0.787,
    0.715 - cosine * 0.715 + sine * 0.715,
    0.072 + cosine * 0.928 + sine * 0.072,
  ];

  return {
    r: Math.round(clamp(red * matrix[0] + green * matrix[1] + blue * matrix[2], 0, 1) * 255),
    g: Math.round(clamp(red * matrix[3] + green * matrix[4] + blue * matrix[5], 0, 1) * 255),
    b: Math.round(clamp(red * matrix[6] + green * matrix[7] + blue * matrix[8], 0, 1) * 255),
  };
};

export const COLOR_OUTLINE_CONTRAST_THRESHOLD = 240;

// FIXME can't put to utils.ts rn because of circular dependency
const pick = <R extends Record<string, any>, K extends readonly (keyof R)[]>(
  source: R,
  keys: K,
) => {
  return keys.reduce((acc, key: K[number]) => {
    if (key in source) {
      acc[key] = source[key];
    }
    return acc;
  }, {} as Pick<R, K[number]>) as Pick<R, K[number]>;
};

export type ColorPickerColor =
  | Exclude<keyof oc, "indigo" | "lime">
  | "transparent"
  | "bronze";
export type ColorTuple = readonly [string, string, string, string, string];
export type ColorPalette = Merge<
  Record<ColorPickerColor, ColorTuple>,
  { black: "#1e1e1e"; white: "#ffffff"; transparent: "transparent" }
>;

// used general type instead of specific type (ColorPalette) to support custom colors
export type ColorPaletteCustom = { [key: string]: ColorTuple | string };
export type ColorShadesIndexes = [number, number, number, number, number];

export const MAX_CUSTOM_COLORS_USED_IN_CANVAS = 5;
export const COLORS_PER_ROW = 5;

export const DEFAULT_CHART_COLOR_INDEX = 4;

export const DEFAULT_ELEMENT_STROKE_COLOR_INDEX = 4;
export const DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX = 1;
export const ELEMENTS_PALETTE_SHADE_INDEXES = [0, 2, 4, 6, 8] as const;
export const CANVAS_PALETTE_SHADE_INDEXES = [0, 1, 2, 3, 4] as const;

export const getSpecificColorShades = (
  color: Exclude<
    ColorPickerColor,
    "transparent" | "white" | "black" | "bronze"
  >,
  indexArr: Readonly<ColorShadesIndexes>,
) => {
  return indexArr.map((index) => oc[color][index]) as any as ColorTuple;
};

export const COLOR_PALETTE = {
  transparent: "transparent",
  black: "#1e1e1e",
  white: "#ffffff",
  // open-colors
  gray: getSpecificColorShades("gray", ELEMENTS_PALETTE_SHADE_INDEXES),
  red: getSpecificColorShades("red", ELEMENTS_PALETTE_SHADE_INDEXES),
  pink: getSpecificColorShades("pink", ELEMENTS_PALETTE_SHADE_INDEXES),
  grape: getSpecificColorShades("grape", ELEMENTS_PALETTE_SHADE_INDEXES),
  violet: getSpecificColorShades("violet", ELEMENTS_PALETTE_SHADE_INDEXES),
  blue: getSpecificColorShades("blue", ELEMENTS_PALETTE_SHADE_INDEXES),
  cyan: getSpecificColorShades("cyan", ELEMENTS_PALETTE_SHADE_INDEXES),
  teal: getSpecificColorShades("teal", ELEMENTS_PALETTE_SHADE_INDEXES),
  green: getSpecificColorShades("green", ELEMENTS_PALETTE_SHADE_INDEXES),
  yellow: getSpecificColorShades("yellow", ELEMENTS_PALETTE_SHADE_INDEXES),
  orange: getSpecificColorShades("orange", ELEMENTS_PALETTE_SHADE_INDEXES),
  // radix bronze shades 3,5,7,9,11
  bronze: ["#f8f1ee", "#eaddd7", "#d2bab0", "#a18072", "#846358"],
} as ColorPalette;

const COMMON_ELEMENT_SHADES = pick(COLOR_PALETTE, [
  "cyan",
  "blue",
  "violet",
  "grape",
  "pink",
  "green",
  "teal",
  "yellow",
  "orange",
  "red",
]);

// -----------------------------------------------------------------------------
// quick picks defaults
// -----------------------------------------------------------------------------

// ORDER matters for positioning in quick picker
export const DEFAULT_ELEMENT_STROKE_PICKS = [
  COLOR_PALETTE.black,
  COLOR_PALETTE.red[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
  COLOR_PALETTE.green[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
  COLOR_PALETTE.blue[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
  COLOR_PALETTE.yellow[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
] as ColorTuple;

// ORDER matters for positioning in quick picker
export const DEFAULT_ELEMENT_BACKGROUND_PICKS = [
  COLOR_PALETTE.transparent,
  COLOR_PALETTE.red[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
  COLOR_PALETTE.green[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
  COLOR_PALETTE.blue[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
  COLOR_PALETTE.yellow[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
] as ColorTuple;

// ORDER matters for positioning in quick picker
export const DEFAULT_CANVAS_BACKGROUND_PICKS = [
  COLOR_PALETTE.white,
  // radix slate2
  "#f8f9fa",
  // radix blue2
  "#f5faff",
  // radix yellow2
  "#fffce8",
  // radix bronze2
  "#fdf8f6",
] as ColorTuple;

// -----------------------------------------------------------------------------
// palette defaults
// -----------------------------------------------------------------------------

export const DEFAULT_ELEMENT_STROKE_COLOR_PALETTE = {
  // 1st row
  transparent: COLOR_PALETTE.transparent,
  white: COLOR_PALETTE.white,
  gray: COLOR_PALETTE.gray,
  black: COLOR_PALETTE.black,
  bronze: COLOR_PALETTE.bronze,
  // rest
  ...COMMON_ELEMENT_SHADES,
} as const;

// ORDER matters for positioning in pallete (5x3 grid)s
export const DEFAULT_ELEMENT_BACKGROUND_COLOR_PALETTE = {
  transparent: COLOR_PALETTE.transparent,
  white: COLOR_PALETTE.white,
  gray: COLOR_PALETTE.gray,
  black: COLOR_PALETTE.black,
  bronze: COLOR_PALETTE.bronze,

  ...COMMON_ELEMENT_SHADES,
} as const;

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

// !!!MUST BE WITHOUT GRAY, TRANSPARENT AND BLACK!!!
export const getAllColorsSpecificShade = (index: 0 | 1 | 2 | 3 | 4) =>
  [
    // 2nd row
    COLOR_PALETTE.cyan[index],
    COLOR_PALETTE.blue[index],
    COLOR_PALETTE.violet[index],
    COLOR_PALETTE.grape[index],
    COLOR_PALETTE.pink[index],

    // 3rd row
    COLOR_PALETTE.green[index],
    COLOR_PALETTE.teal[index],
    COLOR_PALETTE.yellow[index],
    COLOR_PALETTE.orange[index],
    COLOR_PALETTE.red[index],
  ] as const;

export const rgbToHex = (r: number, g: number, b: number, a?: number) => {
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`;

  if (typeof a === "number" && a < 1) {
    const alpha = Math.round(clamp(a, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
    return `${hex}${alpha}`;
  }

  return hex;
};

export const applyDarkModeFilter = (color: string) => {
  const cached = DARK_MODE_COLORS_CACHE.get(color);
  if (cached) {
    return cached;
  }

  const parsed = parseCssColor(color);
  if (!parsed) {
    return color;
  }

  if (parsed.a === 0) {
    DARK_MODE_COLORS_CACHE.set(color, "transparent");
    return "transparent";
  }

  const inverted = cssInvert(parsed.r, parsed.g, parsed.b, 93);
  const rotated = cssHueRotate(inverted.r, inverted.g, inverted.b, 180);
  const filtered = rgbToHex(rotated.r, rotated.g, rotated.b, parsed.a);

  DARK_MODE_COLORS_CACHE.set(color, filtered);
  return filtered;
};

// -----------------------------------------------------------------------------
