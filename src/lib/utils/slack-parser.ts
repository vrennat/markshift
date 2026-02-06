import type { Root, Paragraph, Text, Strong, Emphasis, Delete, InlineCode, Code, Link, List, ListItem, Blockquote, BlockContent, PhrasingContent, ListContent } from 'mdast';
import type { MentionNode, EmojiNode } from '../types';

/**
 * Hand-written recursive descent parser for Slack mrkdwn format.
 * Produces an mdast tree.
 *
 * Slack mrkdwn syntax:
 * - *bold* (not **bold**)
 * - _italic_ (not *italic*)
 * - ~strikethrough~ (not ~~strikethrough~~)
 * - `code` and ```code blocks```
 * - <url|text> links
 * - <@U123> mentions
 * - :emoji: emoji shortcodes
 * - > blockquote (single-line)
 * - Lists: - item, * item, 1. item
 */
const MAX_INLINE_DEPTH = 20;
const MAX_EMOJI_NAME_LENGTH = 50;

function isContinuationLine(line: string): boolean {
  if (line.trim() === '') return false;
  if (line.startsWith('```')) return false;
  if (line.startsWith('>') || line.startsWith('&gt;')) return false;
  if (/^[\s]*[-*•]\s/.test(line)) return false;
  if (/^[\s]*\d+[.)]\s/.test(line)) return false;
  return true;
}

