// ============================================
// CanvasKit Renderer
// ============================================

import type CanvasKitInit from 'canvaskit-wasm';
import type { SceneNode, Color, Viewport, HandlePosition } from '../model/types';
import { COLORS } from '../model/types';

type CanvasKit = Awaited<ReturnType<typeof CanvasKitInit>>;
type Surface = any;
type Canvas = any;
type Paint = any;

const HANDLE_SIZE = 8;
const GRID_SIZE = 20;

export class FigmentRenderer {
  private ck: CanvasKit;
  private surface: Surface | null = null;
  private canvasEl: HTMLCanvasElement | null = null;

  constructor(ck: CanvasKit) {
    this.ck = ck;
  }

  attach(canvas: HTMLCanvasElement) {
    this.canvasEl = canvas;
    this.surface = this.ck.MakeWebGLCanvasSurface(canvas);
    if (!this.surface) {
      // Fallback to software rendering
      this.surface = this.ck.MakeSWCanvasSurface(canvas);
    }
    return !!this.surface;
  }

  detach() {
    this.surface?.delete();
    this.surface = null;
    this.canvasEl = null;
  }

  private makePaint(color: Color, style: 'fill' | 'stroke', strokeWidth = 1): Paint {
    const paint = new this.ck.Paint();
    paint.setColor(this.ck.Color(color.r, color.g, color.b, color.a));
    paint.setStyle(style === 'fill' ? this.ck.PaintStyle.Fill : this.ck.PaintStyle.Stroke);
    paint.setAntiAlias(true);
    if (style === 'stroke') {
      paint.setStrokeWidth(strokeWidth);
    }
    return paint;
  }

  render(
    nodes: SceneNode[],
    viewport: Viewport,
    selectedIds: string[],
    hoveredId: string | null,
    showGrid: boolean,
  ) {
    if (!this.surface || !this.canvasEl) return;

    const canvas: Canvas = this.surface.getCanvas();
    const { width, height } = this.canvasEl;

    // Clear background
    canvas.clear(this.ck.Color(251, 249, 247, 1)); // warm white (neutral-50)

    canvas.save();

    // Apply viewport transform
    canvas.translate(viewport.x, viewport.y);
    canvas.scale(viewport.zoom, viewport.zoom);

    // Draw grid
    if (showGrid && viewport.zoom > 0.3) {
      this.drawGrid(canvas, viewport, width, height);
    }

    // Draw nodes (back to front)
    for (const node of nodes) {
      if (!node.visible) continue;
      this.drawNode(canvas, node, selectedIds.includes(node.id), hoveredId === node.id);
    }

    // Draw selection boxes on top
    for (const node of nodes) {
      if (selectedIds.includes(node.id) && node.visible) {
        this.drawSelectionBox(canvas, node, viewport.zoom);
      }
    }

    canvas.restore();

    this.surface.flush();
  }

  private drawGrid(canvas: Canvas, viewport: Viewport, screenW: number, screenH: number) {
    const gridPaint = this.makePaint({ r: 216, g: 207, b: 198, a: 0.3 }, 'stroke', 1 / viewport.zoom);

    // Determine visible area in canvas space
    const left = -viewport.x / viewport.zoom;
    const top = -viewport.y / viewport.zoom;
    const right = (screenW - viewport.x) / viewport.zoom;
    const bottom = (screenH - viewport.y) / viewport.zoom;

    const step = GRID_SIZE;
    const startX = Math.floor(left / step) * step;
    const startY = Math.floor(top / step) * step;

    for (let x = startX; x <= right; x += step) {
      canvas.drawLine(x, top, x, bottom, gridPaint);
    }
    for (let y = startY; y <= bottom; y += step) {
      canvas.drawLine(left, y, right, y, gridPaint);
    }

    gridPaint.delete();
  }

  private drawNode(canvas: Canvas, node: SceneNode, selected: boolean, hovered: boolean) {
    canvas.save();

    if (node.opacity < 1) {
      const layerPaint = new this.ck.Paint();
      layerPaint.setAlphaf(node.opacity);
      canvas.saveLayer(layerPaint);
      layerPaint.delete();
    }

    switch (node.type) {
      case 'rectangle':
        this.drawRectangle(canvas, node);
        break;
      case 'ellipse':
        this.drawEllipse(canvas, node);
        break;
      case 'line':
        this.drawLine(canvas, node);
        break;
    }

    if (node.opacity < 1) {
      canvas.restore();
    }

    canvas.restore();
  }

