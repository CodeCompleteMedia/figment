// ============================================
// Layers Panel
// ============================================

import { useState, useRef } from 'react';
import { useEditorStore } from '../editor/store';
import type { SceneNode } from '../model/types';

export default function LayersPanel() {
  const nodes = useEditorStore(s => {
    const doc = s.document;
    const page = doc.pages.find(p => p.id === doc.activePage);
    return page?.nodes ?? [];
  });
  const selectedIds = useEditorStore(s => s.selectedIds);
  const select = useEditorStore(s => s.select);
  const updateNode = useEditorStore(s => s.updateNode);
  const tick = useEditorStore(s => s.tick);

  // Show nodes in reverse order (topmost layer first)
  const reversed = [...nodes].reverse();

  return (
    <div style={{
      width: 220, background: '#fff', borderLeft: '1px solid #ebe5df',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{
        padding: '12px 16px', fontSize: 12, fontWeight: 600,
        color: '#756a5f', borderBottom: '1px solid #ebe5df',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        Layers
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {reversed.length === 0 && (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            fontSize: 13, color: '#b8ada2', lineHeight: 1.6,
          }}>
            No layers yet.<br />
            Use the tools to create shapes.
          </div>
        )}

        {reversed.map((node) => (
          <LayerRow
            key={node.id}
            node={node}
            selected={selectedIds.includes(node.id)}
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
          />
        ))}
      </div>
    </div>
  );
}

function LayerRow({
  node,
  selected,
  onSelect,
  onToggleVisibility,
}: {
  node: SceneNode;
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onToggleVisibility: () => void;
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
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', cursor: 'pointer',
        background: selected ? '#f5f3ff' : 'transparent',
        borderLeft: selected ? '3px solid #7C5CFC' : '3px solid transparent',
        opacity: node.visible ? 1 : 0.4,
        transition: 'background 0.1s ease',
      }}
    >
      {/* Type icon */}
      <span style={{ fontSize: 14, color: '#968a7d', width: 20, textAlign: 'center', flexShrink: 0 }}>
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
            flex: 1, fontSize: 12, padding: '2px 4px', border: '1px solid #c4b5fd',
            borderRadius: 4, outline: 'none', fontFamily: 'inherit',
            background: '#fff', color: '#252220',
          }}
        />
      ) : (
        <span
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
          style={{
            flex: 1, fontSize: 12, color: selected ? '#3b2299' : '#5a514a',
            fontWeight: selected ? 500 : 400,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
          fontSize: 12, color: node.visible ? '#968a7d' : '#d8cfc6',
          padding: '2px 4px', borderRadius: 4, flexShrink: 0,
        }}
        title={node.visible ? 'Hide' : 'Show'}
      >
        {node.visible ? '👁' : '👁‍🗨'}
      </button>
    </div>
  );
}
