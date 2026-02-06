import type { Root, Paragraph, Text, Strong, Emphasis, Link, Blockquote, BlockContent, PhrasingContent, Code, InlineCode } from 'mdast';
import type { Parent, Node } from 'unist';
import type { ConversionWarning, CalloutNode, WikilinkNode, EmbedNode, TagNode, MentionNode, EmojiNode, SpoilerNode, UnderlineNode, HighlightNode, SubtextNode, SuperscriptNode } from '../types';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { warn, WARNINGS } from '../warnings';

type CustomNodeType = 'wikilink' | 'embed' | 'callout' | 'tag' | 'mention' | 'emoji' | 'spoiler' | 'underline' | 'highlight' | 'subtext' | 'superscript' | 'math' | 'inlineMath' | 'yaml';

/** Replace a child node at a given index. Avoids `as any` casts on parent.children. */
export function replaceNode(parent: Parent, index: number, node: Node): void {
  (parent.children as Node[])[index] = node;
}

/** Splice children in a parent node. Avoids `as any` casts on parent.children. */
export function spliceNodes(parent: Parent, index: number, deleteCount: number, ...nodes: Node[]): void {
  (parent.children as Node[]).splice(index, deleteCount, ...nodes);
}

/**
 * Downgrade custom nodes to standard mdast nodes.
 * Used when the target format doesn't support format-specific features.
 */
export function downgradeCustomNodes(tree: Root, warnings: ConversionWarning[], skip: CustomNodeType[] = []): void {
  // Wikilinks -> standard links
  if (!skip.includes('wikilink')) {
    visit(tree, 'wikilink', (node: WikilinkNode, index, parent) => {
      if (index == null || !parent) return;
      const alias = node.data?.alias || node.value;
      const heading = node.data?.heading ? `#${node.data.heading}` : '';
      const link: Link = {
        type: 'link',
        url: `${node.value}${heading}`,
        children: [{ type: 'text', value: alias } as Text],
      };
      replaceNode(parent, index, link);
      warnings.push(warn('warning', WARNINGS.WIKILINK_TO_LINK, 'wikilink'));
    });
  }

  // Embeds -> links
  if (!skip.includes('embed')) {
    visit(tree, 'embed', (node: EmbedNode, index, parent) => {
      if (index == null || !parent) return;
      const alt = node.data?.alt || node.value;
      const link: Link = {
        type: 'link',
        url: node.value,
        children: [{ type: 'text', value: alt } as Text],
      };
      replaceNode(parent, index, link);
      warnings.push(warn('warning', WARNINGS.EMBED_TO_LINK, 'embed'));
    });
  }

  // Callouts -> blockquotes
  if (!skip.includes('callout')) {
    visit(tree, 'callout', (node: CalloutNode, index, parent) => {
      if (index == null || !parent) return;
      const title = node.data?.title || node.data?.calloutType || '';
      const titleParagraph: Paragraph = {
        type: 'paragraph',
        children: [
          { type: 'strong', children: [{ type: 'text', value: title } as Text] } as Strong,
        ],
      };
      const blockquote: Blockquote = {
        type: 'blockquote',
        children: [titleParagraph, ...(node.children as BlockContent[])],
      };
      replaceNode(parent, index, blockquote);
      warnings.push(warn('info', WARNINGS.CALLOUT_TO_BLOCKQUOTE, 'callout'));
    });
  }

  // Tags -> text
  if (!skip.includes('tag')) {
    visit(tree, 'tag', (node: TagNode, index, parent) => {
      if (index == null || !parent) return;
      const text: Text = { type: 'text', value: `#${node.value}` };
      replaceNode(parent, index, text);
      warnings.push(warn('info', WARNINGS.TAG_DROPPED, 'tag'));
    });
  }

  // Mentions -> text
  if (!skip.includes('mention')) {
    visit(tree, 'mention', (node: MentionNode, index, parent) => {
      if (index == null || !parent) return;
      const label = node.data?.label || node.value;
      const text: Text = { type: 'text', value: `@${label}` };
      replaceNode(parent, index, text);
      warnings.push(warn('info', WARNINGS.MENTION_TO_TEXT, 'mention'));
    });
  }

  // Emoji shortcodes -> text
  if (!skip.includes('emoji')) {
    visit(tree, 'emoji', (node: EmojiNode, index, parent) => {
      if (index == null || !parent) return;
      const text: Text = { type: 'text', value: `:${node.value}:` };
      replaceNode(parent, index, text);
      warnings.push(warn('info', WARNINGS.EMOJI_TO_TEXT, 'emoji'));
    });
  }

  // Spoilers -> plain text (unwrap children)
  if (!skip.includes('spoiler')) {
    visit(tree, 'spoiler', (node: SpoilerNode, index, parent) => {
      if (index == null || !parent) return;
      spliceNodes(parent, index, 1, ...node.children);
      warnings.push(warn('info', WARNINGS.SPOILER_TO_TEXT, 'spoiler'));
      return index; // revisit this index since we spliced
    });
  }

  // Underline -> emphasis
  if (!skip.includes('underline')) {
    visit(tree, 'underline', (node: UnderlineNode, index, parent) => {
      if (index == null || !parent) return;
      const em: Emphasis = { type: 'emphasis', children: node.children as PhrasingContent[] };
      replaceNode(parent, index, em);
      warnings.push(warn('info', WARNINGS.UNDERLINE_TO_EMPHASIS, 'underline'));
    });
  }

  // Highlight -> bold
  if (!skip.includes('highlight')) {
    visit(tree, 'highlight', (node: HighlightNode, index, parent) => {
      if (index == null || !parent) return;
      const strong: Strong = { type: 'strong', children: node.children as PhrasingContent[] };
      replaceNode(parent, index, strong);
      warnings.push(warn('info', WARNINGS.HIGHLIGHT_TO_BOLD, 'highlight'));
    });
  }

  // Subtext -> plain text
  if (!skip.includes('subtext')) {
    visit(tree, 'subtext', (node: SubtextNode, index, parent) => {
      if (index == null || !parent) return;
      spliceNodes(parent, index, 1, ...node.children);
      warnings.push(warn('info', WARNINGS.SUBTEXT_TO_TEXT, 'subtext'));
      return index;
    });
  }

  // Superscript -> text
  if (!skip.includes('superscript')) {
    visit(tree, 'superscript', (node: SuperscriptNode, index, parent) => {
      if (index == null || !parent) return;
      const text: Text = { type: 'text', value: node.value };
      replaceNode(parent, index, text);
      warnings.push(warn('info', WARNINGS.SUPERSCRIPT_TO_TEXT, 'superscript'));
    });
  }

  // Inline math -> text with $delimiters$
  if (!skip.includes('inlineMath')) {
    visit(tree, 'inlineMath', (node: { value: string }, index, parent) => {
      if (index == null || !parent) return;
      const text: Text = { type: 'text', value: `$${node.value}$` };
      replaceNode(parent, index, text);
    });
  }

  // Block math -> code block
  if (!skip.includes('math')) {
    visit(tree, 'math', (node: { value: string }, index, parent) => {
      if (index == null || !parent) return;
      const code: Code = { type: 'code', lang: 'math', value: node.value };
      replaceNode(parent, index, code);
    });
  }

  // YAML frontmatter -> remove
  if (!skip.includes('yaml')) {
    tree.children = tree.children.filter(node => {
      if (node.type === 'yaml') {
        warnings.push(warn('info', WARNINGS.FRONTMATTER_DROPPED, 'yaml'));
        return false;
      }
      return true;
    });
  }
}

