import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, Blockquote, Paragraph, Text, BlockContent, Strong, PhrasingContent } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning, CalloutNode } from '../types';
import { visit } from 'unist-util-visit';
import { parseCallouts, downgradeCustomNodes, replaceNode } from '../utils/mdast-helpers';
import { warn, WARNINGS } from '../warnings';
import { createSerializer } from '../utils/remark-helpers';

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm);

// Notion callout emoji mapping
const NOTION_CALLOUT_EMOJI: Record<string, string> = {
  note: '\u2139\uFE0F',
  tip: '\uD83D\uDCA1',
  important: '\u2757',
  warning: '\u26A0\uFE0F',
  caution: '\uD83D\uDD25',
  info: '\u2139\uFE0F',
  success: '\u2705',
  question: '\u2753',
  quote: '\uD83D\uDCAC',
  example: '\uD83D\uDCDD',
  bug: '\uD83D\uDC1B',
  abstract: '\uD83D\uDCC4',
  todo: '\u2611\uFE0F',
  failure: '\u274C',
  danger: '\u26A1',
};

export const notion: FormatModule = {
  id: 'notion',
  label: 'Notion',
  description: 'Notion markdown export format',

  async parse(input: string): Promise<ParseResult> {
    const tree = parser.parse(input) as Root;
    const warnings: ConversionWarning[] = [];

    // Parse callout syntax
    parseCallouts(tree);

    // Also detect Notion-style callouts: blockquotes starting with emoji
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      if (index == null || !parent) return;
      if (node.children.length === 0) return;

      const firstChild = node.children[0];
      if (firstChild.type !== 'paragraph') return;

      const firstInline = firstChild.children[0];
      if (!firstInline || firstInline.type !== 'text') return;

      // Check if starts with a known emoji pattern (emoji + space)
      const emojiMatch = firstInline.value.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u2139\uFE0F\u2757\u26A0\uFE0F\u2705\u2753\u274C\u26A1\u2611\uFE0F]+)\s*(.*)/u);
      if (!emojiMatch) return;

      // Convert to callout
      const emoji = emojiMatch[1];
      const restText = emojiMatch[2];

      // Reverse-map emoji to callout type
      let calloutType = 'note';
      for (const [type, e] of Object.entries(NOTION_CALLOUT_EMOJI)) {
        if (e === emoji) { calloutType = type; break; }
      }

      const remainingInlines: PhrasingContent[] = [...firstChild.children.slice(1)];
      if (restText) {
        remainingInlines.unshift({ type: 'text', value: restText } as Text);
      }

      const children: BlockContent[] = [];
      if (remainingInlines.length > 0) {
        children.push({ type: 'paragraph', children: remainingInlines });
      }
      children.push(...(node.children.slice(1) as BlockContent[]));

      const callout: CalloutNode = {
        type: 'callout',
        data: { calloutType, title: calloutType },
        children,
      };
      replaceNode(parent, index, callout);
    });

    return { tree, warnings };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    const cloned = structuredClone(tree);

    // Convert callouts to Notion-style blockquotes with emoji prefix
    visit(cloned, 'callout', (node: CalloutNode, index, parent) => {
      if (index == null || !parent) return;

      const calloutType = node.data.calloutType;
      const emoji = NOTION_CALLOUT_EMOJI[calloutType] || '\u2139\uFE0F';

      // Build content: emoji + space + title/content
      const contentChildren: BlockContent[] = [];

      if (node.children.length > 0) {
        const firstBlock = node.children[0];
        if (firstBlock.type === 'paragraph') {
          // Prepend emoji to first paragraph
          const newParagraph: Paragraph = {
            type: 'paragraph',
            children: [
              { type: 'text', value: `${emoji} ` } as Text,
              ...firstBlock.children as PhrasingContent[],
            ],
          };
          contentChildren.push(newParagraph);
          contentChildren.push(...(node.children.slice(1) as BlockContent[]));
        } else {
          contentChildren.push({
            type: 'paragraph',
            children: [{ type: 'text', value: `${emoji} ` } as Text],
          });
          contentChildren.push(...(node.children as BlockContent[]));
        }
      } else {
        contentChildren.push({
          type: 'paragraph',
          children: [{ type: 'text', value: emoji } as Text],
        });
      }

      const blockquote: Blockquote = {
        type: 'blockquote',
        children: contentChildren,
      };
      replaceNode(parent, index, blockquote);
    });

    // Downgrade remaining custom nodes
    downgradeCustomNodes(cloned, warnings);

    const serializer = createSerializer();

    return serializer.stringify(cloned);
  },
};
