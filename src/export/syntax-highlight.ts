// ============================================
// Lightweight HTML/CSS Syntax Highlighter
// No external dependencies — regex-based tokenizer
// Returns React elements with colored spans
// ============================================

import { createElement } from 'react';
import type { ReactNode } from 'react';

// ── Theme (Figment brand palette on dark) ──

const THEME = {
  tag:        '#b49cff', // violet (lighter for readability)
  attribute:  '#f5a623', // amber
  string:     '#14b88a', // mint
  number:     '#ff6b52', // coral
  comment:    '#756a5f', // warm gray
  property:   '#b49cff', // violet
  value:      '#ff6b52', // coral
  selector:   '#f5a623', // amber
  punctuation:'#968a7d', // warm gray light
  text:       '#e8e0d8', // warm white
};

type TokenType = keyof typeof THEME;

interface Token {
  type: TokenType;
  text: string;
}

// ── Public API ─────────────────────────────

/**
 * Highlight an HTML+CSS string, returning React elements.
 */
export function highlightCode(code: string): ReactNode[] {
  const tokens = tokenize(code);
  return tokens.map((token, i) =>
    createElement('span', {
      key: i,
      style: { color: THEME[token.type] },
    }, token.text)
  );
}

// ── Tokenizer ──────────────────────────────

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // HTML comment
    if (code.startsWith('<!--', i)) {
      const end = code.indexOf('-->', i);
      const commentEnd = end === -1 ? code.length : end + 3;
      tokens.push({ type: 'comment', text: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    // CSS comment
    if (code.startsWith('/*', i)) {
      const end = code.indexOf('*/', i);
      const commentEnd = end === -1 ? code.length : end + 2;
      tokens.push({ type: 'comment', text: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    // HTML tag (opening or closing)
    if (code[i] === '<' && (isAlpha(code[i + 1]) || code[i + 1] === '/' || code[i + 1] === '!')) {
      const result = tokenizeTag(code, i);
      tokens.push(...result.tokens);
      i = result.end;
      continue;
    }

    // CSS block: detect selector { ... }
    // We handle this by looking for patterns in context
    if (code[i] === '{') {
      tokens.push({ type: 'punctuation', text: '{' });
      i++;
      // Inside CSS block — tokenize properties until closing }
      const result = tokenizeCSSBlock(code, i);
      tokens.push(...result.tokens);
      i = result.end;
      continue;
    }

    if (code[i] === '}') {
      tokens.push({ type: 'punctuation', text: '}' });
      i++;
      continue;
    }

    // CSS selector (lines before {, after } or at start)
    // Check if this line leads to a {
    if (isCSSSelectorStart(code, i)) {
      const bracePos = code.indexOf('{', i);
      if (bracePos !== -1) {
        const selectorText = code.slice(i, bracePos);
        if (selectorText.trim().length > 0 && !selectorText.includes('}')) {
          tokens.push({ type: 'selector', text: selectorText });
          i = bracePos;
          continue;
        }
      }
    }

    // String literals
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === '\\') j++;
        j++;
      }
      j++; // include closing quote
      tokens.push({ type: 'string', text: code.slice(i, j) });
      i = j;
      continue;
    }

    // Plain text (accumulate)
    let j = i;
    while (j < code.length &&
      code[j] !== '<' &&
      code[j] !== '{' &&
      code[j] !== '}' &&
      !code.startsWith('<!--', j) &&
      !code.startsWith('/*', j)) {
      j++;
    }
    if (j > i) {
      tokens.push({ type: 'text', text: code.slice(i, j) });
      i = j;
    } else {
      // Safety: advance one char
      tokens.push({ type: 'text', text: code[i] });
      i++;
    }
  }

  return tokens;
}

function tokenizeTag(code: string, start: number): { tokens: Token[]; end: number } {
  const tokens: Token[] = [];
  let i = start;

  // < or </
  if (code[i + 1] === '/') {
    tokens.push({ type: 'punctuation', text: '</' });
    i += 2;
  } else if (code[i + 1] === '!') {
    tokens.push({ type: 'punctuation', text: '<!' });
    i += 2;
  } else {
    tokens.push({ type: 'punctuation', text: '<' });
    i++;
  }

  // Tag name
  let tagName = '';
  while (i < code.length && /[a-zA-Z0-9-]/.test(code[i])) {
    tagName += code[i];
    i++;
  }
  if (tagName) {
    tokens.push({ type: 'tag', text: tagName });
  }

  // Attributes
  while (i < code.length && code[i] !== '>' && !code.startsWith('/>', i)) {
    // Whitespace
    if (/\s/.test(code[i])) {
      let ws = '';
      while (i < code.length && /\s/.test(code[i])) {
        ws += code[i];
        i++;
      }
      tokens.push({ type: 'text', text: ws });
      continue;
    }

    // Attribute name
    let attrName = '';
    while (i < code.length && /[a-zA-Z0-9_:-]/.test(code[i])) {
      attrName += code[i];
      i++;
    }
    if (attrName) {
      tokens.push({ type: 'attribute', text: attrName });
    }

    // =
    if (code[i] === '=') {
      tokens.push({ type: 'punctuation', text: '=' });
      i++;
    }

    // Attribute value
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) j++;
      j++;
      tokens.push({ type: 'string', text: code.slice(i, j) });
      i = j;
    }
  }

  // Closing: /> or >
  if (code.startsWith('/>', i)) {
    tokens.push({ type: 'punctuation', text: '/>' });
    i += 2;
  } else if (code[i] === '>') {
    tokens.push({ type: 'punctuation', text: '>' });
    i++;
  }

  return { tokens, end: i };
}

