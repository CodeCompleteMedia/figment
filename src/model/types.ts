// ============================================
// Figment Document Model
// ============================================

export type NodeType = 'rectangle' | 'ellipse' | 'line';

export interface Color {
  r: number; // 0-255
  g: number;
  b: number;
  a: number; // 0-1
}

export interface Fill {
  color: Color;
  visible: boolean;
}

export interface Stroke {
  color: Color;
  width: number;
  visible: boolean;
}

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  opacity: number; // 0-1
  visible: boolean;
  locked: boolean;
  fill: Fill;
  stroke: Stroke;
}

export interface RectangleNode extends BaseNode {
  type: 'rectangle';
  borderRadius: number;
}

export interface EllipseNode extends BaseNode {
  type: 'ellipse';
}

export interface LineNode extends BaseNode {
  type: 'line';
}

export type SceneNode = RectangleNode | EllipseNode | LineNode;

export interface Page {
  id: string;
  name: string;
  nodes: SceneNode[];
}

export interface FigmentDocument {
  id: string;
  name: string;
  pages: Page[];
  activePage: string; // page id
}

// ============================================
// Editor State Types
// ============================================

export type ToolType = 'select' | 'rectangle' | 'ellipse' | 'line';

export type HandlePosition =
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'top' | 'right' | 'bottom' | 'left';

export interface Viewport {
  x: number; // pan offset
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// Defaults
// ============================================

export const DEFAULT_FILL: Fill = {
  color: { r: 124, g: 92, b: 252, a: 1 }, // Figment violet
  visible: true,
};

export const DEFAULT_STROKE: Stroke = {
  color: { r: 0, g: 0, b: 0, a: 1 },
  width: 0,
  visible: false,
};

export const COLORS = {
  primary: { r: 124, g: 92, b: 252, a: 1 },
  coral: { r: 255, g: 107, b: 82, a: 1 },
  amber: { r: 245, g: 166, b: 35, a: 1 },
  mint: { r: 20, g: 184, b: 138, a: 1 },
  selection: { r: 59, g: 130, b: 246, a: 1 }, // blue for selection
} as const;

export function colorToCSS(c: Color): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}

export function cssToColor(hex: string): Color {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b, a: 1 };
}

export function colorToHex(c: Color): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}
