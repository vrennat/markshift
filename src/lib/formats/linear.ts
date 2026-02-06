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

export const linear: FormatModule = {
  id: 'linear',
  label: 'Linear',
  description: 'Linear issue markdown',

  async parse(input: string): Promise<ParseResult> {
    const tree = parser.parse(input) as Root;
    const warnings: ConversionWarning[] = [];

    // Linear supports similar callout syntax
    parseCallouts(tree);

    return { tree, warnings };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    const cloned = structuredClone(tree);

    // Convert callouts to blockquotes for Linear
    serializeCallouts(cloned);

    // Downgrade custom nodes (no math, no footnotes in Linear)
    downgradeCustomNodes(cloned, warnings, ['callout']);

    const serializer = createSerializer();

    return serializer.stringify(cloned);
  },
};
