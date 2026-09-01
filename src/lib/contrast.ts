// WCAG 2.1 relative luminance and contrast ratio, over the palette's two colour
// notations: opaque hex and ink at an alpha.

export type Rgb = { r: number; g: number; b: number };

export type Color = { rgb: Rgb; alpha: number };

export function parseColor(css: string): Color {
  const hex = /^#([0-9a-f]{6})$/i.exec(css.trim());
  if (hex) {
    const value = Number.parseInt(hex[1], 16);
    return { rgb: { r: value >> 16, g: (value >> 8) & 0xff, b: value & 0xff }, alpha: 1 };
  }

  const rgba = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/.exec(css.trim());
  if (rgba) {
    return {
      rgb: { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]) },
      alpha: Number(rgba[4]),
    };
  }

  throw new Error(`Unsupported colour notation: ${css}`);
}

// What the eye actually sees where a translucent colour sits on a surface.
export function flatten(color: Color, surface: Rgb): Rgb {
  const mix = (channel: number, under: number) =>
    Math.round(channel * color.alpha + under * (1 - color.alpha));
  return {
    r: mix(color.rgb.r, surface.r),
    g: mix(color.rgb.g, surface.g),
    b: mix(color.rgb.b, surface.b),
  };
}

export function relativeLuminance(rgb: Rgb): number {
  const linear = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [darker, lighter] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => x - y);
  return (lighter + 0.05) / (darker + 0.05);
}
