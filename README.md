# Figment — Where ideas take shape

A browser-based vector graphics editor for UI/UX design, built with CanvasKit (Skia WebAssembly) and React.

![Figment](https://img.shields.io/badge/version-0.1.0-7C5CFC) ![License](https://img.shields.io/badge/license-MIT-blue)

## Features (MVP)

- **Infinite canvas** with pan and zoom
- **Shape tools**: Rectangle, Ellipse, Line
- **Selection tool**: Click to select, drag to move, handle-based resize
- **Properties panel**: Position, size, fill color, stroke, opacity, border radius
- **Layers panel**: Visibility toggle, rename, reorder, click to select
- **Undo / Redo** with full command history
- **Export**: PNG (via Skia), JSON save/load
- **Keyboard shortcuts**: V (Select), R (Rectangle), O (Ellipse), L (Line), G (Grid), Ctrl+Z/Y (Undo/Redo), Delete, Ctrl+D (Duplicate)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Rendering | [CanvasKit-Wasm](https://www.npmjs.com/package/canvaskit-wasm) (Skia) |
| UI | React 18 + TypeScript |
| Build | Vite |
| State | Zustand |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Architecture

The document model and editor state live in TypeScript for easy iteration and future CRDT integration. The CanvasKit/Wasm layer handles rendering and geometry — it receives a scene description and draws it.

```
┌─────────────────────────────────────────────┐
│  React UI (Toolbar, Layers, Properties)     │
│                    ↓                        │
│           Editor State (Zustand)            │
│           + Command Pattern (Undo/Redo)     │
│                    ↓                        │
│        CanvasKit-Wasm (Skia Rendering)      │
│           → WebGL Canvas                    │
└─────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── model/          # Document types, commands, node factory
├── editor/         # Zustand store, viewport math, tool handlers
├── renderer/       # CanvasKit rendering pipeline
├── wasm/           # CanvasKit initialization
└── ui/             # React components (shell, toolbar, panels, canvas)
```

## Roadmap

- [ ] Pen / Bezier tool
- [ ] Text tool
- [ ] Boolean operations (union, subtract, intersect)
- [ ] Components & symbols
- [ ] Auto-layout & constraints
- [ ] Real-time collaboration (CRDT-based)
- [ ] Developer handoff (CSS/code export)
- [ ] Plugin system

## License

MIT
