import type { Root, Paragraph, Text, Strong, Emphasis, Delete, InlineCode, Code, Link, List, ListItem, Blockquote, Heading, Image, ThematicBreak, Table, TableRow, TableCell, PhrasingContent, BlockContent, Html } from 'mdast';
import type { ConversionWarning, MentionNode, EmojiNode, CalloutNode } from '../types';
import { toString } from 'mdast-util-to-string';
import { warn, WARNINGS } from '../warnings';

/**
 * Serialize mdast tree to Slack mrkdwn format.
 */
export function serializeSlackMrkdwn(tree: Root, warnings: ConversionWarning[]): string {
  const parts: string[] = [];

  for (const node of tree.children) {
    const result = serializeBlock(node as BlockContent, warnings);
    if (result !== null) {
      parts.push(result);
    }
  }

  return parts.join('\n\n');
}

function serializeBlock(node: BlockContent, warnings: ConversionWarning[]): string | null {
  switch (node.type) {
    case 'paragraph':
      return serializeInlineChildren((node as Paragraph).children, warnings);

    case 'heading': {
      const h = node as Heading;
      // Slack has no headings - convert to bold
      const text = serializeInlineChildren(h.children, warnings);
      warnings.push(warn('warning', WARNINGS.HEADING_TO_BOLD, 'heading'));
      return `*${text}*`;
    }

    case 'code': {
      const c = node as Code;
      if (c.lang) {
        warnings.push(warn('info', WARNINGS.CODE_BLOCK_LANG_DROPPED, 'code'));
      }
      return '```\n' + c.value + '\n```';
    }

    case 'blockquote': {
      const bq = node as Blockquote;
      const content = bq.children
        .map(child => serializeBlock(child as BlockContent, warnings))
        .filter(Boolean)
        .join('\n');
      return content.split('\n').map(line => `> ${line}`).join('\n');
    }

    case 'list': {
      const list = node as List;
      return list.children
        .map((item, idx) => {
          const li = item as ListItem;
          const content = li.children
            .map(child => serializeBlock(child as BlockContent, warnings))
            .filter(Boolean)
            .join('\n');
          const prefix = list.ordered ? `${idx + 1}. ` : '• ';
          return `${prefix}${content}`;
        })
        .join('\n');
    }

    case 'thematicBreak':
      // Slack doesn't support horizontal rules natively, use a text separator
      return '---';

    case 'table': {
      const table = node as Table;
      warnings.push(warn('warning', WARNINGS.TABLE_TO_TEXT, 'table'));
      return table.children.map(row => {
        const cells = (row as TableRow).children.map(cell =>
          serializeInlineChildren((cell as TableCell).children, warnings)
        );
        return cells.join(' | ');
      }).join('\n');
    }

    case 'html': {
      warnings.push(warn('info', WARNINGS.HTML_STRIPPED, 'html'));
      return null;
    }

    // Handle callout as blockquote
    case 'callout' as any: {
      const callout = node as unknown as CalloutNode;
      const title = callout.data?.title || callout.data?.calloutType || '';
      const content = callout.children
        .map(child => serializeBlock(child as BlockContent, warnings))
        .filter(Boolean)
        .join('\n');
      const body = title ? `*${title}*\n${content}` : content;
      return body.split('\n').map(line => `> ${line}`).join('\n');
    }

    default:
      return toString(node);
  }
}

function serializeInlineChildren(children: PhrasingContent[], warnings: ConversionWarning[]): string {
  return children.map(child => serializeInline(child, warnings)).join('');
}

function serializeInline(node: PhrasingContent, warnings: ConversionWarning[]): string {
  switch (node.type) {
    case 'text':
      return (node as Text).value;

    case 'strong': {
      const s = node as Strong;
      const content = serializeInlineChildren(s.children, warnings);
      return `*${content}*`;
    }

    case 'emphasis': {
      const e = node as Emphasis;
      const content = serializeInlineChildren(e.children, warnings);
      return `_${content}_`;
    }

    case 'delete': {
      const d = node as Delete;
      const content = serializeInlineChildren(d.children, warnings);
      return `~${content}~`;
    }

    case 'inlineCode':
      return `\`${(node as InlineCode).value}\``;

    case 'link': {
      const link = node as Link;
      const text = serializeInlineChildren(link.children, warnings);
      if (text === link.url) return `<${link.url}>`;
      return `<${link.url}|${text}>`;
    }

    case 'image': {
      const img = node as Image;
      warnings.push(warn('info', WARNINGS.IMAGE_LINK_ONLY, 'image'));
      return img.alt ? `<${img.url}|${img.alt}>` : `<${img.url}>`;
    }

    case 'break':
      return '\n';

    // Custom nodes
    case 'mention' as any: {
      const mention = node as unknown as MentionNode;
      return `<@${mention.data?.userId || mention.value}>`;
    }

    case 'emoji' as any: {
      const emoji = node as unknown as EmojiNode;
      return `:${emoji.value}:`;
    }

    default:
      return toString(node);
  }
}
