// ============================================
// Claude Code Prompt Generator
// Formats a Figment design as a structured prompt
// for handoff to Claude Code
// ============================================

import type { SceneNode, Color } from '../model/types';
import { colorToHex } from '../model/types';
import { generateFullHTML } from './code-generator';

export type FrameworkOption = 'html' | 'react' | 'nextjs' | 'vue';

export interface ClaudePromptOptions {
  framework: FrameworkOption;
  description?: string;
  responsive?: boolean;
}

/**
 * Generate a structured prompt for Claude Code
 * from a set of design nodes.
 */
export function generateClaudePrompt(
  nodes: SceneNode[],
  options: ClaudePromptOptions = { framework: 'html' },
): string {
  const { framework, description, responsive = true } = options;

  const html = generateFullHTML(nodes, {
    title: 'Design Export',
    includeComments: true,
    includeReset: false,
  });

  const bounds = getCanvasBounds(nodes);
  const palette = extractColorPalette(nodes);
  const frameworkName = getFrameworkName(framework);
  const frameworkInstructions = getFrameworkInstructions(framework);

  const parts: string[] = [];

  parts.push(`I have a UI design created in Figment that I'd like you to build as a ${frameworkName}.`);

  if (description) {
    parts.push('');
    parts.push(`**Context:** ${description}`);
  }

  parts.push('');
  parts.push('Here is the design exported as HTML + CSS:');
  parts.push('');
  parts.push('```html');
  parts.push(html);
  parts.push('```');

  parts.push('');
  parts.push('## Design Specifications');
  parts.push('');
  parts.push(`- **Canvas size:** ${Math.round(bounds.width)} × ${Math.round(bounds.height)} px`);
  parts.push(`- **Elements:** ${nodes.length} layers`);

  if (palette.length > 0) {
    parts.push(`- **Color palette:**`);
    for (const color of palette) {
      parts.push(`  - \`${color.hex}\` (used ${color.count}× — ${color.usage})`);
    }
  }

  parts.push('');
  parts.push('## Requirements');
  parts.push('');
  parts.push('Please create a production-ready implementation that:');
  parts.push('- Uses semantic HTML elements where appropriate');
  if (responsive) {
    parts.push('- Is responsive and works well on mobile, tablet, and desktop');
  }
  parts.push('- Follows accessibility best practices (ARIA labels, keyboard navigation, color contrast)');
  parts.push('- Uses clean, maintainable code');

  if (frameworkInstructions) {
    parts.push(frameworkInstructions);
  }

  parts.push('');
  parts.push('Convert the absolute positioning from the export into a proper layout using CSS Grid or Flexbox where appropriate. The exported HTML is a visual reference — feel free to restructure the markup for better semantics and responsiveness.');

  return parts.join('\n');
}

// ── Helpers ────────────────────────────────

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getCanvasBounds(nodes: SceneNode[]): Bounds {
  if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + Math.abs(node.width));
    maxY = Math.max(maxY, node.y + Math.abs(node.height));
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

interface PaletteEntry {
  hex: string;
  count: number;
  usage: string;
}

function extractColorPalette(nodes: SceneNode[]): PaletteEntry[] {
  const colorMap = new Map<string, { count: number; usages: Set<string> }>();

  for (const node of nodes) {
    if (node.fill.visible) {
      const hex = colorToHex(node.fill.color);
      const entry = colorMap.get(hex) ?? { count: 0, usages: new Set() };
      entry.count++;
      entry.usages.add('fill');
      colorMap.set(hex, entry);
    }
    if (node.stroke.visible && node.stroke.width > 0) {
      const hex = colorToHex(node.stroke.color);
      const entry = colorMap.get(hex) ?? { count: 0, usages: new Set() };
      entry.count++;
      entry.usages.add('stroke');
      colorMap.set(hex, entry);
    }
  }

  return Array.from(colorMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8) // Top 8 colors
    .map(([hex, { count, usages }]) => ({
      hex,
      count,
      usage: Array.from(usages).join(', '),
    }));
}

function getFrameworkName(fw: FrameworkOption): string {
  switch (fw) {
    case 'html': return 'standalone HTML page';
    case 'react': return 'React component';
    case 'nextjs': return 'Next.js page';
    case 'vue': return 'Vue component';
  }
}

function getFrameworkInstructions(fw: FrameworkOption): string {
  switch (fw) {
    case 'react':
      return '- Use React functional components with hooks\n- Use CSS Modules or Tailwind CSS for styling\n- Make the component self-contained with reasonable props';
    case 'nextjs':
      return '- Use the Next.js App Router with server components where appropriate\n- Use Tailwind CSS for styling\n- Include proper metadata and SEO';
    case 'vue':
      return '- Use Vue 3 Composition API with `<script setup>`\n- Use scoped CSS for styling';
    default:
      return '';
  }
}
