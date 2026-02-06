import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import type { Root } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning } from '../types';
import { parseCallouts, serializeCallouts, downgradeCustomNodes } from '../utils/mdast-helpers';
import { createSerializer } from '../utils/remark-helpers';

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ['yaml'])
  .use(remarkMath);

export const gfm: FormatModule = {
  id: 'gfm',
  label: 'GitHub',
  description: 'GitHub Flavored Markdown',

  async parse(input: string): Promise<ParseResult> {
    const tree = parser.parse(input) as Root;
    const warnings: ConversionWarning[] = [];

    // Transform blockquotes with [!NOTE] etc. into CalloutNodes
    parseCallouts(tree);

    return { tree, warnings };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    // Clone tree to avoid mutating the original
    const cloned = structuredClone(tree);

    // Convert callouts back to GFM-style blockquotes
    serializeCallouts(cloned);

    // Downgrade any remaining custom nodes
    downgradeCustomNodes(cloned, warnings, ['callout', 'math', 'inlineMath', 'yaml']);

    const serializer = createSerializer({ frontmatter: true, math: true });

    const result = serializer.stringify(cloned);
    return result;
  },
};
