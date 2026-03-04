// ============================================
// Code Generator — SceneNode[] → HTML + CSS
// ============================================

import type { SceneNode, RectangleNode, Color } from '../model/types';
import { colorToHex } from '../model/types';

// ── Options ────────────────────────────────

export interface CodeGenOptions {
  title?: string;
  includeReset?: boolean;
  includeComments?: boolean;
}

// ── Public API ─────────────────────────────

/**
 * Generate a complete, self-contained HTML document from scene nodes.
 */
export function generateFullHTML(
  nodes: SceneNode[],
  options: CodeGenOptions = {},
): string {
  const {
    title = 'Figment Export',
    includeReset = true,
    includeComments = true,
  } = options;

  const visibleNodes = nodes.filter(n => n.visible);
  const css = generatePageCSS(visibleNodes, { includeReset, includeComments });
  const body = visibleNodes.map(n => generateNodeHTML(n, includeComments)).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
${indent(css, 4)}
  </style>
</head>
<body>
  <div class="figment-canvas">
    ${body}
  </div>
</body>
</html>`;
}

/**
 * Generate CSS for an entire page of nodes.
 */
export function generatePageCSS(
  nodes: SceneNode[],
  options: { includeReset?: boolean; includeComments?: boolean } = {},
): string {
  const { includeReset = true, includeComments = true } = options;
  const parts: string[] = [];

  if (includeReset) {
    if (includeComments) parts.push('/* Reset */');
    parts.push(`*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}`);
    parts.push('');
  }

  // Canvas container
  if (includeComments) parts.push('/* Canvas */');
  parts.push(`.figment-canvas {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: #fbf9f7;
}`);
  parts.push('');

  // Track used class names for deduplication
  const usedNames = new Map<string, number>();

  for (const node of nodes) {
    const className = uniqueClassName(node, usedNames);
    if (includeComments) parts.push(`/* ${escapeHTML(node.name)} */`);
    parts.push(generateNodeCSSBlock(node, className));
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Generate the HTML element for a single node.
 */
export function generateNodeHTML(node: SceneNode, includeComments = true): string {
  const className = toKebabCase(node.name);

  if (node.type === 'line') {
    return generateLineHTML(node, className, includeComments);
  }

  const tag = 'div';
  const comment = includeComments ? `<!-- ${escapeHTML(node.name)} -->\n    ` : '';
  return `${comment}<${tag} class="${className}" data-type="${node.type}"></${tag}>`;
}

/**
 * Generate CSS properties for a single node (as a string block).
 */
export function generateNodeCSS(node: SceneNode): string {
  const usedNames = new Map<string, number>();
  const className = uniqueClassName(node, usedNames);
  return generateNodeCSSBlock(node, className);
}

// ── Internal Helpers ───────────────────────

function generateNodeCSSBlock(node: SceneNode, className: string): string {
  const props: string[] = [];

  // Position
  props.push(`position: absolute`);
  props.push(`left: ${round(node.x)}px`);
  props.push(`top: ${round(node.y)}px`);

  // Size
  if (node.type !== 'line') {
    props.push(`width: ${round(node.width)}px`);
    props.push(`height: ${round(node.height)}px`);
  }

  // Fill
  if (node.type !== 'line') {
    if (node.fill.visible) {
      props.push(`background-color: ${colorToCSS(node.fill.color)}`);
    } else {
      props.push(`background: transparent`);
    }
  }

  // Border radius
  if (node.type === 'rectangle') {
    const rect = node as RectangleNode;
    if (rect.borderRadius > 0) {
      props.push(`border-radius: ${round(rect.borderRadius)}px`);
    }
  } else if (node.type === 'ellipse') {
    props.push(`border-radius: 50%`);
  }

  // Stroke
  if (node.stroke.visible && node.stroke.width > 0 && node.type !== 'line') {
    props.push(`border: ${round(node.stroke.width)}px solid ${colorToCSS(node.stroke.color)}`);
  }

  // Opacity
  if (node.opacity < 1) {
    props.push(`opacity: ${round(node.opacity, 2)}`);
  }

  // Rotation
  if (node.rotation !== 0) {
    props.push(`transform: rotate(${round(node.rotation)}deg)`);
  }

  // Line-specific: use width/height for the SVG container
  if (node.type === 'line') {
    props.push(`width: ${round(Math.max(Math.abs(node.width), 2))}px`);
    props.push(`height: ${round(Math.max(Math.abs(node.height), 2))}px`);
    props.push(`overflow: visible`);
  }

  return `.${className} {\n${props.map(p => `  ${p};`).join('\n')}\n}`;
}

function generateLineHTML(node: SceneNode, className: string, includeComments: boolean): string {
  const w = Math.max(Math.abs(node.width), 2);
  const h = Math.max(Math.abs(node.height), 2);

  const strokeColor = node.stroke.visible
    ? colorToCSS(node.stroke.color)
    : colorToCSS(node.fill.color);
  const strokeWidth = node.stroke.visible && node.stroke.width > 0
    ? node.stroke.width
    : 2;

  const x1 = node.width >= 0 ? 0 : w;
  const y1 = node.height >= 0 ? 0 : h;
  const x2 = node.width >= 0 ? w : 0;
  const y2 = node.height >= 0 ? h : 0;

  const comment = includeComments ? `<!-- ${escapeHTML(node.name)} -->\n    ` : '';

  return `${comment}<svg class="${className}" data-type="line" viewBox="0 0 ${round(w)} ${round(h)}">
      <line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}"
            stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />
    </svg>`;
}

// ── Utilities ──────────────────────────────

function colorToCSS(c: Color): string {
  if (c.a < 1) {
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${round(c.a, 2)})`;
  }
  return colorToHex(c);
}

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'element';
}

function uniqueClassName(node: SceneNode, usedNames: Map<string, number>): string {
  let base = toKebabCase(node.name);
  const count = usedNames.get(base) ?? 0;
  usedNames.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function escapeHTML(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function round(n: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => (line.trim() ? pad + line : line))
    .join('\n');
}
