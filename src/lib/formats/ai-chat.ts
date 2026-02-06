import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Root } from 'mdast';
import type { FormatId, FormatModule, ParseResult, ConversionWarning } from '../types';
import { parseCallouts, serializeCallouts, downgradeCustomNodes } from '../utils/mdast-helpers';
import { createSerializer } from '../utils/remark-helpers';

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath);

function createAIChatFormat(id: FormatId, label: string, description: string): FormatModule {
  return {
    id,
    label,
    description,

    async parse(input: string): Promise<ParseResult> {
      const tree = parser.parse(input) as Root;
      const warnings: ConversionWarning[] = [];
      parseCallouts(tree);
      return { tree, warnings };
    },

    async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
      const cloned = structuredClone(tree);
      serializeCallouts(cloned);
      downgradeCustomNodes(cloned, warnings, ['callout', 'math', 'inlineMath']);
      const serializer = createSerializer({ math: true });
      return serializer.stringify(cloned);
    },
  };
}

export const claude = createAIChatFormat('claude', 'Claude', 'Anthropic Claude markdown output');
export const chatgpt = createAIChatFormat('chatgpt', 'ChatGPT', 'OpenAI ChatGPT markdown output');
export const gemini = createAIChatFormat('gemini', 'Gemini', 'Google Gemini markdown output');
export const grok = createAIChatFormat('grok', 'Grok', 'xAI Grok markdown output');
