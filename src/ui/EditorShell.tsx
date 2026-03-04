// ============================================
// Editor Shell — main layout
// ============================================

import { useState, useEffect } from 'react';
import { initEngine } from '../wasm/engine';
import { useEditorStore } from '../editor/store';
import { useTheme } from './theme';
import Toolbar from './Toolbar';
import TopBar from './TopBar';
import CanvasView from './Canvas';
import LayersPanel from './LayersPanel';
import PropertiesPanel from './PropertiesPanel';
import CodePanel from './CodePanel';

export default function EditorShell() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewMode = useEditorStore(s => s.viewMode);
  const theme = useEditorStore(s => s.theme);
  const t = useTheme();

  useEffect(() => {
    initEngine()
      .then(() => setLoading(false))
      .catch((err) => {
        console.error('Failed to init CanvasKit:', err);
        setError('Failed to initialize rendering engine. Please refresh.');
        setLoading(false);
      });
  }, []);

  // Apply data-theme attribute and scrollbar styles to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--scrollbar-track', t.scrollbarTrack);
    document.documentElement.style.setProperty('--scrollbar-thumb', t.scrollbarThumb);
  }, [theme, t]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflow: 'hidden',
    }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Toolbar />

        {/* Canvas — visible in 'design' and 'split' modes */}
        {viewMode !== 'code' && <CanvasView />}

        {/* Code Panel — visible in 'split' and 'code' modes */}
        {viewMode !== 'design' && <CodePanel />}

        <LayersPanel />
        <PropertiesPanel />
      </div>
    </div>
  );
}

function LoadingScreen() {
  const t = useTheme();
  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: t.loadingGradient,
      fontFamily: "Inter, -apple-system, sans-serif",
      gap: 16,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: '#7C5CFC', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 24, fontWeight: 700,
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        F
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: t.loadingText, letterSpacing: '-0.02em' }}>
        Figment
      </div>
      <div style={{ fontSize: 13, color: t.panelTextSecondary }}>
        Loading rendering engine...
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  const t = useTheme();
  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: t.errorBg,
      fontFamily: "Inter, -apple-system, sans-serif",
      gap: 12,
    }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <div style={{ fontSize: 15, color: t.errorText, fontWeight: 500 }}>{message}</div>
    </div>
  );
}
