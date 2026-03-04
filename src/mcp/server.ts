// ============================================
// Figment MCP Server
// Exposes the Figment design document to Claude Code
// via the Model Context Protocol (stdio transport).
// ============================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type {
  FigmentDocument, SceneNode, Page, Color, Fill, Stroke,
} from '../model/types.js';
import {
  createRectangle, createEllipse, createLine, duplicateNode,
} from '../model/factory.js';
import { generateFullHTML, generatePageCSS } from '../export/code-generator.js';
import { generateClaudePrompt } from '../export/claude-prompt.js';

// ── Helpers ───────────────────────────────────

const DOC_PATH = resolve(process.env.FIGMENT_DOC_PATH || './figment-doc.json');

function log(msg: string) {
  process.stderr.write(`[figment-mcp] ${msg}\n`);
}

function createDefaultDocument(): FigmentDocument {
  const pageId = uuidv4();
  return {
    id: uuidv4(),
    name: 'Untitled',
    pages: [{ id: pageId, name: 'Page 1', nodes: [] }],
    activePage: pageId,
  };
}

function loadDocument(): FigmentDocument {
  try {
    if (existsSync(DOC_PATH)) {
      const raw = readFileSync(DOC_PATH, 'utf-8');
      return JSON.parse(raw) as FigmentDocument;
    }
  } catch (e) {
    log(`Failed to load document: ${e}`);
  }
  return createDefaultDocument();
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function saveDocument(doc: FigmentDocument) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      writeFileSync(DOC_PATH, JSON.stringify(doc, null, 2));
      log(`Saved document to ${DOC_PATH}`);
    } catch (e) {
      log(`Failed to save document: ${e}`);
    }
  }, 300);
}

/** Force-flush any pending save (for shutdown). */
function flushSave(doc: FigmentDocument) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
    try {
      writeFileSync(DOC_PATH, JSON.stringify(doc, null, 2));
    } catch { /* ignore */ }
  }
}

function getActivePage(doc: FigmentDocument): Page {
  const page = doc.pages.find(p => p.id === doc.activePage);
  if (!page) throw new Error(`Active page ${doc.activePage} not found`);
  return page;
}

function getPage(doc: FigmentDocument, pageId?: string): Page {
  if (!pageId) return getActivePage(doc);
  const page = doc.pages.find(p => p.id === pageId);
  if (!page) throw new Error(`Page ${pageId} not found`);
  return page;
}

function findNode(page: Page, nodeId: string): SceneNode {
  const node = page.nodes.find(n => n.id === nodeId);
  if (!node) throw new Error(`Node ${nodeId} not found on page ${page.name}`);
  return node;
}

function parseColor(hex: string): Color {
  const h = hex.replace('#', '');
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255,
    };
  }
  throw new Error(`Invalid hex color: ${hex}`);
}

// ── MCP Server ────────────────────────────────

const doc = loadDocument();
log(`Loaded document "${doc.name}" with ${doc.pages.length} page(s)`);
log(`Document path: ${DOC_PATH}`);

const server = new McpServer(
  { name: 'figment', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── Read Tools ────────────────────────────────

server.tool(
  'get_document',
  'Get the full Figment design document (pages, nodes, active page)',
  {},
  async () => ({
    content: [{ type: 'text' as const, text: JSON.stringify(doc, null, 2) }],
  }),
);

server.tool(
  'list_nodes',
  'List all nodes on a page with their id, name, type, position and size',
  { pageId: z.string().optional().describe('Page ID (defaults to active page)') },
  async ({ pageId }) => {
    const page = getPage(doc, pageId);
    const summary = page.nodes.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      x: n.x, y: n.y,
      width: n.width, height: n.height,
      visible: n.visible,
    }));
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }],
    };
  },
);

server.tool(
  'get_node',
  'Get full details of a single node by ID',
  { nodeId: z.string().describe('Node ID') },
  async ({ nodeId }) => {
    const page = getActivePage(doc);
    const node = findNode(page, nodeId);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(node, null, 2) }],
    };
  },
);