/**
 * Parse GitHub/Obsidian-style callouts from blockquotes.
 * Transforms `> [!NOTE]` blockquotes into CalloutNode.
 */
export function parseCallouts(tree: Root): void {
  visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
    if (index == null || !parent) return;
    if (node.children.length === 0) return;

    const firstChild = node.children[0];
    if (firstChild.type !== 'paragraph') return;

    const firstInline = firstChild.children[0];
    if (!firstInline || firstInline.type !== 'text') return;

    const match = firstInline.value.match(/^\[!(\w+)\]([+-])?\s*(.*)/);
    if (!match) return;

    const [, calloutType, foldChar, titleRest] = match;
    const foldable = foldChar === '-' || foldChar === '+';
    const title = titleRest || calloutType;

    // Build the callout content
    const remainingInlines = firstChild.children.slice(1);
    const remainingBlocks = node.children.slice(1) as BlockContent[];

    const children: BlockContent[] = [];
    if (remainingInlines.length > 0) {
      // Strip leading whitespace from first remaining inline
      if (remainingInlines[0].type === 'text') {
        remainingInlines[0] = { ...remainingInlines[0], value: remainingInlines[0].value.replace(/^\n?/, '') };
      }
      if (remainingInlines.some(n => n.type === 'text' ? (n as Text).value.trim() : true)) {
        children.push({ type: 'paragraph', children: remainingInlines as PhrasingContent[] });
      }
    }
    children.push(...remainingBlocks);

    const callout: CalloutNode = {
      type: 'callout',
      data: { calloutType: calloutType.toLowerCase(), title, foldable },
      children,
    };
    replaceNode(parent, index, callout);
  });
}

/**
 * Convert CalloutNodes back to GFM-style `> [!TYPE]` blockquotes.
 */
export function serializeCallouts(tree: Root): void {
  visit(tree, 'callout', (node: CalloutNode, index, parent) => {
    if (index == null || !parent) return;

    const typeStr = node.data.calloutType.toUpperCase();
    const title = node.data.title && node.data.title !== node.data.calloutType
      ? ` ${node.data.title}`
      : '';
    const fold = node.data.foldable ? '-' : '';

    const headerText: Text = { type: 'text', value: `[!${typeStr}]${fold}${title}` };
    const headerParagraph: Paragraph = { type: 'paragraph', children: [headerText] };

    const blockquote: Blockquote = {
      type: 'blockquote',
      children: [headerParagraph, ...(node.children as BlockContent[])],
    };
    replaceNode(parent, index, blockquote);
  });
}