export function parseSlackMrkdwn(input: string): Root {
  const lines = input.split('\n');
  const children: BlockContent[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Code block (```)
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      children.push({
        type: 'code',
        lang: lang || undefined,
        value: codeLines.join('\n'),
      } as Code);
      continue;
    }

    // Blockquote (> ...)
    if (line.startsWith('&gt;') || line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('&gt;') || lines[i].startsWith('>'))) {
        const qLine = lines[i].startsWith('&gt;') ? lines[i].slice(4) : lines[i].slice(1);
        quoteLines.push(qLine.startsWith(' ') ? qLine.slice(1) : qLine);
        i++;
      }
      children.push({
        type: 'blockquote',
        children: [{
          type: 'paragraph',
          children: parseInline(quoteLines.join('\n')),
        }],
      } as Blockquote);
      continue;
    }

    // Unordered list (-, *, or •)
    if (/^[\s]*[-*•]\s/.test(line)) {
      const listItems: ListContent[] = [];
      while (i < lines.length && /^[\s]*[-*•]\s/.test(lines[i])) {
        const content = lines[i].replace(/^[\s]*[-*•]\s/, '');
        listItems.push({
          type: 'listItem',
          children: [{
            type: 'paragraph',
            children: parseInline(content),
          }],
        } as ListItem);
        i++;
      }
      children.push({
        type: 'list',
        ordered: false,
        children: listItems,
      } as List);
      continue;
    }

    // Ordered list (1. 2. etc)
    if (/^[\s]*\d+[.)]\s/.test(line)) {
      const listItems: ListContent[] = [];
      while (i < lines.length && /^[\s]*\d+[.)]\s/.test(lines[i])) {
        const content = lines[i].replace(/^[\s]*\d+[.)]\s/, '');
        listItems.push({
          type: 'listItem',
          children: [{
            type: 'paragraph',
            children: parseInline(content),
          }],
        } as ListItem);
        i++;
      }
      children.push({
        type: 'list',
        ordered: true,
        children: listItems,
      } as List);
      continue;
    }

    // Regular paragraph
    const paraLines: string[] = [];
    while (i < lines.length && isContinuationLine(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      children.push({
        type: 'paragraph',
        children: parseInline(paraLines.join('\n')),
      });
    }
  }

  return { type: 'root', children };
}

function parseInline(text: string, depth: number = 0): PhrasingContent[] {
  if (depth > MAX_INLINE_DEPTH) {
    return [{ type: 'text', value: text } as Text];
  }
  const result: PhrasingContent[] = [];
  let i = 0;

  while (i < text.length) {
    // Escaped characters: \* \_ \~ produce literal characters
    if (text[i] === '\\' && i + 1 < text.length && isEscapable(text[i + 1])) {
      result.push({ type: 'text', value: text[i + 1] } as Text);
      i += 2;
      continue;
    }

    // Inline code
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        result.push({ type: 'inlineCode', value: text.slice(i + 1, end) } as InlineCode);
        i = end + 1;
        continue;
      }
    }

    // Slack link: <url|text> or <url>
    if (text[i] === '<') {
      const end = text.indexOf('>', i);
      if (end !== -1) {
        const inner = text.slice(i + 1, end);

        // Mention: <@U123>
        if (inner.startsWith('@')) {
          const userId = inner.slice(1);
          result.push({
            type: 'mention',
            value: userId,
            data: { userId, label: userId },
          } as MentionNode);
          i = end + 1;
          continue;
        }

        // Channel: <#C123|channel-name>
        if (inner.startsWith('#')) {
          const parts = inner.slice(1).split('|');
          const label = parts[1] || parts[0];
          result.push({ type: 'text', value: `#${label}` } as Text);
          i = end + 1;
          continue;
        }

        // Link: <url|text> or <url>
        const pipeIndex = inner.indexOf('|');
        const url = pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner;
        const linkText = pipeIndex >= 0 ? inner.slice(pipeIndex + 1) : url;
        result.push({
          type: 'link',
          url,
          children: [{ type: 'text', value: linkText } as Text],
        } as Link);
        i = end + 1;
        continue;
      }
    }

    // Emoji shortcode: :emoji_name:
    if (text[i] === ':') {
      const end = text.indexOf(':', i + 1);
      if (end !== -1 && end - i < MAX_EMOJI_NAME_LENGTH && /^[a-z0-9_+-]+$/.test(text.slice(i + 1, end))) {
        result.push({
          type: 'emoji',
          value: text.slice(i + 1, end),
        } as EmojiNode);
        i = end + 1;
        continue;
      }
    }

    // Bold: *text*
    if (text[i] === '*' && i + 1 < text.length && text[i + 1] !== ' ') {
      const end = findClosingMark(text, i + 1, '*');
      if (end !== -1) {
        result.push({
          type: 'strong',
          children: parseInline(text.slice(i + 1, end), depth + 1),
        } as Strong);
        i = end + 1;
        continue;
      }
    }

    // Italic: _text_
    if (text[i] === '_' && i + 1 < text.length && text[i + 1] !== ' ') {
      const end = findClosingMark(text, i + 1, '_');
      if (end !== -1) {
        result.push({
          type: 'emphasis',
          children: parseInline(text.slice(i + 1, end), depth + 1),
        } as Emphasis);
        i = end + 1;
        continue;
      }
    }

    // Strikethrough: ~text~
    if (text[i] === '~' && i + 1 < text.length && text[i + 1] !== ' ') {
      const end = findClosingMark(text, i + 1, '~');
      if (end !== -1) {
        result.push({
          type: 'delete',
          children: parseInline(text.slice(i + 1, end), depth + 1),
        } as Delete);
        i = end + 1;
        continue;
      }
    }

    // Plain text - collect until next special character
    let textEnd = i + 1;
    while (textEnd < text.length && !isSpecialChar(text[textEnd])) {
      textEnd++;
    }
    result.push({ type: 'text', value: text.slice(i, textEnd) } as Text);
    i = textEnd;
  }

  return result.length > 0 ? result : [{ type: 'text', value: '' } as Text];
}

function findClosingMark(text: string, start: number, mark: string): number {
  for (let i = start; i < text.length; i++) {
    if (text[i] === mark && text[i - 1] !== ' ') {
      return i;
    }
  }
  return -1;
}

function isSpecialChar(ch: string): boolean {
  return ch === '*' || ch === '_' || ch === '~' || ch === '`' || ch === '<' || ch === ':' || ch === '\\';
}

function isEscapable(ch: string): boolean {
  return ch === '*' || ch === '_' || ch === '~';
}
