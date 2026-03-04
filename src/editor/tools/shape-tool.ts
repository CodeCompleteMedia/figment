// ============================================
// Shape Creation Tool (Rectangle, Ellipse, Line)
// ============================================

import type { ToolHandler, ToolContext } from './tool-handler';
import { useEditorStore } from '../store';
import type { Point } from '../../model/types';

type ShapeType = 'rectangle' | 'ellipse' | 'line';

export class ShapeTool implements ToolHandler {
  private shapeType: ShapeType;
  private dragging = false;
  private startCanvas: Point = { x: 0, y: 0 };

  constructor(type: ShapeType) {
    this.shapeType = type;
  }

  getCursor(): string {
    return 'crosshair';
  }

  onPointerDown(ctx: ToolContext) {
    this.dragging = true;
    this.startCanvas = { ...ctx.canvasPoint };
  }

  onPointerMove(_ctx: ToolContext) {
    // Could show a preview shape here
  }

  onPointerUp(ctx: ToolContext) {
    if (!this.dragging) return;
    this.dragging = false;

    let x = Math.min(this.startCanvas.x, ctx.canvasPoint.x);
    let y = Math.min(this.startCanvas.y, ctx.canvasPoint.y);
    let w = Math.abs(ctx.canvasPoint.x - this.startCanvas.x);
    let h = Math.abs(ctx.canvasPoint.y - this.startCanvas.y);

    // If just a click (no drag), create a default-sized shape
    if (w < 2 && h < 2) {
      w = 100;
      h = 100;
      x = this.startCanvas.x - 50;
      y = this.startCanvas.y - 50;
    }

    // For shift-constrained shapes (square/circle)
    if (ctx.shiftKey && this.shapeType !== 'line') {
      const size = Math.max(w, h);
      w = size;
      h = size;
    }

    const store = useEditorStore.getState();
    store.addNode(this.shapeType, x, y, w, h);
  }
}
