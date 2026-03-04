// ============================================
// Top Bar — title, undo/redo, view toggle, export
// ============================================

import { useEditorStore } from '../editor/store';
import type { ViewMode } from '../editor/store';
import { useTheme } from './theme';

export default function TopBar() {
  const history = useEditorStore(s => s.history);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const showGrid = useEditorStore(s => s.showGrid);
  const toggleGrid = useEditorStore(s => s.toggleGrid);
  const exportJSON = useEditorStore(s => s.exportJSON);
  const importJSON = useEditorStore(s => s.importJSON);
  const viewMode = useEditorStore(s => s.viewMode);
  const setViewMode = useEditorStore(s => s.setViewMode);
  const theme = useEditorStore(s => s.theme);
  const toggleTheme = useEditorStore(s => s.toggleTheme);
  const tick = useEditorStore(s => s.tick);
  const t = useTheme();

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
      height: 44, background: t.panelBg,
      borderBottom: `1px solid ${t.panelBorder}`,
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 8,
      flexShrink: 0,
    }}>
      {/* Title */}
      <span style={{ fontSize: 14, fontWeight: 600, color: t.panelText, letterSpacing: '-0.01em' }}>
        Figment
      </span>
      <span style={{ fontSize: 12, color: t.panelTextMuted, marginLeft: 4 }}>
        Untitled
      </span>

      <div style={{ flex: 1 }} />

      {/* Undo/Redo */}
      <BarButton onClick={undo} title="Undo (Ctrl+Z)" disabled={!history.canUndo} t={t}>↩</BarButton>
      <BarButton onClick={redo} title="Redo (Ctrl+Y)" disabled={!history.canRedo} t={t}>↪</BarButton>

      <Separator color={t.separatorColor} />

      {/* Grid */}
      <BarButton onClick={toggleGrid} title="Toggle Grid (G)" active={showGrid} t={t}>⊞</BarButton>

      <Separator color={t.separatorColor} />

      {/* View Mode Toggle */}
      <ViewModeToggle mode={viewMode} onChange={setViewMode} t={t} />

      <Separator color={t.separatorColor} />

      {/* Theme toggle */}
      <BarButton onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} t={t}>
        {theme === 'light' ? '🌙' : '☀️'}
      </BarButton>

      <Separator color={t.separatorColor} />

      {/* File operations */}
      <BarButton onClick={handleImportJSON} title="Open File" t={t}>📂</BarButton>
      <BarButton onClick={handleExportJSON} title="Save as JSON" t={t}>💾</BarButton>
    </div>
  );
}

// ── View Mode Segmented Control ────────────

function ViewModeToggle({
  mode,
  onChange,
  t,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  t: ReturnType<typeof useTheme>;
}) {
  const modes: { value: ViewMode; label: string; title: string }[] = [
    { value: 'design', label: 'Design', title: 'Design only' },
    { value: 'split', label: 'Split', title: 'Design + Code side by side' },
    { value: 'code', label: 'Code', title: 'Code only' },
  ];

  return (
    <div style={{
      display: 'flex',
      background: t.segmentBg,
      borderRadius: 6,
      padding: 2,
      gap: 1,
    }}>
      {modes.map(m => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          title={m.title}
          style={{
            background: mode === m.value ? t.segmentActiveBg : 'transparent',
            border: 'none',
            borderRadius: 4,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: mode === m.value ? 600 : 400,
            color: mode === m.value ? t.accent : t.panelTextSecondary,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: mode === m.value ? t.segmentActiveShadow : 'none',
            fontFamily: 'inherit',
            letterSpacing: '-0.01em',
          }}
        >
          {m.value === 'split' ? '<⟩' : m.value === 'code' ? '</>' : ''}
          {' '}{m.label}
        </button>
      ))}
    </div>
  );
}

// ── Shared Components ──────────────────────

function BarButton({
  children, onClick, title, disabled = false, active = false, t,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        background: active ? t.accentBg : 'none',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        fontSize: 16, padding: '4px 8px', borderRadius: 6,
        color: disabled ? t.disabledColor : active ? t.accent : t.panelTextSecondary,
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.1s ease',
      }}
    >
      {children}
    </button>
  );
}

function Separator({ color }: { color: string }) {
  return <div style={{ width: 1, height: 20, background: color, margin: '0 4px' }} />;
}
