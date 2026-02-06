import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import type { Root, Text, Paragraph, Blockquote, BlockContent, PhrasingContent } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning, WikilinkNode, EmbedNode, TagNode, CalloutNode } from '../types';
import { visit } from 'unist-util-visit';
import { remarkObsidian } from '../remark-plugins/remark-obsidian';
import { downgradeCustomNodes, serializeCallouts, replaceNode } from '../utils/mdast-helpers';
import { createSerializer } from '../utils/remark-helpers';

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ['yaml'])
  .use(remarkMath);

export const obsidian: FormatModule = {
  id: 'obsidian',
  label: 'Obsidian',
  description: 'Obsidian markdown with wikilinks, embeds, callouts, and tags',

  async parse(input: string): Promise<ParseResult> {
    const tree = parser.parse(input) as Root;
    const warnings: ConversionWarning[] = [];

    // Apply Obsidian-specific transforms
    remarkObsidian()(tree);

    return { tree, warnings };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    const cloned = structuredClone(tree);

    // Convert callouts back to Obsidian syntax
    serializeCallouts(cloned);

    // Convert wikilinks, embeds, tags back to Obsidian syntax in-place
    // (We serialize them as text since remark-stringify doesn't know about them)
    visit(cloned, 'wikilink', (node: WikilinkNode, index, parent) => {
      if (index == null || !parent) return;
      const heading = node.data?.heading ? `#${node.data.heading}` : '';
      const alias = node.data?.alias ? `|${node.data.alias}` : '';
      const text: Text = { type: 'text', value: `[[${node.value}${heading}${alias}]]` };
      replaceNode(parent, index, text);
    });

    visit(cloned, 'embed', (node: EmbedNode, index, parent) => {
      if (index == null || !parent) return;
      const alt = node.data?.alt ? `|${node.data.alt}` : '';
      const text: Text = { type: 'text', value: `![[${node.value}${alt}]]` };
      replaceNode(parent, index, text);
    });

    visit(cloned, 'tag', (node: TagNode, index, parent) => {
      if (index == null || !parent) return;
      const text: Text = { type: 'text', value: `#${node.value}` };
      replaceNode(parent, index, text);
    });

    // Downgrade remaining custom nodes (mentions, emoji)
    downgradeCustomNodes(cloned, warnings, ['wikilink', 'embed', 'tag', 'callout', 'math', 'inlineMath', 'yaml']);

    const serializer = createSerializer({ frontmatter: true, math: true });

    let result = serializer.stringify(cloned);
    // Un-escape doubled brackets that remark-stringify escapes (for wikilinks/embeds in text nodes)
    // Only unescape \[\[ (wikilink/embed) and !\[\[ (embed with !), not single \[
    result = result.replace(/!\\\[\\\[/g, '![[').replace(/\\\[\\\[/g, '[[');
    return result;
  },
};
