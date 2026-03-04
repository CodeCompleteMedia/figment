# Changelog

All notable changes to Figment will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-04

### Added
- Infinite canvas with pan (Space+drag, middle mouse) and zoom (Ctrl+scroll)
- Rectangle tool (R) with border radius support
- Ellipse tool (O)
- Line tool (L)
- Selection tool (V) with click-to-select, drag-to-move, and handle-based resize
- Properties panel: position, size, fill color, stroke color/width, opacity, border radius
- Layers panel: visibility toggle, rename (double-click), reorder, click-to-select
- Undo/redo with full command history (Ctrl+Z / Ctrl+Y)
- JSON document save/load
- PNG export via CanvasKit
- Grid overlay (toggle with G)
- Keyboard shortcuts for all tools and common actions
- Delete and duplicate (Ctrl+D) support
- Branded loading screen with Figment identity
- CanvasKit (Skia WebAssembly) rendering pipeline
