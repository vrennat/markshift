import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import TurndownService from 'turndown';
import type { Root } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning } from '../types';
import { downgradeCustomNodes } from '../utils/mdast-helpers';
import { cleanGDocsHtml } from '../utils/gdocs-html-cleaner';
import { warn, WARNINGS } from '../warnings';
import { createSerializer } from '../utils/remark-helpers';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// Add strikethrough rule
turndownService.addRule('strikethrough', {
  filter: ['del', 's', 'strike'] as any,
  replacement: (content) => `~~${content}~~`,
});

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm);

export const gdocs: FormatModule = {
  id: 'gdocs',
  label: 'Google Docs',
  description: 'Google Docs HTML export',

  async parse(input: string): Promise<ParseResult> {
    const warnings: ConversionWarning[] = [];

    // Detect if input is HTML or plain text
    const isHtml = /<[a-z][\s\S]*>/i.test(input);

    let markdown: string;
    if (isHtml) {
      // Clean Google Docs HTML quirks
      const cleanedHtml = cleanGDocsHtml(input);
      // Convert HTML to markdown via Turndown
      markdown = turndownService.turndown(cleanedHtml);
    } else {
      // Assume already markdown
      markdown = input;
    }

    // Parse markdown to mdast
    const tree = parser.parse(markdown) as Root;

    return { tree, warnings };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    const cloned = structuredClone(tree);

    // Downgrade all custom nodes (GDocs doesn't support any)
    downgradeCustomNodes(cloned, warnings);

    // Add info warning
    warnings.push(warn('info', WARNINGS.GDOCS_INFO));

    const serializer = createSerializer();

    return serializer.stringify(cloned);
  },
};