server.tool(
  'export_html',
  'Generate a complete HTML+CSS document from the design',
  {
    pageId: z.string().optional().describe('Page ID (defaults to active page)'),
    title: z.string().optional().describe('HTML page title'),
  },
  async ({ pageId, title }) => {
    const page = getPage(doc, pageId);
    const html = generateFullHTML(page.nodes, { title: title || doc.name });
    return {
      content: [{ type: 'text' as const, text: html }],
    };
  },
);

server.tool(
  'export_css',
  'Generate only the CSS from the design',
  { pageId: z.string().optional().describe('Page ID (defaults to active page)') },
  async ({ pageId }) => {
    const page = getPage(doc, pageId);
    const css = generatePageCSS(page.nodes);
    return {
      content: [{ type: 'text' as const, text: css }],
    };
  },
);

server.tool(
  'generate_prompt',
  'Generate a structured prompt for Claude Code from the design',
  {
    framework: z.enum(['html', 'react', 'nextjs', 'vue']).optional()
      .describe('Target framework (default: html)'),
    description: z.string().optional()
      .describe('Optional description of what to build'),
    responsive: z.boolean().optional()
      .describe('Whether to request responsive design (default: true)'),
  },
  async ({ framework, description, responsive }) => {
    const page = getActivePage(doc);
    const prompt = generateClaudePrompt(page.nodes, {
      framework: framework || 'html',
      description,
      responsive: responsive !== false,
    });
    return {
      content: [{ type: 'text' as const, text: prompt }],
    };
  },
);

// ── Mutation Tools ────────────────────────────

server.tool(
  'add_node',
  'Add a new shape (rectangle, ellipse, or line) to the canvas',
  {
    type: z.enum(['rectangle', 'ellipse', 'line']).describe('Shape type'),
    x: z.number().describe('X position'),
    y: z.number().describe('Y position'),
    width: z.number().describe('Width in pixels'),
    height: z.number().describe('Height in pixels'),
    name: z.string().optional().describe('Custom name for the node'),
    fill: z.string().optional().describe('Fill color as hex (e.g. "#FF6B52")'),
    pageId: z.string().optional().describe('Page ID (defaults to active page)'),
  },
  async ({ type, x, y, width, height, name, fill, pageId }) => {
    const page = getPage(doc, pageId);

    let node: SceneNode;
    if (type === 'rectangle') node = createRectangle(x, y, width, height);
    else if (type === 'ellipse') node = createEllipse(x, y, width, height);
    else node = createLine(x, y, width, height);

    if (name) node.name = name;
    if (fill) {
      const color = parseColor(fill);
      node.fill = { color, visible: true };
    }

    page.nodes.push(node);
    saveDocument(doc);

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(node, null, 2) }],
    };
  },
);

server.tool(
  'update_node',
  'Update properties of an existing node (position, size, fill, stroke, opacity, name, etc.)',
  {
    nodeId: z.string().describe('Node ID to update'),
    name: z.string().optional().describe('New name'),
    x: z.number().optional().describe('New X position'),
    y: z.number().optional().describe('New Y position'),
    width: z.number().optional().describe('New width'),
    height: z.number().optional().describe('New height'),
    rotation: z.number().optional().describe('Rotation in degrees'),
    opacity: z.number().min(0).max(1).optional().describe('Opacity (0-1)'),
    visible: z.boolean().optional().describe('Visibility'),
    locked: z.boolean().optional().describe('Lock state'),
    fillColor: z.string().optional().describe('Fill color as hex (e.g. "#14B88A")'),
    fillVisible: z.boolean().optional().describe('Fill visibility'),
    strokeColor: z.string().optional().describe('Stroke color as hex'),
    strokeWidth: z.number().optional().describe('Stroke width in pixels'),
    strokeVisible: z.boolean().optional().describe('Stroke visibility'),
    borderRadius: z.number().optional().describe('Border radius (rectangles only)'),
  },
  async ({ nodeId, fillColor, fillVisible, strokeColor, strokeWidth, strokeVisible, borderRadius, ...props }) => {
    const page = getActivePage(doc);
    const node = findNode(page, nodeId);

    // Apply simple props
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined) {
        (node as Record<string, unknown>)[key] = value;
      }
    }

    // Apply fill
    if (fillColor !== undefined) {
      node.fill.color = parseColor(fillColor);
    }
    if (fillVisible !== undefined) {
      node.fill.visible = fillVisible;
    }

    // Apply stroke
    if (strokeColor !== undefined) {
      node.stroke.color = parseColor(strokeColor);
    }
    if (strokeWidth !== undefined) {
      node.stroke.width = strokeWidth;
    }
    if (strokeVisible !== undefined) {
      node.stroke.visible = strokeVisible;
    }

    // Apply borderRadius (rectangles only)
    if (borderRadius !== undefined && node.type === 'rectangle') {
      (node as SceneNode & { borderRadius: number }).borderRadius = borderRadius;
    }

    saveDocument(doc);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(node, null, 2) }],
    };
  },
);

