// ============================================
// Select Tool
// ============================================

import type { ToolHandler, ToolContext } from './tool-handler';
import { hitTest } from './tool-handler';
import { useEditorStore } from '../store';
import { getRenderer } from '../../wasm/engine';
import type { HandlePosition, Point, SceneNode } from '../../model/types';

type DragMode = 'none' | 'move' | 'resize';

export class SelectTool implements ToolHandler {
  private dragging = false;
  private dragMode: DragMode = 'none';
  private startCanvas: Point = { x: 0, y: 0 };
  private startPositions: Map<string, { x: number; y: number; w: number; h: number }> = new Map();
  private activeHandle: HandlePosition | null = null;
  private resizeNodeId: string | null = null;

  getCursor(): string {
    if (this.activeHandle) return this.handleToCursor(this.activeHandle);
    return 'default';
  }

  onPointerDown(ctx: ToolContext) {
    const store = useEditorStore.getState();
    const nodes = store.activePageNodes();
    const renderer = getRenderer();

    // Check if clicking a handle of a selected node
    if (renderer && store.selectedIds.length === 1) {
      const selectedNode = nodes.find(n => n.id === store.selectedIds[0]);
      if (selectedNode) {
        const handle = renderer.getHandleAtPoint(selectedNode, ctx.canvasPoint, store.viewport.zoom);
        if (handle) {
          this.dragMode = 'resize';
          this.activeHandle = handle;
          this.resizeNodeId = selectedNode.id;
          this.dragging = true;
          this.startCanvas = { ...ctx.canvasPoint };
          this.startPositions.set(selectedNode.id, {
            x: selectedNode.x, y: selectedNode.y,
            w: selectedNode.width, h: selectedNode.height,
          });
          return;
        }
      }
    }

    // Hit test for node selection
    const hit = hitTest(nodes, ctx.canvasPoint);

    if (hit) {
      if (ctx.shiftKey) {
        // Toggle selection
        const ids = store.selectedIds.includes(hit.id)
          ? store.selectedIds.filter(id => id !== hit.id)
          : [...store.selectedIds, hit.id];
        store.select(ids);
      } else if (!store.selectedIds.includes(hit.id)) {
        store.select([hit.id]);
      }

      // Start move drag
      this.dragMode = 'move';
      this.dragging = true;
      this.startCanvas = { ...ctx.canvasPoint };
      this.startPositions.clear();

      const currentSelected = useEditorStore.getState().selectedIds;
      for (const id of currentSelected) {
        const node = nodes.find(n => n.id === id);
        if (node) {
          this.startPositions.set(id, { x: node.x, y: node.y, w: node.width, h: node.height });
        }
      }
    } else {
      store.clearSelection();
    }
  }

  onPointerMove(ctx: ToolContext) {
    const store = useEditorStore.getState();
    const nodes = store.activePageNodes();

    if (!this.dragging) {
      // Hover detection
      const hit = hitTest(nodes, ctx.canvasPoint);
      store.setHovered(hit?.id ?? null);

      // Check handle hover for cursor
      const renderer = getRenderer();
      if (renderer && store.selectedIds.length === 1) {
        const selectedNode = nodes.find(n => n.id === store.selectedIds[0]);
        if (selectedNode) {
          const handle = renderer.getHandleAtPoint(selectedNode, ctx.canvasPoint, store.viewport.zoom);
          this.activeHandle = handle;
        } else {
          this.activeHandle = null;
        }
      } else {
        this.activeHandle = null;
      }
      return;
    }

    const dx = ctx.canvasPoint.x - this.startCanvas.x;
    const dy = ctx.canvasPoint.y - this.startCanvas.y;

    if (this.dragMode === 'move') {
      // Move all selected nodes
      for (const [id, start] of this.startPositions) {
        const node = nodes.find(n => n.id === id);
        if (node) {
          node.x = start.x + dx;
          node.y = start.y + dy;
        }
      }
      store.requestRender();
    } else if (this.dragMode === 'resize' && this.resizeNodeId && this.activeHandle) {
      const node = nodes.find(n => n.id === this.resizeNodeId);
      const start = this.startPositions.get(this.resizeNodeId);
      if (node && start) {
        this.applyResize(node, start, dx, dy, this.activeHandle, ctx.shiftKey);
        store.requestRender();
      }
    }
  }

  onPointerUp(ctx: ToolContext) {
    if (this.dragging) {
      const store = useEditorStore.getState();
      const nodes = store.activePageNodes();
      const dx = ctx.canvasPoint.x - this.startCanvas.x;
      const dy = ctx.canvasPoint.y - this.startCanvas.y;

      if (this.dragMode === 'move' && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
        // Restore positions and execute as command for undo
        for (const [id, start] of this.startPositions) {
          const node = nodes.find(n => n.id === id);
          if (node) {
            node.x = start.x;
            node.y = start.y;
          }
        }
        store.moveNodes([...this.startPositions.keys()], dx, dy);
      } else if (this.dragMode === 'resize' && this.resizeNodeId) {
        // Commit resize as an update command
        const node = nodes.find(n => n.id === this.resizeNodeId);
        if (node) {
          const current = { x: node.x, y: node.y, width: node.width, height: node.height };
          const start = this.startPositions.get(this.resizeNodeId);
          if (start) {
            // Restore and commit via command
            node.x = start.x;
            node.y = start.y;
            node.width = start.w;
            node.height = start.h;
            store.updateNode(this.resizeNodeId, current);
          }
        }
      }
    }

    this.dragging = false;
    this.dragMode = 'none';
    this.startPositions.clear();
    this.resizeNodeId = null;
  }

  private applyResize(
    node: SceneNode,
    start: { x: number; y: number; w: number; h: number },
    dx: number, dy: number,
    handle: HandlePosition,
    proportional: boolean,
  ) {
    let newX = start.x, newY = start.y, newW = start.w, newH = start.h;

    if (handle.includes('right')) newW = Math.max(1, start.w + dx);
    if (handle.includes('left')) { newX = start.x + dx; newW = Math.max(1, start.w - dx); }
    if (handle.includes('bottom')) newH = Math.max(1, start.h + dy);
    if (handle.includes('top')) { newY = start.y + dy; newH = Math.max(1, start.h - dy); }

    node.x = newX;
    node.y = newY;
    node.width = newW;
    node.height = newH;
  }

  private handleToCursor(handle: HandlePosition): string {
    const map: Record<HandlePosition, string> = {
      'top-left': 'nwse-resize',
      'top-right': 'nesw-resize',
      'bottom-left': 'nesw-resize',
      'bottom-right': 'nwse-resize',
      'top': 'ns-resize',
      'bottom': 'ns-resize',
      'left': 'ew-resize',
      'right': 'ew-resize',
    };
    return map[handle] || 'default';
  }
}
