// ============================================
// Code Panel — live HTML/CSS output
// ============================================

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '../editor/store';
import { generateFullHTML } from '../export/code-generator';
import { highlightCode } from '../export/syntax-highlight';
import { generateClaudePrompt } from '../export/claude-prompt';
import type { FrameworkOption } from '../export/claude-prompt';

export default function CodePanel() {
  const nodes = useEditorStore(s => s.activePageNodes());
  const selectedIds = useEditorStore(s => s.selectedIds);
  const tick = useEditorStore(s => s.tick);
  const [toast, setToast] = useState<string | null>(null);
  const [claudeFramework, setClaudeFramework] = useState<FrameworkOption>('react');
  const codeRef = useRef<HTMLPreElement>(null);

  // Generate code — recalculate when nodes or selection change
  const code = useMemo(() => {
    return generateFullHTML(nodes, {
      title: 'Figment Export',
      includeReset: true,
      includeComments: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, selectedIds, tick]);

  // Highlighted React elements
  const highlighted = useMemo(() => highlightCode(code), [code]);

  // Line count
  const lineCount = useMemo(() => code.split('\n').length, [code]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Copied to clipboard');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied to clipboard');
    }
  }, [code]);

  // Export as .html file
  const handleExport = useCallback(() => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'figment-export.html';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported figment-export.html');
  }, [code]);

  // Send to Claude Code (copy prompt)
  const handleClaudeCode = useCallback(async () => {
    const prompt = generateClaudePrompt(nodes, {
      framework: claudeFramework,
      responsive: true,
    });
    try {
      await navigator.clipboard.writeText(prompt);
      showToast('Claude Code prompt copied — paste it into Claude Code');
    } catch {
      showToast('Failed to copy prompt');
    }
  }, [nodes, claudeFramework]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // Auto-scroll to show selected node's code
  useEffect(() => {
    if (selectedIds.length === 1 && codeRef.current) {
      const name = nodes.find(n => n.id === selectedIds[0])?.name;
      if (name) {
        // Search for the comment <!-- NodeName -->
        const text = codeRef.current.textContent ?? '';
        const searchStr = `<!-- ${name} -->`;
        const idx = text.indexOf(searchStr);
        if (idx !== -1) {
          // Rough scroll: estimate line position
          const linesBefore = text.slice(0, idx).split('\n').length;
          const lineHeight = 19; // approximate
          codeRef.current.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
        }
      }
    }
  }, [selectedIds, nodes]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#1e1b18',
      borderLeft: '1px solid #33302c',
      minWidth: 0,
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 6,
        borderBottom: '1px solid #33302c',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#968a7d', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          HTML + CSS
        </span>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: '#756a5f', marginRight: 4 }}>
          {lineCount} lines
        </span>

        <ToolButton onClick={handleCopy} title="Copy code to clipboard">
          Copy
        </ToolButton>

        <ToolButton onClick={handleExport} title="Download as .html file">
          Export
        </ToolButton>

        <Divider />

        {/* Claude Code section */}
        <select
          value={claudeFramework}
          onChange={e => setClaudeFramework(e.target.value as FrameworkOption)}
          title="Target framework for Claude Code"
          style={{
            background: '#2a2622',
            border: '1px solid #3d3733',
            borderRadius: 4,
            color: '#e8e0d8',
            fontSize: 11,
            padding: '2px 4px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="html">HTML</option>
          <option value="react">React</option>
          <option value="nextjs">Next.js</option>
          <option value="vue">Vue</option>
        </select>

        <ToolButton onClick={handleClaudeCode} title="Copy prompt for Claude Code" accent>
          Claude Code
        </ToolButton>
      </div>

      {/* Code display */}
      <pre
        ref={codeRef}
        style={{
          flex: 1,
          margin: 0,
          padding: '12px 0',
          overflow: 'auto',
          fontSize: 12,
          lineHeight: '19px',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
          color: '#e8e0d8',
          tabSize: 2,
          counterReset: 'line',
        }}
      >
        <code style={{ display: 'block' }}>
          {code.split('\n').map((line, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                padding: '0 16px 0 0',
                minHeight: 19,
              }}
            >
              <span style={{
                display: 'inline-block',
                width: 48,
                textAlign: 'right',
                paddingRight: 16,
                color: '#4a433d',
                userSelect: 'none',
                flexShrink: 0,
                fontSize: 11,
              }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, whiteSpace: 'pre' }}>
                {highlightCode(line)}
              </span>
            </div>
          ))}
        </code>
      </pre>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#7C5CFC',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 100,
          animation: 'fadeInUp 0.2s ease',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────

function ToolButton({
  children,
  onClick,
  title,
  accent = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: accent ? '#7C5CFC' : '#2a2622',
        border: accent ? 'none' : '1px solid #3d3733',
        borderRadius: 4,
        color: accent ? '#fff' : '#e8e0d8',
        fontSize: 11,
        fontWeight: 500,
        padding: '3px 8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 16, background: '#3d3733', margin: '0 2px' }} />;
}
