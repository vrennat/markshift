import type { Root, Text, Paragraph, PhrasingContent } from 'mdast';
import type { WikilinkNode, EmbedNode, TagNode } from '../types';
import { visit } from 'unist-util-visit';
import { parseCallouts } from '../utils/mdast-helpers';

/**
 * Remark plugin for Obsidian-specific syntax.
 * Transforms text nodes containing [[wikilinks]], ![[embeds]], and #tags
 * into custom mdast node types.
 */
export function remarkObsidian() {
  return (tree: Root) => {
    // Parse callouts first (> [!NOTE] style)
    parseCallouts(tree);

    // Transform inline text nodes for wikilinks, embeds, and tags
    visit(tree, 'paragraph', (node: Paragraph) => {
      const newChildren: PhrasingContent[] = [];
      let changed = false;

      for (const child of node.children) {
        if (child.type !== 'text') {
          newChildren.push(child);
          continue;
        }

        const parts = parseInlineObsidian((child as Text).value);
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
  };
}

interface ParsedPart {
  type: string;
  [key: string]: any;
}

function parseInlineObsidian(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  // Match ![[embed]], [[wikilink|alias]], [[wikilink#heading|alias]], [[wikilink]], or #tag
  const regex = /!\[\[([^\]]+)\]\]|\[\[([^\]]+)\]\]|(?<![&\w])#([a-zA-Z][\w/-]*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      // ![[embed]]
      const [target, alt] = match[1].split('|');
      parts.push({
        type: 'embed',
        value: target.trim(),
        data: alt ? { alt: alt.trim() } : undefined,
      } as EmbedNode);
    } else if (match[2] !== undefined) {
      // [[wikilink]] or [[wikilink|alias]] or [[wikilink#heading|alias]]
      const full = match[2];
      const pipeIndex = full.indexOf('|');
      const pathPart = pipeIndex >= 0 ? full.slice(0, pipeIndex) : full;
      const alias = pipeIndex >= 0 ? full.slice(pipeIndex + 1).trim() : undefined;
      const hashIndex = pathPart.indexOf('#');
      const target = hashIndex >= 0 ? pathPart.slice(0, hashIndex).trim() : pathPart.trim();
      const heading = hashIndex >= 0 ? pathPart.slice(hashIndex + 1).trim() : undefined;

      parts.push({
        type: 'wikilink',
        value: target,
        data: {
          ...(alias ? { alias } : {}),
          ...(heading ? { heading } : {}),
        },
      } as WikilinkNode);
    } else if (match[3] !== undefined) {
      // #tag
      parts.push({
        type: 'tag',
        value: match[3],
      } as TagNode);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', value: text });
  }

  return parts;
}
