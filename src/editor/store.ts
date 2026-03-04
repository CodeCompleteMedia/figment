// ============================================
// Figment Editor Store (Zustand)
// ============================================

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  SceneNode, ToolType, Viewport, Point, FigmentDocument, Page,
} from '../model/types';
import {
  CommandHistory, AddNodeCommand, DeleteNodesCommand,
  MoveNodesCommand, UpdateNodeCommand, ReorderNodeCommand,
} from '../model/commands';
import { createRectangle, createEllipse, createLine, duplicateNode } from '../model/factory';

export type ViewMode = 'design' | 'split' | 'code';

/** Lightweight shape preview shown during drag-to-create */
export interface PreviewShape {
  type: 'rectangle' | 'ellipse' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditorState {
  // Document
  document: FigmentDocument;
  activePageNodes: () => SceneNode[];

  // Selection
  selectedIds: string[];
  hoveredId: string | null;

  // Tool
  activeTool: ToolType;

  // Preview shape (during drag-to-create)
  previewShape: PreviewShape | null;

  // Viewport
  viewport: Viewport;

  // Grid
  showGrid: boolean;

  // View mode (design / split / code)
  viewMode: ViewMode;

  // Command history
  history: CommandHistory;

  // Actions
  setTool: (tool: ToolType) => void;
  setViewport: (v: Partial<Viewport>) => void;
  toggleGrid: () => void;
  setViewMode: (mode: ViewMode) => void;
  setPreviewShape: (preview: PreviewShape | null) => void;

  // Selection actions
  select: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setHovered: (id: string | null) => void;

  // Node CRUD
  addNode: (type: 'rectangle' | 'ellipse' | 'line', x: number, y: number, w: number, h: number) => SceneNode;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  updateNode: (id: string, updates: Partial<SceneNode>) => void;
  moveNodes: (ids: string[], dx: number, dy: number) => void;
  reorderNode: (fromIndex: number, toIndex: number) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;

  // Serialization
  exportJSON: () => string;
  importJSON: (json: string) => void;

  // Force re-render
  tick: number;
  requestRender: () => void;
}

function createDefaultDocument(): FigmentDocument {
  const pageId = uuidv4();
  return {
    id: uuidv4(),
    name: 'Untitled',
    pages: [{
      id: pageId,
      name: 'Page 1',
      nodes: [],
    }],
    activePage: pageId,
  };
}

export const useEditorStore = create<EditorState>((set, get) => {
  const history = new CommandHistory();

  return {
    document: createDefaultDocument(),
    selectedIds: [],
    hoveredId: null,
    activeTool: 'select',
    previewShape: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    showGrid: true,
    viewMode: 'design' as ViewMode,
    history,
    tick: 0,

    activePageNodes: () => {
      const doc = get().document;
      const page = doc.pages.find(p => p.id === doc.activePage);
      return page?.nodes ?? [];
    },

    setTool: (tool) => set({ activeTool: tool }),

    setViewport: (v) => set(s => ({ viewport: { ...s.viewport, ...v } })),

    toggleGrid: () => set(s => ({ showGrid: !s.showGrid })),

    setViewMode: (mode) => set({ viewMode: mode }),

    setPreviewShape: (preview) => set({ previewShape: preview }),

    select: (ids) => set(s => ({ selectedIds: ids, tick: s.tick + 1 })),
    selectAll: () => {
      const nodes = get().activePageNodes();
      set(s => ({ selectedIds: nodes.map(n => n.id), tick: s.tick + 1 }));
    },
    clearSelection: () => set(s => ({ selectedIds: [], tick: s.tick + 1 })),
    setHovered: (id) => set(s => ({ hoveredId: id, tick: s.tick + 1 })),

    addNode: (type, x, y, w, h) => {
      const nodes = get().activePageNodes();
      let node: SceneNode;
      if (type === 'rectangle') node = createRectangle(x, y, w, h);
      else if (type === 'ellipse') node = createEllipse(x, y, w, h);
      else node = createLine(x, y, w, h);

      history.execute(new AddNodeCommand(nodes, node));
      set(s => ({ tick: s.tick + 1, selectedIds: [node.id], activeTool: 'select' }));
      return node;
    },

    deleteSelected: () => {
      const { selectedIds } = get();
      if (selectedIds.length === 0) return;
      const nodes = get().activePageNodes();
      history.execute(new DeleteNodesCommand(nodes, [...selectedIds]));
      set(s => ({ tick: s.tick + 1, selectedIds: [] }));
    },

    duplicateSelected: () => {
      const { selectedIds } = get();
      const nodes = get().activePageNodes();
      const newIds: string[] = [];
      for (const id of selectedIds) {
        const original = nodes.find(n => n.id === id);
        if (original) {
          const clone = duplicateNode(original);
          history.execute(new AddNodeCommand(nodes, clone));
          newIds.push(clone.id);
        }
      }
      set(s => ({ tick: s.tick + 1, selectedIds: newIds }));
    },

    updateNode: (id, updates) => {
      const nodes = get().activePageNodes();
      history.execute(new UpdateNodeCommand(nodes, id, updates));
      set(s => ({ tick: s.tick + 1 }));
    },

    moveNodes: (ids, dx, dy) => {
      const nodes = get().activePageNodes();
      history.execute(new MoveNodesCommand(nodes, ids, dx, dy));
      set(s => ({ tick: s.tick + 1 }));
    },

    reorderNode: (fromIndex, toIndex) => {
      const nodes = get().activePageNodes();
      history.execute(new ReorderNodeCommand(nodes, fromIndex, toIndex));
      set(s => ({ tick: s.tick + 1 }));
    },

    undo: () => {
      if (history.undo()) set(s => ({ tick: s.tick + 1 }));
    },

    redo: () => {
      if (history.redo()) set(s => ({ tick: s.tick + 1 }));
    },

    exportJSON: () => {
      return JSON.stringify(get().document, null, 2);
    },

    importJSON: (json) => {
      try {
        const doc = JSON.parse(json) as FigmentDocument;
        history.clear();
        set({ document: doc, selectedIds: [], tick: 0 });
      } catch (e) {
        console.error('Failed to import document:', e);
      }
    },

    requestRender: () => set(s => ({ tick: s.tick + 1 })),
  };
});
