import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, Text, Paragraph, Heading, PhrasingContent, BlockContent, Image, Link, Table, TableRow, TableCell, ThematicBreak } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning, SpoilerNode, UnderlineNode, SubtextNode } from '../types';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { downgradeCustomNodes, replaceNode } from '../utils/mdast-helpers';
import { warn, WARNINGS } from '../warnings';
import { createSerializer } from '../utils/remark-helpers';

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm);

/**
 * Post-parse transform: find Discord-specific syntax in text nodes.
 * - ||spoiler|| -> SpoilerNode
 * - __underline__ -> UnderlineNode (remark parses this as strong, we need to re-interpret)
 * - -# subtext (line-level)
 */
function parseDiscordInline(tree: Root): void {
  // Handle -# subtext at block level
  visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
    if (index == null || !parent) return;
    if (node.children.length === 0) return;
    const first = node.children[0];
    if (first.type === 'text' && first.value.startsWith('-# ')) {
      const subtextNode: SubtextNode = {
        type: 'subtext',
        children: [
          { type: 'text', value: first.value.slice(3) } as Text,
          ...node.children.slice(1) as PhrasingContent[],
        ],
      };
      replaceNode(parent, index, subtextNode);
    }
  });

  // Handle ||spoiler|| in text nodes within paragraphs
  visit(tree, 'paragraph', (node: Paragraph) => {
    const newChildren: PhrasingContent[] = [];
    let changed = false;
    for (const child of node.children) {
      if (child.type !== 'text') {
        newChildren.push(child);
        continue;
      }
      const parts = parseSpoilers((child as Text).value);
      if (parts.length === 1 && parts[0].type === 'text') {
        newChildren.push(child);
      } else {
        newChildren.push(...(parts as PhrasingContent[]));
        changed = true;
      }
    }
    if (changed) {
      node.children = newChildren;
    }
  });
}

function parseSpoilers(text: string): (Text | SpoilerNode)[] {
  const parts: (Text | SpoilerNode)[] = [];
  const regex = /\|\|(.+?)\|\|/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) } as Text);
    }
    parts.push({
      type: 'spoiler',
      children: [{ type: 'text', value: match[1] } as Text],
    } as SpoilerNode);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) } as Text);
  }
  if (parts.length === 0) {
    parts.push({ type: 'text', value: text } as Text);
  }
  return parts;
}

export const discord: FormatModule = {
  id: 'discord',
  label: 'Discord',
  description: 'Discord chat markdown',

  async parse(input: string): Promise<ParseResult> {
    const tree = parser.parse(input) as Root;
    const warnings: ConversionWarning[] = [];
    parseDiscordInline(tree);
    return { tree, warnings };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    const cloned = structuredClone(tree);

    // Cap headings at level 3
    visit(cloned, 'heading', (node: Heading) => {
      if (node.depth > 3) node.depth = 3;
    });

    // Convert images to links (Discord doesn't support image markdown)
    visit(cloned, 'image', (node: Image, index, parent) => {
      if (index == null || !parent) return;
      const text = node.alt || node.url;
      const link: Link = {
        type: 'link',
        url: node.url,
        children: [{ type: 'text', value: text } as Text],
      };
      replaceNode(parent, index, link);
      warnings.push(warn('info', WARNINGS.IMAGES_NOT_SUPPORTED, 'image'));
    });

    // Convert tables to plain text
    visit(cloned, 'table', (node: Table, index, parent) => {
      if (index == null || !parent) return;
      const rows = node.children.map((row: TableRow) => {
        return (row as TableRow).children
          .map((cell: TableCell) => toString(cell))
          .join(' | ');
      });
      const para: Paragraph = {
        type: 'paragraph',
        children: [{ type: 'text', value: rows.join('\n') } as Text],
      };
      replaceNode(parent, index, para);
      warnings.push(warn('warning', WARNINGS.TABLES_NOT_SUPPORTED, 'table'));
    });

    // Remove thematic breaks
    cloned.children = cloned.children.filter(node => {
      if (node.type === 'thematicBreak') {
        warnings.push(warn('info', WARNINGS.HR_NOT_SUPPORTED, 'thematicBreak'));
        return false;
      }
      return true;
    });

    // Convert spoiler nodes to ||text|| in text nodes
    visit(cloned, 'spoiler', (node: SpoilerNode, index, parent) => {
      if (index == null || !parent) return;
      const inner = toString(node);
      const text: Text = { type: 'text', value: `||${inner}||` };
      replaceNode(parent, index, text);
    });

    // Convert subtext nodes to -# text
    visit(cloned, 'subtext', (node: SubtextNode, index, parent) => {
      if (index == null || !parent) return;
      const inner = toString(node);
      const para: Paragraph = {
        type: 'paragraph',
        children: [{ type: 'text', value: `-# ${inner}` } as Text],
      };
      replaceNode(parent, index, para);
    });

    // Downgrade remaining custom nodes
    downgradeCustomNodes(cloned, warnings, ['spoiler', 'subtext']);

    const serializer = createSerializer();

    return serializer.stringify(cloned);
  },
};
