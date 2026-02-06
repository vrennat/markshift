import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning } from '../types';
import { parseCallouts, serializeCallouts, downgradeCustomNodes } from '../utils/mdast-helpers';
import { createSerializer } from '../utils/remark-helpers';

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm);

export const mattermost: FormatModule = {
  id: 'mattermost',
  label: 'Mattermost',
  description: 'Mattermost messaging markdown',

  async parse(input: string): Promise<ParseResult> {
    const tree = parser.parse(input) as Root;
    const warnings: ConversionWarning[] = [];
    parseCallouts(tree);
    return { tree, warnings };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    const cloned = structuredClone(tree);

    serializeCallouts(cloned);

    // Downgrade custom nodes
    downgradeCustomNodes(cloned, warnings, ['callout']);

    const serializer = createSerializer();

    return serializer.stringify(cloned);
  },
};