  private drawRectangle(canvas: Canvas, node: SceneNode & { borderRadius?: number }) {
    const rr = this.ck.RRectXY(
      this.ck.LTRBRect(node.x, node.y, node.x + node.width, node.y + node.height),
      node.borderRadius ?? 0,
      node.borderRadius ?? 0,
    );

    if (node.fill.visible) {
      const fillPaint = this.makePaint(node.fill.color, 'fill');
      canvas.drawRRect(rr, fillPaint);
      fillPaint.delete();
    }

    if (node.stroke.visible && node.stroke.width > 0) {
      const strokePaint = this.makePaint(node.stroke.color, 'stroke', node.stroke.width);
      canvas.drawRRect(rr, strokePaint);
      strokePaint.delete();
    }
  }

  private drawEllipse(canvas: Canvas, node: SceneNode) {
    const rect = this.ck.LTRBRect(node.x, node.y, node.x + node.width, node.y + node.height);

    if (node.fill.visible) {
      const fillPaint = this.makePaint(node.fill.color, 'fill');
      canvas.drawOval(rect, fillPaint);
      fillPaint.delete();
    }

    if (node.stroke.visible && node.stroke.width > 0) {
      const strokePaint = this.makePaint(node.stroke.color, 'stroke', node.stroke.width);
      canvas.drawOval(rect, strokePaint);
      strokePaint.delete();
    }
  }

  private drawLine(canvas: Canvas, node: SceneNode) {
    if (node.stroke.visible && node.stroke.width > 0) {
      const strokePaint = this.makePaint(node.stroke.color, 'stroke', node.stroke.width);
      strokePaint.setStrokeCap(this.ck.StrokeCap.Round);
      canvas.drawLine(node.x, node.y, node.x + node.width, node.y + node.height, strokePaint);
      strokePaint.delete();
    }
  }

  private drawSelectionBox(canvas: Canvas, node: SceneNode, zoom: number) {
    const selColor = COLORS.selection;
    const borderPaint = this.makePaint(selColor, 'stroke', 1.5 / zoom);

    const rect = this.ck.LTRBRect(node.x, node.y, node.x + node.width, node.y + node.height);
    canvas.drawRect(rect, borderPaint);
    borderPaint.delete();

    // Draw handles
    const handleSize = HANDLE_SIZE / zoom;
    const handles = this.getHandlePositions(node);
    const handleFill = this.makePaint({ r: 255, g: 255, b: 255, a: 1 }, 'fill');
    const handleStroke = this.makePaint(selColor, 'stroke', 1.5 / zoom);

    for (const [, pos] of handles) {
      const hRect = this.ck.LTRBRect(
        pos.x - handleSize / 2, pos.y - handleSize / 2,
        pos.x + handleSize / 2, pos.y + handleSize / 2,
      );
      canvas.drawRect(hRect, handleFill);
      canvas.drawRect(hRect, handleStroke);
    }

    handleFill.delete();
    handleStroke.delete();
  }

  private getHandlePositions(node: SceneNode): [HandlePosition, { x: number; y: number }][] {
    const { x, y, width: w, height: h } = node;
    return [
      ['top-left', { x, y }],
      ['top-right', { x: x + w, y }],
      ['bottom-left', { x, y: y + h }],
      ['bottom-right', { x: x + w, y: y + h }],
      ['top', { x: x + w / 2, y }],
      ['right', { x: x + w, y: y + h / 2 }],
      ['bottom', { x: x + w / 2, y: y + h }],
      ['left', { x, y: y + h / 2 }],
    ];
  }

  /** Export the scene to PNG as a Uint8Array */
  exportPNG(nodes: SceneNode[], width: number, height: number): Uint8Array | null {
    const surface = this.ck.MakeSurface(width, height);
    if (!surface) return null;

    const canvas = surface.getCanvas();
    canvas.clear(this.ck.Color(255, 255, 255, 1));

    for (const node of nodes) {
      if (!node.visible) continue;
      this.drawNode(canvas, node, false, false);
    }

    const image = surface.makeImageSnapshot();
    const bytes = image.encodeToBytes(this.ck.ImageFormat.PNG, 100);
    image.delete();
    surface.delete();
    return bytes;
  }

  getHandleAtPoint(
    node: SceneNode,
    canvasPoint: { x: number; y: number },
    zoom: number,
  ): HandlePosition | null {
    const handleSize = HANDLE_SIZE / zoom;
    const handles = this.getHandlePositions(node);

    for (const [name, pos] of handles) {
      if (
        Math.abs(canvasPoint.x - pos.x) <= handleSize &&
        Math.abs(canvasPoint.y - pos.y) <= handleSize
      ) {
        return name;
      }
    }
    return null;
  }
}
