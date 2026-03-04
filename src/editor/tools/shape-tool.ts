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

    // Set initial zero-size preview at click point
    const store = useEditorStore.getState();
    store.setPreviewShape({
      type: this.shapeType,
      x: ctx.canvasPoint.x,
      y: ctx.canvasPoint.y,
      width: 0,
      height: 0,
    });
  }

  onPointerMove(ctx: ToolContext) {
    if (!this.dragging) return;

    const store = useEditorStore.getState();

    let x: number, y: number, w: number, h: number;

    if (this.shapeType === 'line') {
      // Lines: start point as origin, width/height encode the endpoint delta
      x = this.startCanvas.x;
      y = this.startCanvas.y;
      w = ctx.canvasPoint.x - this.startCanvas.x;
      h = ctx.canvasPoint.y - this.startCanvas.y;
    } else {
      x = Math.min(this.startCanvas.x, ctx.canvasPoint.x);
      y = Math.min(this.startCanvas.y, ctx.canvasPoint.y);
      w = Math.abs(ctx.canvasPoint.x - this.startCanvas.x);
      h = Math.abs(ctx.canvasPoint.y - this.startCanvas.y);

      // Shift-constrain to square/circle
      if (ctx.shiftKey) {
        const size = Math.max(w, h);
        w = size;
        h = size;
      }
    }

    store.setPreviewShape({ type: this.shapeType, x, y, width: w, height: h });
    store.requestRender();
  }

  onPointerUp(ctx: ToolContext) {
    if (!this.dragging) return;
    this.dragging = false;

    const store = useEditorStore.getState();

    // Clear the preview
    store.setPreviewShape(null);

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

    store.addNode(this.shapeType, x, y, w, h);
  }
}
