// ============================================
// Editor Shell — main layout
// ============================================

import { useState, useEffect } from 'react';
import { initEngine } from '../wasm/engine';
import Toolbar from './Toolbar';
import TopBar from './TopBar';
import CanvasView from './Canvas';
import LayersPanel from './LayersPanel';
import PropertiesPanel from './PropertiesPanel';

export default function EditorShell() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initEngine()
      .then(() => setLoading(false))
      .catch((err) => {
        console.error('Failed to init CanvasKit:', err);
        setError('Failed to initialize rendering engine. Please refresh.');
        setLoading(false);
      });
  }, []);

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
        <CanvasView />
        <LayersPanel />
        <PropertiesPanel />
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f3ff, #fff5f3, #fffbf0)',
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
      <div style={{ fontSize: 18, fontWeight: 600, color: '#3d3733', letterSpacing: '-0.02em' }}>
        Figment
      </div>
      <div style={{ fontSize: 13, color: '#968a7d' }}>
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
  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#fbf9f7',
      fontFamily: "Inter, -apple-system, sans-serif",
      gap: 12,
    }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <div style={{ fontSize: 15, color: '#c43d27', fontWeight: 500 }}>{message}</div>
    </div>
  );
}
