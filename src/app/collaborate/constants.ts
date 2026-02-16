import type { TextStyle } from "@/hooks/usePeer";

export const FONT_FAMILIES = [
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Times New Roman", value: "Times New Roman, serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Verdana", value: "Verdana, sans-serif" },
  { name: "Courier New", value: "Courier New, monospace" },
  { name: "Comic Sans", value: "Comic Sans MS, cursive" },
  { name: "Impact", value: "Impact, sans-serif" },
  { name: "Trebuchet", value: "Trebuchet MS, sans-serif" },
];

export const FONT_SIZES = [
  "8px", "10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px", "72px"
];

export const LINE_SPACINGS = [
  { name: "Single", value: "1.0" },
  { name: "1.15", value: "1.15" },
  { name: "1.5", value: "1.5" },
  { name: "Double", value: "2.0" },
  { name: "2.5", value: "2.5" },
  { name: "Triple", value: "3.0" },
];

export const TEXT_COLORS = [
  // Grayscale
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
  // Reds
  "#980000", "#ff0000", "#ff9999", "#e06666", "#cc4125", "#dd7e6b",
  // Oranges & Yellows
  "#e69138", "#f6b26b", "#ff9900", "#ffff00", "#ffd966", "#fff2cc",
  // Greens
  "#274e13", "#38761d", "#6aa84f", "#93c47d", "#b6d7a8", "#d9ead3",
  // Blues & Cyans
  "#073763", "#0b5394", "#3d85c6", "#6fa8dc", "#9fc5e8", "#cfe2f3",
  "#00ffff", "#76a5af", "#45818e", "#134f5c",
  // Purples & Pinks
  "#351c75", "#674ea7", "#8e7cc3", "#b4a7d6", "#d9d2e9",
  "#741b47", "#a64d79", "#c27ba0", "#d5a6bd", "#ead1dc",
  "#9900ff", "#ff00ff", "#ff00cc",
];

export const HIGHLIGHT_COLORS = [
  // Bright highlights
  "#ffff00", "#00ff00", "#00ffff", "#ff00ff", "#ff0000", "#0000ff",
  // Pastel highlights
  "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#cfe2f3", "#d9d2e9", "#ead1dc",
  // Soft highlights
  "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#cfe2f3", "#d9d2e9",
  // Medium highlights
  "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#9fc5e8", "#b4a7d6",
];

export const SHAPE_COLORS = [
  // Grayscale
  "#000000", "#434343", "#666666", "#999999", "#cccccc", "#ffffff",
  // Primary colors
  "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#0000ff",
  // Secondary colors
  "#9900ff", "#ff00ff", "#ff6600", "#99ff00", "#00ff99", "#0099ff",
  // Darker shades
  "#990000", "#994c00", "#999900", "#009900", "#009999", "#000099",
  "#660099", "#990066", "#cc3300", "#669900", "#009966", "#006699",
  // Lighter shades
  "#ff6666", "#ffcc66", "#ffff66", "#66ff66", "#66ffff", "#6666ff",
  "#cc66ff", "#ff66cc", "#ff9966", "#ccff66", "#66ffcc", "#66ccff",
  // Pastels
  "#ffcccc", "#ffe6cc", "#ffffcc", "#ccffcc", "#ccffff", "#ccccff",
  "#e6ccff", "#ffcce6", "#ffd9b3", "#e6ffcc", "#ccffe6", "#cce6ff",
];

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Arial",
  fontSize: 16,
  fontColor: "#000000",
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  lineHeight: 1.5,
  listType: "none",
  heading: "none"
};

// Special element ID prefix for full-page document content
export const PAGE_DOCUMENT_PREFIX = "page-document-";
