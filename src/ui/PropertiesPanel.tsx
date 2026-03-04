// ============================================
// Properties Panel
// ============================================

import { useEditorStore } from '../editor/store';
import type { SceneNode, RectangleNode } from '../model/types';
import { colorToHex, cssToColor } from '../model/types';
import { useTheme } from './theme';
import type { ThemeTokens } from './theme';

export default function PropertiesPanel() {
  const selectedIds = useEditorStore(s => s.selectedIds);
  const nodes = useEditorStore(s => {
    const doc = s.document;
    const page = doc.pages.find(p => p.id === doc.activePage);
    return page?.nodes ?? [];
  });
  const updateNode = useEditorStore(s => s.updateNode);
  const tick = useEditorStore(s => s.tick);
  const t = useTheme();

  const selectedNode = selectedIds.length === 1
    ? nodes.find(n => n.id === selectedIds[0])
    : null;

  if (!selectedNode) {
    return (
      <div style={{
        width: 240, background: t.panelBg, borderLeft: `1px solid ${t.panelBorder}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{
          padding: '12px 16px', fontSize: 12, fontWeight: 600,
          color: t.panelTextSecondary, borderBottom: `1px solid ${t.panelBorder}`,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Properties
        </div>
        <div style={{
          padding: '32px 16px', textAlign: 'center',
          fontSize: 13, color: t.panelTextMuted, lineHeight: 1.6,
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
      width: 240, background: t.panelBg, borderLeft: `1px solid ${t.panelBorder}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      overflow: 'auto',
    }}>
      <div style={{
        padding: '12px 16px', fontSize: 12, fontWeight: 600,
        color: t.panelTextSecondary, borderBottom: `1px solid ${t.panelBorder}`,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        Properties
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Position */}
        <PropSection title="Position" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberField label="X" value={Math.round(selectedNode.x)} onChange={v => update({ x: v })} t={t} />
            <NumberField label="Y" value={Math.round(selectedNode.y)} onChange={v => update({ y: v })} t={t} />
          </div>
        </PropSection>

        {/* Size */}
        <PropSection title="Size" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberField label="W" value={Math.round(selectedNode.width)} onChange={v => update({ width: Math.max(1, v) })} t={t} />
            <NumberField label="H" value={Math.round(selectedNode.height)} onChange={v => update({ height: Math.max(1, v) })} t={t} />
          </div>
        </PropSection>

        {/* Border Radius (rects only) */}
        {selectedNode.type === 'rectangle' && (
          <PropSection title="Corner Radius" t={t}>
            <NumberField
              label="R"
              value={(selectedNode as RectangleNode).borderRadius}
              onChange={v => update({ borderRadius: Math.max(0, v) } as any)}
              t={t}
            />
          </PropSection>
        )}

        {/* Opacity */}
        <PropSection title="Opacity" t={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              min={0} max={100} step={1}
              value={Math.round(selectedNode.opacity * 100)}
              onChange={e => update({ opacity: parseInt(e.target.value) / 100 })}
              style={{ flex: 1, accentColor: t.accent }}
            />
            <span style={{ fontSize: 12, color: t.panelTextSecondary, fontFamily: 'monospace', width: 36, textAlign: 'right' }}>
              {Math.round(selectedNode.opacity * 100)}%
            </span>
          </div>
        </PropSection>

        {/* Fill */}
        <PropSection title="Fill" t={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={selectedNode.fill.visible}
              onChange={e => update({ fill: { ...selectedNode.fill, visible: e.target.checked } })}
              style={{ accentColor: t.accent }}
            />
            <input
              type="color"
              value={colorToHex(selectedNode.fill.color)}
              onChange={e => update({ fill: { ...selectedNode.fill, color: cssToColor(e.target.value), visible: true } })}
              style={{ width: 32, height: 24, border: `1px solid ${t.inputBorder}`, borderRadius: 4, cursor: 'pointer', padding: 0 }}
            />
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: t.panelTextSecondary }}>
              {colorToHex(selectedNode.fill.color).toUpperCase()}
            </span>
          </div>
        </PropSection>

        {/* Stroke */}
        <PropSection title="Stroke" t={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={selectedNode.stroke.visible}
              onChange={e => update({ stroke: { ...selectedNode.stroke, visible: e.target.checked } })}
              style={{ accentColor: t.accent }}
            />
            <input
              type="color"
              value={colorToHex(selectedNode.stroke.color)}
              onChange={e => update({ stroke: { ...selectedNode.stroke, color: cssToColor(e.target.value), visible: true } })}
              style={{ width: 32, height: 24, border: `1px solid ${t.inputBorder}`, borderRadius: 4, cursor: 'pointer', padding: 0 }}
            />
            <NumberField
              label="W"
              value={selectedNode.stroke.width}
              onChange={v => update({ stroke: { ...selectedNode.stroke, width: Math.max(0, v), visible: true } })}
              t={t}
            />
          </div>
        </PropSection>
      </div>
    </div>
  );
}

function PropSection({ title, children, t }: { title: string; children: React.ReactNode; t: ThemeTokens }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: t.panelTextSecondary,
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
  label, value, onChange, t,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  t: ThemeTokens;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, color: t.panelTextSecondary, fontWeight: 500, width: 14 }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        style={{
          width: '100%', padding: '5px 6px', fontSize: 12,
          border: `1px solid ${t.inputBorder}`, borderRadius: 6,
          outline: 'none', fontFamily: 'monospace',
          background: t.inputBg, color: t.inputText,
        }}
        onFocus={e => e.target.style.borderColor = t.inputBorderFocus}
        onBlur={e => e.target.style.borderColor = t.inputBorder}
      />
    </div>
  );
}
