import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, Text, Paragraph, Code, Table, TableRow, TableCell } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning } from '../types';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { downgradeCustomNodes, replaceNode } from '../utils/mdast-helpers';
import { warn, WARNINGS } from '../warnings';
import { createSerializer } from '../utils/remark-helpers';

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm);

export const trello: FormatModule = {
  id: 'trello',
  label: 'Trello',
  description: 'Trello card markdown',

  async parse(input: string): Promise<ParseResult> {
    const tree = parser.parse(input) as Root;
    return { tree, warnings: [] };
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

    // Convert tables to plain text (not supported)
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

    // Remove task list checkboxes (convert to regular list items)
    visit(cloned, 'listItem', (node: any) => {
      if (node.checked != null) {
        warnings.push(warn('info', WARNINGS.TASK_LIST_TO_LIST, 'listItem'));
        node.checked = undefined;
      }
    });

    // Downgrade custom nodes
    downgradeCustomNodes(cloned, warnings);

    const serializer = createSerializer();

    return serializer.stringify(cloned);
  },
};
