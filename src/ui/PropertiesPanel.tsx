// ============================================
// Properties Panel
// ============================================

import { useEditorStore } from '../editor/store';
import type { SceneNode, RectangleNode } from '../model/types';
import { colorToHex, cssToColor } from '../model/types';

export default function PropertiesPanel() {
  const selectedIds = useEditorStore(s => s.selectedIds);
  const nodes = useEditorStore(s => {
    const doc = s.document;
    const page = doc.pages.find(p => p.id === doc.activePage);
    return page?.nodes ?? [];
  });
  const updateNode = useEditorStore(s => s.updateNode);
  const tick = useEditorStore(s => s.tick);

  const selectedNode = selectedIds.length === 1
    ? nodes.find(n => n.id === selectedIds[0])
    : null;

  if (!selectedNode) {
    return (
      <div style={{
        width: 240, background: '#fff', borderLeft: '1px solid #ebe5df',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{
          padding: '12px 16px', fontSize: 12, fontWeight: 600,
          color: '#756a5f', borderBottom: '1px solid #ebe5df',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Properties
        </div>
        <div style={{
          padding: '32px 16px', textAlign: 'center',
          fontSize: 13, color: '#b8ada2', lineHeight: 1.6,
        }}>
          {selectedIds.length > 1 ? 'Multiple selection' : 'Select a layer to edit its properties'}
        </div>
      </div>
    );
  }

  const update = (updates: Partial<SceneNode>) => {
    updateNode(selectedNode.id, updates);
  };

  return (
    <div style={{
      width: 240, background: '#fff', borderLeft: '1px solid #ebe5df',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      overflow: 'auto',
    }}>
      <div style={{
        padding: '12px 16px', fontSize: 12, fontWeight: 600,
        color: '#756a5f', borderBottom: '1px solid #ebe5df',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        Properties
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Position */}
        <PropSection title="Position">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberField label="X" value={Math.round(selectedNode.x)} onChange={v => update({ x: v })} />
            <NumberField label="Y" value={Math.round(selectedNode.y)} onChange={v => update({ y: v })} />
          </div>
        </PropSection>

        {/* Size */}
        <PropSection title="Size">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberField label="W" value={Math.round(selectedNode.width)} onChange={v => update({ width: Math.max(1, v) })} />
            <NumberField label="H" value={Math.round(selectedNode.height)} onChange={v => update({ height: Math.max(1, v) })} />
          </div>
        </PropSection>

        {/* Border Radius (rects only) */}
        {selectedNode.type === 'rectangle' && (
          <PropSection title="Corner Radius">
            <NumberField
              label="R"
              value={(selectedNode as RectangleNode).borderRadius}
              onChange={v => update({ borderRadius: Math.max(0, v) } as any)}
            />
          </PropSection>
        )}

        {/* Opacity */}
        <PropSection title="Opacity">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              min={0} max={100} step={1}
              value={Math.round(selectedNode.opacity * 100)}
              onChange={e => update({ opacity: parseInt(e.target.value) / 100 })}
              style={{ flex: 1, accentColor: '#7C5CFC' }}
            />
            <span style={{ fontSize: 12, color: '#5a514a', fontFamily: 'monospace', width: 36, textAlign: 'right' }}>
              {Math.round(selectedNode.opacity * 100)}%
            </span>
          </div>
        </PropSection>

        {/* Fill */}
        <PropSection title="Fill">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={selectedNode.fill.visible}
              onChange={e => update({ fill: { ...selectedNode.fill, visible: e.target.checked } })}
              style={{ accentColor: '#7C5CFC' }}
            />
            <input
              type="color"
              value={colorToHex(selectedNode.fill.color)}
              onChange={e => update({ fill: { ...selectedNode.fill, color: cssToColor(e.target.value), visible: true } })}
              style={{ width: 32, height: 24, border: '1px solid #ebe5df', borderRadius: 4, cursor: 'pointer', padding: 0 }}
            />
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#756a5f' }}>
              {colorToHex(selectedNode.fill.color).toUpperCase()}
            </span>
          </div>
        </PropSection>

        {/* Stroke */}
        <PropSection title="Stroke">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={selectedNode.stroke.visible}
              onChange={e => update({ stroke: { ...selectedNode.stroke, visible: e.target.checked } })}
              style={{ accentColor: '#7C5CFC' }}
            />
            <input
              type="color"
              value={colorToHex(selectedNode.stroke.color)}
              onChange={e => update({ stroke: { ...selectedNode.stroke, color: cssToColor(e.target.value), visible: true } })}
              style={{ width: 32, height: 24, border: '1px solid #ebe5df', borderRadius: 4, cursor: 'pointer', padding: 0 }}
            />
            <NumberField
              label="W"
              value={selectedNode.stroke.width}
              onChange={v => update({ stroke: { ...selectedNode.stroke, width: Math.max(0, v), visible: true } })}
            />
          </div>
        </PropSection>
      </div>
    </div>
  );
}

function PropSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: '#968a7d',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 6,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function NumberField({
  label, value, onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#968a7d', fontWeight: 500, width: 14 }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        style={{
          width: '100%', padding: '5px 6px', fontSize: 12,
          border: '1px solid #ebe5df', borderRadius: 6,
          outline: 'none', fontFamily: 'monospace',
          background: '#fbf9f7', color: '#3d3733',
        }}
        onFocus={e => e.target.style.borderColor = '#c4b5fd'}
        onBlur={e => e.target.style.borderColor = '#ebe5df'}
      />
    </div>
  );
}
