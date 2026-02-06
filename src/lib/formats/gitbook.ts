import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning } from '../types';
import { downgradeCustomNodes, spliceNodes } from '../utils/mdast-helpers';
import { warn, WARNINGS } from '../warnings';
import { visit } from 'unist-util-visit';
import { createSerializer } from '../utils/remark-helpers';

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm);

export const gitbook: FormatModule = {
  id: 'gitbook',
  label: 'GitBook',
  description: 'GitBook documentation markdown',

  async parse(input: string): Promise<ParseResult> {
    const tree = parser.parse(input) as Root;
    return { tree, warnings: [] };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    const cloned = structuredClone(tree);

    // Remove horizontal rules (not supported)
    visit(cloned, 'thematicBreak', (node, index, parent) => {
      if (index == null || !parent) return;
      spliceNodes(parent, index, 1);
      warnings.push(warn('info', WARNINGS.HR_NOT_SUPPORTED, 'thematicBreak'));
      return index;
    });

    // Downgrade custom nodes
    downgradeCustomNodes(cloned, warnings);

    const serializer = createSerializer();

    return serializer.stringify(cloned);
  },
};
