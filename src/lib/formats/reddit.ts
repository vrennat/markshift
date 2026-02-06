import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, Text, Paragraph, PhrasingContent, Code, Image, Link } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning, SpoilerNode, SuperscriptNode } from '../types';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { downgradeCustomNodes, replaceNode } from '../utils/mdast-helpers';
import { warn, WARNINGS } from '../warnings';
import { createSerializer } from '../utils/remark-helpers';

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm);

/**
 * Post-parse transform: find Reddit-specific syntax in text nodes.
 * - >!spoiler!< -> SpoilerNode
 * - ^word or ^(multi word) -> SuperscriptNode
 */
function parseRedditInline(tree: Root): void {
  visit(tree, 'paragraph', (node: Paragraph) => {
    const newChildren: PhrasingContent[] = [];
    let changed = false;
    for (const child of node.children) {
      if (child.type !== 'text') {
        newChildren.push(child);
        continue;
      }
      const parts = parseRedditText((child as Text).value);
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

function parseRedditText(text: string): PhrasingContent[] {
  const parts: PhrasingContent[] = [];
  // Match >!spoiler!< or ^(superscript) or ^word
  const regex = />!(.+?)!</g;
  let lastIndex = 0;
  let match;

  // First pass: spoilers
  const withSpoilers: { type: string; value: string; content?: string }[] = [];
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      withSpoilers.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    withSpoilers.push({ type: 'spoiler', value: match[0], content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    withSpoilers.push({ type: 'text', value: text.slice(lastIndex) });
  }
  if (withSpoilers.length === 0) {
    withSpoilers.push({ type: 'text', value: text });
  }

  // Second pass: superscript in remaining text segments
  for (const segment of withSpoilers) {
    if (segment.type === 'spoiler') {
      parts.push({
        type: 'spoiler',
        children: [{ type: 'text', value: segment.content! } as Text],
      } as SpoilerNode);
    } else {
      // Parse superscript: ^(multi word) or ^word
      const superRegex = /\^(?:\(([^)]+)\)|(\S+))/g;
      let si = 0;
      let sm;
      const txt = segment.value;
      while ((sm = superRegex.exec(txt)) !== null) {
        if (sm.index > si) {
          parts.push({ type: 'text', value: txt.slice(si, sm.index) } as Text);
        }
        parts.push({
          type: 'superscript',
          value: sm[1] || sm[2],
        } as SuperscriptNode);
        si = sm.index + sm[0].length;
      }
      if (si < txt.length) {
        parts.push({ type: 'text', value: txt.slice(si) } as Text);
      }
    }
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text } as Text];
}

export const reddit: FormatModule = {
  id: 'reddit',
  label: 'Reddit',
  description: 'Reddit markdown (snoomark)',

  async parse(input: string): Promise<ParseResult> {
    const tree = parser.parse(input) as Root;
    const warnings: ConversionWarning[] = [];
    parseRedditInline(tree);
    return { tree, warnings };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    const cloned = structuredClone(tree);

    // Strip syntax highlighting from code blocks
    visit(cloned, 'code', (node: Code) => {
      if (node.lang) {
        warnings.push(warn('info', WARNINGS.SYNTAX_HIGHLIGHT_DROPPED, 'code'));
        delete node.lang;
        delete node.meta;
      }
    });

    // Convert images to links (Reddit doesn't support image markdown)
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

    // Convert spoiler nodes to >!text!<
    visit(cloned, 'spoiler', (node: SpoilerNode, index, parent) => {
      if (index == null || !parent) return;
      const inner = toString(node);
      const text: Text = { type: 'text', value: `>!${inner}!<` };
      replaceNode(parent, index, text);
    });

    // Convert superscript nodes to ^(text)
    visit(cloned, 'superscript', (node: SuperscriptNode, index, parent) => {
      if (index == null || !parent) return;
      const hasSpaces = node.value.includes(' ');
      const text: Text = { type: 'text', value: hasSpaces ? `^(${node.value})` : `^${node.value}` };
      replaceNode(parent, index, text);
    });

    // Downgrade remaining custom nodes
    downgradeCustomNodes(cloned, warnings, ['spoiler', 'superscript']);

    const serializer = createSerializer();

    return serializer.stringify(cloned);
  },
};