function tokenizeCSSBlock(code: string, start: number): { tokens: Token[]; end: number } {
  const tokens: Token[] = [];
  let i = start;

  while (i < code.length && code[i] !== '}') {
    // CSS comment inside block
    if (code.startsWith('/*', i)) {
      const end = code.indexOf('*/', i);
      const commentEnd = end === -1 ? code.length : end + 2;
      tokens.push({ type: 'comment', text: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    // Whitespace
    if (/\s/.test(code[i])) {
      let ws = '';
      while (i < code.length && /\s/.test(code[i])) {
        ws += code[i];
        i++;
      }
      tokens.push({ type: 'text', text: ws });
      continue;
    }

    // Property name (up to colon)
    const colonPos = code.indexOf(':', i);
    const semiPos = code.indexOf(';', i);
    const bracePos = code.indexOf('}', i);

    if (colonPos !== -1 && (semiPos === -1 || colonPos < semiPos) && colonPos < bracePos) {
      const propName = code.slice(i, colonPos);
      if (/^[\s\w-]+$/.test(propName)) {
        tokens.push({ type: 'property', text: propName });
        tokens.push({ type: 'punctuation', text: ':' });
        i = colonPos + 1;

        // Value (up to ;)
        const valueEnd = semiPos !== -1 && semiPos < bracePos ? semiPos : bracePos;
        const valueText = code.slice(i, valueEnd);
        tokens.push({ type: 'value', text: valueText });
        if (code[valueEnd] === ';') {
          tokens.push({ type: 'punctuation', text: ';' });
          i = valueEnd + 1;
        } else {
          i = valueEnd;
        }
        continue;
      }
    }

    // Fallback: consume one char
    tokens.push({ type: 'text', text: code[i] });
    i++;
  }

  return { tokens, end: i };
}

// ── Helpers ────────────────────────────────

function isAlpha(ch: string | undefined): boolean {
  return !!ch && /[a-zA-Z]/.test(ch);
}

function isCSSSelectorStart(code: string, pos: number): boolean {
  // Heuristic: line starts with . # * or a letter (after newline or start)
  if (pos === 0) return /[.#*a-zA-Z]/.test(code[0]);
  // Check if preceded by newline and then whitespace
  const prevNewline = code.lastIndexOf('\n', pos - 1);
  const lineStart = code.slice(prevNewline + 1, pos).trim();
  return lineStart === '' && /[.#*a-zA-Z]/.test(code[pos]);
}
