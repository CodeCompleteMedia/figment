// ============================================
// Top Bar — title, undo/redo, export
// ============================================

import { useEditorStore } from '../editor/store';

export default function TopBar() {
  const history = useEditorStore(s => s.history);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const showGrid = useEditorStore(s => s.showGrid);
  const toggleGrid = useEditorStore(s => s.toggleGrid);
  const exportJSON = useEditorStore(s => s.exportJSON);
  const importJSON = useEditorStore(s => s.importJSON);
  const tick = useEditorStore(s => s.tick);

  const handleExportJSON = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'figment-document.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.figment';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      importJSON(text);
    };
    input.click();
  };

  return (
    <div style={{
      height: 44, background: '#fff',
      borderBottom: '1px solid #ebe5df',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 8,
      flexShrink: 0,
    }}>
      {/* Title */}
      <span style={{ fontSize: 14, fontWeight: 600, color: '#3d3733', letterSpacing: '-0.01em' }}>
        Figment
      </span>
      <span style={{ fontSize: 12, color: '#b8ada2', marginLeft: 4 }}>
        Untitled
      </span>

      <div style={{ flex: 1 }} />

      {/* Undo/Redo */}
      <BarButton onClick={undo} title="Undo (Ctrl+Z)" disabled={!history.canUndo}>↩</BarButton>
      <BarButton onClick={redo} title="Redo (Ctrl+Y)" disabled={!history.canRedo}>↪</BarButton>

      <Separator />

      {/* Grid */}
      <BarButton onClick={toggleGrid} title="Toggle Grid (G)" active={showGrid}>⊞</BarButton>

      <Separator />

      {/* File operations */}
      <BarButton onClick={handleImportJSON} title="Open File">📂</BarButton>
      <BarButton onClick={handleExportJSON} title="Save as JSON">💾</BarButton>
    </div>
  );
}

function BarButton({
  children, onClick, title, disabled = false, active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        background: active ? '#f5f3ff' : 'none',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        fontSize: 16, padding: '4px 8px', borderRadius: 6,
        color: disabled ? '#d8cfc6' : active ? '#7C5CFC' : '#756a5f',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.1s ease',
      }}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div style={{ width: 1, height: 20, background: '#ebe5df', margin: '0 4px' }} />;
}
