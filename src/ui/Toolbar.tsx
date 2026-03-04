// ============================================
// Toolbar Component
// ============================================

import { useEditorStore } from '../editor/store';
import { ToolType } from '../model/types';

const tools: { type: ToolType; label: string; icon: string; shortcut: string }[] = [
  { type: 'select', label: 'Select', icon: '↖', shortcut: 'V' },
  { type: 'rectangle', label: 'Rectangle', icon: '▭', shortcut: 'R' },
  { type: 'ellipse', label: 'Ellipse', icon: '◯', shortcut: 'O' },
  { type: 'line', label: 'Line', icon: '╱', shortcut: 'L' },
];

export default function Toolbar() {
  const activeTool = useEditorStore(s => s.activeTool);
  const setTool = useEditorStore(s => s.setTool);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '12px 8px',
      background: '#fff',
      borderRight: '1px solid #ebe5df',
      width: 48,
      flexShrink: 0,
      alignItems: 'center',
    }}>
      {/* Logo */}
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#7C5CFC', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700,
        marginBottom: 12,
      }}>
        F
      </div>

      {tools.map(tool => (
        <button
          key={tool.type}
          onClick={() => setTool(tool.type)}
          title={`${tool.label} (${tool.shortcut})`}
          style={{
            width: 36, height: 36, borderRadius: 8,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
            background: activeTool === tool.type ? '#f5f3ff' : 'transparent',
            color: activeTool === tool.type ? '#7C5CFC' : '#756a5f',
            transition: 'all 0.1s ease',
          }}
        >
          {tool.icon}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Zoom display */}
      <ZoomIndicator />
    </div>
  );
}

function ZoomIndicator() {
  const zoom = useEditorStore(s => s.viewport.zoom);
  return (
    <div style={{
      fontSize: 10, color: '#968a7d', textAlign: 'center',
      fontFamily: 'monospace', padding: '4px 0',
    }}>
      {Math.round(zoom * 100)}%
    </div>
  );
}
