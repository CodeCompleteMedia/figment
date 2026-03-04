// ============================================
// CanvasKit Renderer
// ============================================

import type CanvasKitInit from 'canvaskit-wasm';
import type { SceneNode, Color, Viewport, HandlePosition } from '../model/types';
import { COLORS } from '../model/types';
import type { PreviewShape } from '../editor/store';
import type { ThemeTokens } from '../ui/theme';

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
  private _theme: ThemeTokens | null = null;

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
    previewShape?: PreviewShape | null,
    theme?: ThemeTokens | null,
  ) {
    if (!this.surface || !this.canvasEl) return;

    const canvas: Canvas = this.surface.getCanvas();
    const { width, height } = this.canvasEl;

    // Store theme for use in sub-methods
    this._theme = theme ?? null;

    // Clear background (theme-aware)
    const cr = theme?.canvasClearR ?? 251;
    const cg = theme?.canvasClearG ?? 249;
    const cb = theme?.canvasClearB ?? 247;
    canvas.clear(this.ck.Color(cr, cg, cb, 1));

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

    // Draw preview shape (rubber-band during drag-to-create)
    if (previewShape) {
      this.drawPreviewShape(canvas, previewShape, viewport.zoom);
    }

    canvas.restore();

    this.surface.flush();
  }

  private drawGrid(canvas: Canvas, viewport: Viewport, screenW: number, screenH: number) {
    const t = this._theme;
    const gridPaint = this.makePaint({
      r: t?.canvasGridR ?? 216,
      g: t?.canvasGridG ?? 207,
      b: t?.canvasGridB ?? 198,
      a: t?.canvasGridA ?? 0.3,
    }, 'stroke', 1 / viewport.zoom);

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
    const hfR = this._theme?.canvasClearR ?? 255;
    const hfG = this._theme?.canvasClearG ?? 255;
    const hfB = this._theme?.canvasClearB ?? 255;
    const handleFill = this.makePaint({ r: hfR, g: hfG, b: hfB, a: 1 }, 'fill');
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

  /** Draw a preview shape (rubber-band outline during drag-to-create) */
  private drawPreviewShape(canvas: Canvas, preview: PreviewShape, zoom: number) {
    const { type, x, y, width: w, height: h } = preview;

    // Skip if too small (just a click, no drag yet)
    if (Math.abs(w) < 1 && Math.abs(h) < 1) return;

    // Semi-transparent fill in brand primary color
    const fillPaint = new this.ck.Paint();
    fillPaint.setColor(this.ck.Color(124, 92, 252, 0.08)); // Figment violet, very light
    fillPaint.setStyle(this.ck.PaintStyle.Fill);
    fillPaint.setAntiAlias(true);

    // Dashed stroke in brand primary
    const strokePaint = new this.ck.Paint();
    strokePaint.setColor(this.ck.Color(124, 92, 252, 0.7)); // Figment violet
    strokePaint.setStyle(this.ck.PaintStyle.Stroke);
    strokePaint.setStrokeWidth(1.5 / zoom);
    strokePaint.setAntiAlias(true);

    // Create dash effect
    const dashLen = 6 / zoom;
    const gapLen = 4 / zoom;
    const dashEffect = this.ck.PathEffect.MakeDash([dashLen, gapLen]);
    strokePaint.setPathEffect(dashEffect);

    if (type === 'line') {
      // Lines: draw from (x,y) to (x+w, y+h)
      strokePaint.setStrokeWidth(2 / zoom);
      strokePaint.setStrokeCap(this.ck.StrokeCap.Round);
      canvas.drawLine(x, y, x + w, y + h, strokePaint);

      // Draw small circles at start and end points
      const dotPaint = new this.ck.Paint();
      dotPaint.setColor(this.ck.Color(124, 92, 252, 0.9));
      dotPaint.setStyle(this.ck.PaintStyle.Fill);
      dotPaint.setAntiAlias(true);
      const dotRadius = 3 / zoom;
      canvas.drawCircle(x, y, dotRadius, dotPaint);
      canvas.drawCircle(x + w, y + h, dotRadius, dotPaint);
      dotPaint.delete();
    } else if (type === 'ellipse') {
      const rect = this.ck.LTRBRect(x, y, x + w, y + h);
      canvas.drawOval(rect, fillPaint);
      canvas.drawOval(rect, strokePaint);
    } else {
      // Rectangle
      const rect = this.ck.LTRBRect(x, y, x + w, y + h);
      canvas.drawRect(rect, fillPaint);
      canvas.drawRect(rect, strokePaint);
    }

    // Draw size label
    this.drawSizeLabel(canvas, x, y, w, h, zoom);

    fillPaint.delete();
    strokePaint.delete();
    dashEffect.delete();
  }

  /** Draw a small label showing dimensions near the preview shape */
  private drawSizeLabel(canvas: Canvas, x: number, y: number, w: number, h: number, zoom: number) {
    const absW = Math.abs(Math.round(w));
    const absH = Math.abs(Math.round(h));
    if (absW < 2 && absH < 2) return;

    const label = `${absW} × ${absH}`;
    const fontSize = 11 / zoom;

    const font = new this.ck.Font(null, fontSize);
    const textPaint = new this.ck.Paint();
    textPaint.setColor(this.ck.Color(124, 92, 252, 1));
    textPaint.setAntiAlias(true);

    // Background pill (theme-aware)
    const bgPaint = new this.ck.Paint();
    const lbR = this._theme?.previewLabelBgR ?? 255;
    const lbG = this._theme?.previewLabelBgG ?? 255;
    const lbB = this._theme?.previewLabelBgB ?? 255;
    bgPaint.setColor(this.ck.Color(lbR, lbG, lbB, 0.9));
    bgPaint.setStyle(this.ck.PaintStyle.Fill);
    bgPaint.setAntiAlias(true);

    // Measure text width via glyph widths (CanvasKit API)
    const glyphIds = font.getGlyphIDs(label);
    const glyphWidths = font.getGlyphWidths(glyphIds);
    const textWidth = glyphWidths.reduce((sum: number, w: number) => sum + w, 0);
    const padding = 4 / zoom;
    const labelX = x + Math.abs(w) / 2 - textWidth / 2;
    const labelY = y + Math.abs(h) + fontSize + 8 / zoom;

    const bgRect = this.ck.LTRBRect(
      labelX - padding,
      labelY - fontSize - padding / 2,
      labelX + textWidth + padding,
      labelY + padding,
    );

    const bgRRect = this.ck.RRectXY(bgRect, 3 / zoom, 3 / zoom);
    canvas.drawRRect(bgRRect, bgPaint);

    // CanvasKit drawText signature: (text, x, y, paint, font)
    try {
      canvas.drawText(label, labelX, labelY, textPaint, font);
    } catch {
      // Fallback: skip label if drawText fails
    }

    font.delete();
    textPaint.delete();
    bgPaint.delete();
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
