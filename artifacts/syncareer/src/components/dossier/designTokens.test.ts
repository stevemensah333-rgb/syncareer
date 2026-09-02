import { describe, expect, it } from 'vitest';

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
  const [red = 0, green = 0, blue = 0] = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrast(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Evidence Dossier color contract', () => {
  it.each([
    ['ink on canvas', '#18211D', '#F4F1E8'],
    ['muted ink on canvas', '#626B65', '#F4F1E8'],
    ['indigo on wash', '#414985', '#EEF0FA'],
    ['jade on wash', '#166B57', '#E8F3EE'],
    ['clay on wash', '#99542F', '#F7ECE3'],
    ['dark ink on canvas', '#F4F1E8', '#121512'],
    ['dark muted ink on canvas', '#AEB6AE', '#121512'],
    ['dark indigo on wash', '#AEB5FF', '#282C48'],
    ['dark jade on wash', '#75C7A7', '#183A31'],
    ['dark clay on wash', '#E4A078', '#412A20'],
  ])('%s meets WCAG AA for normal text', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
