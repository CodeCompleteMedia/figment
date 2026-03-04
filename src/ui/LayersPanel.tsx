// ============================================
// Layers Panel — with drag-to-reorder
// ============================================

import { useState, useRef, useCallback } from 'react';
import { useEditorStore } from '../editor/store';
import type { SceneNode } from '../model/types';
import { useTheme } from './theme';
import type { ThemeTokens } from './theme';

/** Drag state tracked at the panel level */
interface DragState {
  /** ID of the node being dragged */
  nodeId: string;
  /** Current visual index the drop indicator sits at (in reversed list) */
  overVisualIndex: number;
}

export default function LayersPanel() {
  const nodes = useEditorStore(s => {
    const doc = s.document;
    const page = doc.pages.find(p => p.id === doc.activePage);
    return page?.nodes ?? [];
  });
  const selectedIds = useEditorStore(s => s.selectedIds);
  const select = useEditorStore(s => s.select);
  const updateNode = useEditorStore(s => s.updateNode);
  const reorderNode = useEditorStore(s => s.reorderNode);
  const tick = useEditorStore(s => s.tick);
  const t = useTheme();

  const [drag, setDrag] = useState<DragState | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Show nodes in reverse order (topmost layer first)
  const reversed = [...nodes].reverse();

  /**
   * Convert a visual index in the reversed list to the actual index in the nodes array.
   * reversed[visualIdx] == nodes[nodes.length - 1 - visualIdx]
   */
  const visualToActual = useCallback((visualIdx: number) => {
    return nodes.length - 1 - visualIdx;
  }, [nodes.length]);

  const handleDragStart = useCallback((nodeId: string) => {
    const visualIdx = reversed.findIndex(n => n.id === nodeId);
    setDrag({ nodeId, overVisualIndex: visualIdx });
  }, [reversed]);

  const handleDragOver = useCallback((visualIdx: number) => {
    setDrag(prev => {
      if (!prev) return prev;
      if (prev.overVisualIndex === visualIdx) return prev;
      return { ...prev, overVisualIndex: visualIdx };
    });
  }, []);

  const handleDrop = useCallback(() => {
    if (!drag) return;

    const fromVisualIdx = reversed.findIndex(n => n.id === drag.nodeId);
    const toVisualIdx = drag.overVisualIndex;

    if (fromVisualIdx !== toVisualIdx && fromVisualIdx !== -1) {
      // Convert visual indices to actual node array indices
      const fromActual = visualToActual(fromVisualIdx);
      const toActual = visualToActual(toVisualIdx);
      reorderNode(fromActual, toActual);
    }

    setDrag(null);
  }, [drag, reversed, visualToActual, reorderNode]);

  const handleDragEnd = useCallback(() => {
    setDrag(null);
  }, []);

  return (
    <div style={{
      width: 220, background: t.panelBg, borderLeft: `1px solid ${t.panelBorder}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{
        padding: '12px 16px', fontSize: 12, fontWeight: 600,
        color: t.panelTextSecondary, borderBottom: `1px solid ${t.panelBorder}`,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        Layers
      </div>

      <div ref={listRef} style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {reversed.length === 0 && (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            fontSize: 13, color: t.panelTextMuted, lineHeight: 1.6,
          }}>
            No layers yet.<br />
            Use the tools to create shapes.
          </div>
        )}

        {reversed.map((node, visualIdx) => (
          <LayerRow
            key={node.id}
            node={node}
            visualIndex={visualIdx}
            selected={selectedIds.includes(node.id)}
            isDragging={drag?.nodeId === node.id}
            isDropTarget={drag !== null && drag.overVisualIndex === visualIdx && drag.nodeId !== node.id}
            t={t}
            onSelect={(e) => {
              if (e.shiftKey) {
                const ids = selectedIds.includes(node.id)
                  ? selectedIds.filter(id => id !== node.id)
                  : [...selectedIds, node.id];
                select(ids);
              } else {
                select([node.id]);
              }
            }}
            onToggleVisibility={() => {
              updateNode(node.id, { visible: !node.visible });
            }}
            onDragStart={() => handleDragStart(node.id)}
            onDragOver={() => handleDragOver(visualIdx)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

function LayerRow({
  node,
  visualIndex,
  selected,
  isDragging,
  isDropTarget,
  onSelect,
  onToggleVisibility,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  t,
}: {
  node: SceneNode;
  visualIndex: number;
  selected: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onToggleVisibility: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  t: ThemeTokens;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNode = useEditorStore(s => s.updateNode);

  const typeIcons: Record<string, string> = {
    rectangle: '▭',
    ellipse: '◯',
    line: '╱',
  };

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => {
        // Set minimal drag data (required for Firefox)
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', node.id);
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', cursor: editing ? 'text' : 'grab',
        background: selected ? t.layerSelectedBg : 'transparent',
        borderLeft: selected ? `3px solid ${t.layerSelectedBorder}` : '3px solid transparent',
        opacity: isDragging ? 0.35 : node.visible ? 1 : 0.4,
        transition: 'background 0.1s ease, opacity 0.15s ease',
        position: 'relative',
        borderTop: isDropTarget ? `2px solid ${t.accent}` : '2px solid transparent',
      }}
    >
      {/* Drag handle */}
      <span
        style={{
          fontSize: 10, color: t.panelTextMuted, cursor: 'grab',
          width: 12, textAlign: 'center', flexShrink: 0,
          userSelect: 'none',
        }}
        title="Drag to reorder"
      >
        ⠿
      </span>

      {/* Type icon */}
      <span style={{ fontSize: 14, color: t.panelTextSecondary, width: 20, textAlign: 'center', flexShrink: 0 }}>
        {typeIcons[node.type] || '?'}
      </span>

      {/* Name */}
      {editing ? (
        <input
          ref={inputRef}
          defaultValue={node.name}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const val = e.currentTarget.value.trim();
            if (val && val !== node.name) {
              updateNode(node.id, { name: val });
            }
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          style={{
            flex: 1, fontSize: 12, padding: '2px 4px', border: `1px solid ${t.inputBorderFocus}`,
            borderRadius: 4, outline: 'none', fontFamily: 'inherit',
            background: t.layerNameEditBg, color: t.panelText,
          }}
        />
      ) : (
        <span
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
          style={{
            flex: 1, fontSize: 12, color: selected ? t.accentTextSelected : t.panelTextSecondary,
            fontWeight: selected ? 500 : 400,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            userSelect: 'none',
          }}
        >
          {node.name}
        </span>
      )}

      {/* Visibility toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: node.visible ? t.panelTextSecondary : t.disabledColor,
          padding: '2px 4px', borderRadius: 4, flexShrink: 0,
        }}
        title={node.visible ? 'Hide' : 'Show'}
      >
        {node.visible ? '👁' : '👁‍🗨'}
      </button>
    </div>
  );
}
