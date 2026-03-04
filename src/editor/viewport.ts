// ============================================
// Viewport: screen ↔ canvas coordinate transforms
// ============================================

import type { Point, Viewport } from '../model/types';

/** Convert screen (mouse) coordinates to canvas coordinates */
export function screenToCanvas(screen: Point, viewport: Viewport): Point {
  return {
    x: (screen.x - viewport.x) / viewport.zoom,
    y: (screen.y - viewport.y) / viewport.zoom,
  };
}

/** Convert canvas coordinates to screen coordinates */
export function canvasToScreen(canvas: Point, viewport: Viewport): Point {
  return {
    x: canvas.x * viewport.zoom + viewport.x,
    y: canvas.y * viewport.zoom + viewport.y,
  };
}

/** Zoom toward a screen point */
export function zoomAtPoint(
  viewport: Viewport,
  screenPoint: Point,
  delta: number,
): Viewport {
  const zoomFactor = delta > 0 ? 0.9 : 1.1;
  const newZoom = Math.min(20, Math.max(0.05, viewport.zoom * zoomFactor));

  // Keep the point under cursor stationary
  const wx = (screenPoint.x - viewport.x) / viewport.zoom;
  const wy = (screenPoint.y - viewport.y) / viewport.zoom;

  return {
    x: screenPoint.x - wx * newZoom,
    y: screenPoint.y - wy * newZoom,
    zoom: newZoom,
  };
}
