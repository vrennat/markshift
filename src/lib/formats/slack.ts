import type { Root } from 'mdast';
import type { FormatModule, ParseResult, ConversionWarning } from '../types';
import { parseSlackMrkdwn } from '../utils/slack-parser';
import { serializeSlackMrkdwn } from '../utils/slack-serializer';
import { downgradeCustomNodes } from '../utils/mdast-helpers';

export const slack: FormatModule = {
  id: 'slack',
  label: 'Slack',
  description: 'Slack messaging markup format',

  async parse(input: string): Promise<ParseResult> {
    const tree = parseSlackMrkdwn(input);
    return { tree, warnings: [] };
  },

  async serialize(tree: Root, warnings: ConversionWarning[]): Promise<string> {
    const cloned = structuredClone(tree);
    // Downgrade custom nodes before serializing (keep mention/emoji which slack handles natively)
    downgradeCustomNodes(cloned, warnings, ['mention', 'emoji', 'callout']);
    return serializeSlackMrkdwn(cloned, warnings);
  },
};
