// ============================================
// Command Pattern for Undo/Redo
// ============================================

import type { SceneNode } from './types';

export interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory = 100;

  execute(command: Command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // clear redo on new action
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;
    command.undo();
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;
    command.execute();
    this.undoStack.push(command);
    return true;
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

// ============================================
// Concrete Commands
// ============================================

export class AddNodeCommand implements Command {
  description: string;
  constructor(
    private nodes: SceneNode[],
    private node: SceneNode,
  ) {
    this.description = `Add ${node.type}`;
  }
  execute() {
    this.nodes.push(this.node);
  }
  undo() {
    const idx = this.nodes.findIndex(n => n.id === this.node.id);
    if (idx >= 0) this.nodes.splice(idx, 1);
  }
}

export class DeleteNodesCommand implements Command {
  description = 'Delete nodes';
  private deletedNodes: { node: SceneNode; index: number }[] = [];

  constructor(
    private nodes: SceneNode[],
    private ids: string[],
  ) {}

  execute() {
    this.deletedNodes = [];
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      if (this.ids.includes(this.nodes[i].id)) {
        this.deletedNodes.unshift({ node: this.nodes[i], index: i });
        this.nodes.splice(i, 1);
      }
    }
  }

  undo() {
    for (const { node, index } of this.deletedNodes) {
      this.nodes.splice(index, 0, node);
    }
  }
}

export class MoveNodesCommand implements Command {
  description = 'Move nodes';
  private originalPositions: Map<string, { x: number; y: number }> = new Map();

  constructor(
    private nodes: SceneNode[],
    private ids: string[],
    private dx: number,
    private dy: number,
  ) {}

  execute() {
    for (const node of this.nodes) {
      if (this.ids.includes(node.id)) {
        if (!this.originalPositions.has(node.id)) {
          this.originalPositions.set(node.id, { x: node.x, y: node.y });
        }
        const orig = this.originalPositions.get(node.id)!;
        node.x = orig.x + this.dx;
        node.y = orig.y + this.dy;
      }
    }
  }

  undo() {
    for (const node of this.nodes) {
      const orig = this.originalPositions.get(node.id);
      if (orig) {
        node.x = orig.x;
        node.y = orig.y;
      }
    }
  }
}

export class UpdateNodeCommand implements Command {
  description: string;
  private oldValues: Partial<SceneNode> = {};

  constructor(
    private nodes: SceneNode[],
    private id: string,
    private updates: Partial<SceneNode>,
  ) {
    this.description = `Update node`;
  }

  execute() {
    const node = this.nodes.find(n => n.id === this.id);
    if (!node) return;
    this.oldValues = {};
    for (const key of Object.keys(this.updates) as (keyof SceneNode)[]) {
      (this.oldValues as any)[key] = JSON.parse(JSON.stringify((node as any)[key]));
      (node as any)[key] = JSON.parse(JSON.stringify((this.updates as any)[key]));
    }
  }

  undo() {
    const node = this.nodes.find(n => n.id === this.id);
    if (!node) return;
    for (const key of Object.keys(this.oldValues) as (keyof SceneNode)[]) {
      (node as any)[key] = (this.oldValues as any)[key];
    }
  }
}

export class ReorderNodeCommand implements Command {
  description = 'Reorder layer';

  constructor(
    private nodes: SceneNode[],
    private fromIndex: number,
    private toIndex: number,
  ) {}

  execute() {
    const [node] = this.nodes.splice(this.fromIndex, 1);
    this.nodes.splice(this.toIndex, 0, node);
  }

  undo() {
    const [node] = this.nodes.splice(this.toIndex, 1);
    this.nodes.splice(this.fromIndex, 0, node);
  }
}
