import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import type { Root, Text, Paragraph, PhrasingContent } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning, HighlightNode } from '../types';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { parseCallouts, serializeCallouts, downgradeCustomNodes, replaceNode } from '../utils/mdast-helpers';
import { createSerializer } from '../utils/remark-helpers';

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ['yaml'])
  .use(remarkMath);

function parseHighlight(tree: Root): void {
  visit(tree, 'paragraph', (node: Paragraph) => {
    const newChildren: PhrasingContent[] = [];
    let changed = false;
    for (const child of node.children) {
      if (child.type !== 'text') {
        newChildren.push(child);
        continue;
      }
      const parts = parseHighlightText((child as Text).value);
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

function parseHighlightText(text: string): PhrasingContent[] {
  const parts: PhrasingContent[] = [];
  const regex = /==(.+?)==/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) } as Text);
    }
    parts.push({
      type: 'highlight',
      children: [{ type: 'text', value: match[1] } as Text],
    } as HighlightNode);
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

export const joplin: FormatModule = {
  id: 'joplin',
  label: 'Joplin',
  description: 'Joplin note-taking markdown',

  async parse(input: string): Promise<ParseResult> {
    const tree = parser.parse(input) as Root;
    const warnings: ConversionWarning[] = [];
    parseCallouts(tree);
    parseHighlight(tree);
    return { tree, warnings };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    const cloned = structuredClone(tree);

    serializeCallouts(cloned);

    // Convert highlight nodes back to ==text==
    visit(cloned, 'highlight', (node: HighlightNode, index, parent) => {
      if (index == null || !parent) return;
      const inner = toString(node);
      const text: Text = { type: 'text', value: `==${inner}==` };
      replaceNode(parent, index, text);
    });

    // Downgrade remaining custom nodes
    downgradeCustomNodes(cloned, warnings, ['callout', 'highlight', 'math', 'inlineMath', 'yaml']);

    const serializer = createSerializer({ frontmatter: true, math: true });

    return serializer.stringify(cloned);
  },
};
