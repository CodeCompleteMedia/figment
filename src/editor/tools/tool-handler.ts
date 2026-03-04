// ============================================
// Tool Handler Interface & Dispatcher
// ============================================

import type { Point, SceneNode, HandlePosition } from '../../model/types';

export interface ToolContext {
  canvasPoint: Point;
  screenPoint: Point;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface ToolHandler {
  onPointerDown(ctx: ToolContext): void;
  onPointerMove(ctx: ToolContext): void;
  onPointerUp(ctx: ToolContext): void;
  getCursor(): string;
}

// ============================================
// Hit Testing
// ============================================

export function hitTest(nodes: SceneNode[], point: Point): SceneNode | null {
  // Test back-to-front, return the topmost hit
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node.visible || node.locked) continue;

    if (node.type === 'line') {
      if (hitTestLine(node, point)) return node;
    } else if (node.type === 'ellipse') {
      if (hitTestEllipse(node, point)) return node;
    } else {
      if (hitTestRect(node, point)) return node;
    }
  }
  return null;
}

function hitTestRect(node: SceneNode, point: Point): boolean {
  return (
    point.x >= node.x && point.x <= node.x + node.width &&
    point.y >= node.y && point.y <= node.y + node.height
  );
}

function hitTestEllipse(node: SceneNode, point: Point): boolean {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const rx = node.width / 2;
  const ry = node.height / 2;
  if (rx === 0 || ry === 0) return false;
  const dx = (point.x - cx) / rx;
  const dy = (point.y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function hitTestLine(node: SceneNode, point: Point): boolean {
  const x1 = node.x, y1 = node.y;
  const x2 = node.x + node.width, y2 = node.y + node.height;
  const dist = pointToLineDistance(point.x, point.y, x1, y1, x2, y2);
  return dist < 6; // 6px tolerance
}

function pointToLineDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}