server.tool(
  'delete_nodes',
  'Delete one or more nodes by ID',
  {
    nodeIds: z.array(z.string()).describe('Array of node IDs to delete'),
  },
  async ({ nodeIds }) => {
    const page = getActivePage(doc);
    const toDelete = new Set(nodeIds);
    const before = page.nodes.length;
    page.nodes = page.nodes.filter(n => !toDelete.has(n.id));
    const deleted = before - page.nodes.length;

    saveDocument(doc);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ deleted, remaining: page.nodes.length }),
      }],
    };
  },
);

server.tool(
  'move_nodes',
  'Move nodes by a delta offset (dx, dy)',
  {
    nodeIds: z.array(z.string()).describe('Node IDs to move'),
    dx: z.number().describe('Horizontal offset in pixels'),
    dy: z.number().describe('Vertical offset in pixels'),
  },
  async ({ nodeIds, dx, dy }) => {
    const page = getActivePage(doc);
    const moved: string[] = [];
    for (const id of nodeIds) {
      const node = page.nodes.find(n => n.id === id);
      if (node) {
        node.x += dx;
        node.y += dy;
        moved.push(id);
      }
    }

    saveDocument(doc);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ moved, dx, dy }),
      }],
    };
  },
);

server.tool(
  'reorder_node',
  'Change the z-order of a node: "front", "back", "forward" (up one), or "backward" (down one)',
  {
    nodeId: z.string().describe('Node ID'),
    position: z.enum(['front', 'back', 'forward', 'backward']).describe('Target position'),
  },
  async ({ nodeId, position }) => {
    const page = getActivePage(doc);
    const idx = page.nodes.findIndex(n => n.id === nodeId);
    if (idx === -1) throw new Error(`Node ${nodeId} not found`);

    const [node] = page.nodes.splice(idx, 1);
    switch (position) {
      case 'front':
        page.nodes.push(node);
        break;
      case 'back':
        page.nodes.unshift(node);
        break;
      case 'forward':
        page.nodes.splice(Math.min(idx + 1, page.nodes.length), 0, node);
        break;
      case 'backward':
        page.nodes.splice(Math.max(idx - 1, 0), 0, node);
        break;
    }

    saveDocument(doc);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ nodeId, position, newIndex: page.nodes.indexOf(node) }),
      }],
    };
  },
);

server.tool(
  'set_active_page',
  'Switch the active page by ID',
  { pageId: z.string().describe('Page ID to activate') },
  async ({ pageId }) => {
    const page = doc.pages.find(p => p.id === pageId);
    if (!page) throw new Error(`Page ${pageId} not found`);
    doc.activePage = pageId;
    saveDocument(doc);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ activePage: pageId, pageName: page.name }),
      }],
    };
  },
);

// ── Start Server ──────────────────────────────

async function main() {
  const transport = new StdioServerTransport();

  process.on('SIGINT', () => {
    flushSave(doc);
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    flushSave(doc);
    process.exit(0);
  });

  log('Starting Figment MCP server...');
  await server.connect(transport);
  log('Connected — ready for tool calls');
}

main().catch(e => {
  log(`Fatal: ${e}`);
  process.exit(1);
});
