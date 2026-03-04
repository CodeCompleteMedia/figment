// ============================================
// Canvas Component — CanvasKit rendering surface
// ============================================

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../editor/store';
import { initEngine, getRenderer } from '../wasm/engine';
import { screenToCanvas, zoomAtPoint } from '../editor/viewport';
import { SelectTool } from '../editor/tools/select-tool';
import { ShapeTool } from '../editor/tools/shape-tool';
import type { ToolHandler } from '../editor/tools/tool-handler';
import type { Point, ToolType } from '../model/types';
import { useTheme, getThemeTokens } from './theme';

const toolInstances: Record<ToolType, ToolHandler> = {
  select: new SelectTool(),
  rectangle: new ShapeTool('rectangle'),
  ellipse: new ShapeTool('ellipse'),
  line: new ShapeTool('line'),
};

export default function CanvasView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isPanning = useRef(false);
  const panStart = useRef<Point>({ x: 0, y: 0 });
  const spaceDown = useRef(false);
  const ready = useRef(false);

  const tick = useEditorStore(s => s.tick);
  const activeTool = useEditorStore(s => s.activeTool);
  const viewMode = useEditorStore(s => s.viewMode);
  const t = useTheme();

  // Resize canvas to fill container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []);

  // Render loop
  const renderFrame = useCallback(() => {
    const renderer = getRenderer();
    if (!renderer) return;

    const store = useEditorStore.getState();
    const nodes = store.activePageNodes();
    const tokens = getThemeTokens();
    renderer.render(
      nodes,
      store.viewport,
      store.selectedIds,
      store.hoveredId,
      store.showGrid,
      store.previewShape,
      tokens,
    );
  }, []);

  // Init CanvasKit
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const renderer = await initEngine();
      if (cancelled || !canvasRef.current) return;

      resizeCanvas();
      const attached = renderer.attach(canvasRef.current);
      if (!attached) {
        console.error('Failed to create Skia surface');
        return;
      }
      ready.current = true;
      renderFrame();
    }

    init();

    const onResize = () => {
      resizeCanvas();
      if (ready.current) {
        const renderer = getRenderer();
        if (renderer && canvasRef.current) {
          renderer.detach();
          renderer.attach(canvasRef.current);
          renderFrame();
        }
      }
    };

    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Re-render on state change
  useEffect(() => {
    if (ready.current) renderFrame();
  }, [tick, renderFrame]);

  // Reattach surface when canvas becomes visible again (view mode toggle)
  useEffect(() => {
    if (viewMode === 'code') return; // Canvas is hidden
    if (!ready.current || !canvasRef.current) return;

    // Reattach after a frame to ensure DOM layout is settled
    const timer = setTimeout(() => {
      const renderer = getRenderer();
      if (renderer && canvasRef.current) {
        resizeCanvas();
        renderer.detach();
        renderer.attach(canvasRef.current);
        renderFrame();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [viewMode, resizeCanvas, renderFrame]);

  // Keyboard events
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useEditorStore.getState();
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        spaceDown.current = true;
        return;
      }

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') store.setTool('select');
      else if (e.key === 'r' || e.key === 'R') store.setTool('rectangle');
      else if (e.key === 'o' || e.key === 'O') store.setTool('ellipse');
      else if (e.key === 'l' || e.key === 'L') store.setTool('line');
      else if (e.key === 'g' || e.key === 'G') store.toggleGrid();
      else if (e.key === 'a' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); store.selectAll(); }
      else if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) { e.preventDefault(); store.redo(); }
      else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); store.undo(); }
      else if (e.key === 'y' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); store.redo(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') store.deleteSelected();
      else if (e.key === 'd' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); store.duplicateSelected(); }
      else if (e.key === 'Escape') store.clearSelection();
      // View mode: Ctrl+\ cycles design → split → code
      else if (e.key === '\\' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const modes = ['design', 'split', 'code'] as const;
        const idx = modes.indexOf(store.viewMode);
        store.setViewMode(modes[(idx + 1) % 3]);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Pointer events
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenPoint: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const store = useEditorStore.getState();
    const dpr = window.devicePixelRatio || 1;
    const adjustedScreen = { x: screenPoint.x * dpr, y: screenPoint.y * dpr };
    const canvasPoint = screenToCanvas(adjustedScreen, store.viewport);

    // Space + click = pan
    if (spaceDown.current || e.button === 1) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }

    const tool = toolInstances[store.activeTool];
    tool.onPointerDown({
      canvasPoint,
      screenPoint: adjustedScreen,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const store = useEditorStore.getState();

    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const dpr = window.devicePixelRatio || 1;
      store.setViewport({
        x: store.viewport.x + dx * dpr,
        y: store.viewport.y + dy * dpr,
      });
      panStart.current = { x: e.clientX, y: e.clientY };
      renderFrame();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenPoint: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const dpr = window.devicePixelRatio || 1;
    const adjustedScreen = { x: screenPoint.x * dpr, y: screenPoint.y * dpr };
    const canvasPoint = screenToCanvas(adjustedScreen, store.viewport);

    const tool = toolInstances[store.activeTool];
    tool.onPointerMove({
      canvasPoint,
      screenPoint: adjustedScreen,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });

    // Update cursor
    canvas.style.cursor = spaceDown.current ? 'grab' : tool.getCursor();
  }, [renderFrame]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPanning.current) {
      isPanning.current = false;
      canvas.style.cursor = spaceDown.current ? 'grab' : 'default';
      return;
    }

    const store = useEditorStore.getState();
    const rect = canvas.getBoundingClientRect();
    const screenPoint: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const dpr = window.devicePixelRatio || 1;
    const adjustedScreen = { x: screenPoint.x * dpr, y: screenPoint.y * dpr };
    const canvasPoint = screenToCanvas(adjustedScreen, store.viewport);

    const tool = toolInstances[store.activeTool];
    tool.onPointerUp({
      canvasPoint,
      screenPoint: adjustedScreen,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const store = useEditorStore.getState();
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const screenPoint = {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
    };

    if (e.ctrlKey || e.metaKey) {
      // Pinch-to-zoom
      const newViewport = zoomAtPoint(store.viewport, screenPoint, e.deltaY);
      store.setViewport(newViewport);
    } else {
      // Pan
      store.setViewport({
        x: store.viewport.x - e.deltaX * dpr,
        y: store.viewport.y - e.deltaY * dpr,
      });
    }
    renderFrame();
  }, [renderFrame]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden', position: 'relative', background: t.canvasBg }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      />
    </div>
  );
}
