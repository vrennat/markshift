import { describe, it, expect } from 'vitest';
import { mattermost } from '../../src/lib/formats/mattermost';
import { convert } from '../../src/lib/convert';

describe('Mattermost format', () => {
  describe('parse', () => {
    it('should parse basic markdown', async () => {
      const input = '# Title\n\n**bold** and *italic*';
      const { tree } = await mattermost.parse(input);
      expect(tree.type).toBe('root');
      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should parse tables', async () => {
      const input = '| A | B |\n|---|---|\n| 1 | 2 |';
      const { tree } = await mattermost.parse(input);
      expect(tree.children.some(n => n.type === 'table')).toBe(true);
    });

    it('should parse task lists', async () => {
      const input = '- [x] Done\n- [ ] Todo';
      const { tree } = await mattermost.parse(input);
      expect(tree.children.some(n => n.type === 'list')).toBe(true);
    });
  });

  describe('serialize', () => {
    it('should round-trip basic markdown', async () => {
      const input = '# Title\n\nParagraph.\n';
      const { tree } = await mattermost.parse(input);
      const output = await mattermost.serialize(tree, []);
      expect(output).toContain('# Title');
      expect(output).toContain('Paragraph');
    });

    it('should preserve tables', async () => {
      const input = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
      const { tree } = await mattermost.parse(input);
      const output = await mattermost.serialize(tree, []);
      expect(output).toContain('| A | B |');
    });
  });

  describe('cross-format', () => {
    it('should convert GFM to Mattermost', async () => {
      const result = await convert('# Title\n\n**bold**', 'gfm', 'mattermost');
      expect(result.output).toContain('# Title');
      expect(result.output).toContain('**bold**');
    });
  });
});
