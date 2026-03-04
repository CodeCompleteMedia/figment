// ============================================
// Node Factory — creates new scene nodes
// ============================================

import { v4 as uuidv4 } from 'uuid';
import type { SceneNode, RectangleNode, EllipseNode, LineNode, Color } from './types';
import { DEFAULT_FILL, DEFAULT_STROKE } from './types';

let rectCount = 0;
let ellipseCount = 0;
let lineCount = 0;

const PALETTE: Color[] = [
  { r: 124, g: 92, b: 252, a: 1 },   // violet
  { r: 255, g: 107, b: 82, a: 1 },   // coral
  { r: 245, g: 166, b: 35, a: 1 },   // amber
  { r: 20, g: 184, b: 138, a: 1 },   // mint
  { r: 59, g: 130, b: 246, a: 1 },   // blue
  { r: 236, g: 72, b: 153, a: 1 },   // pink
];

function nextColor(): Color {
  const idx = (rectCount + ellipseCount + lineCount) % PALETTE.length;
  return { ...PALETTE[idx] };
}

export function createRectangle(x: number, y: number, w: number, h: number): RectangleNode {
  rectCount++;
  return {
    id: uuidv4(),
    type: 'rectangle',
    name: `Rectangle ${rectCount}`,
    x, y, width: w, height: h,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: { color: nextColor(), visible: true },
    stroke: { ...DEFAULT_STROKE },
    borderRadius: 0,
  };
}

export function createEllipse(x: number, y: number, w: number, h: number): EllipseNode {
  ellipseCount++;
  return {
    id: uuidv4(),
    type: 'ellipse',
    name: `Ellipse ${ellipseCount}`,
    x, y, width: w, height: h,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: { color: nextColor(), visible: true },
    stroke: { ...DEFAULT_STROKE },
  };
}

export function createLine(x: number, y: number, w: number, h: number): LineNode {
  lineCount++;
  return {
    id: uuidv4(),
    type: 'line',
    name: `Line ${lineCount}`,
    x, y, width: w, height: h,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: { color: { r: 0, g: 0, b: 0, a: 0 }, visible: false },
    stroke: { color: nextColor(), width: 2, visible: true },
  };
}

export function duplicateNode(node: SceneNode): SceneNode {
  const clone = JSON.parse(JSON.stringify(node)) as SceneNode;
  clone.id = uuidv4();
  clone.name = `${node.name} copy`;
  clone.x += 20;
  clone.y += 20;
  return clone;
}
