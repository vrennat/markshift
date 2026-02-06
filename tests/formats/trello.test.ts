import { describe, it, expect } from 'vitest';
import { trello } from '../../src/lib/formats/trello';
import { gfm } from '../../src/lib/formats/gfm';
import { convert } from '../../src/lib/convert';

describe('Trello format', () => {
  describe('parse', () => {
    it('should parse basic markdown', async () => {
      const input = '# Title\n\n**bold** and *italic*';
      const { tree } = await trello.parse(input);
      expect(tree.type).toBe('root');
    });

    it('should parse lists', async () => {
      const input = '- item 1\n- item 2';
      const { tree } = await trello.parse(input);
      expect(tree.children.some(n => n.type === 'list')).toBe(true);
    });
  });

  describe('serialize', () => {
    it('should convert tables to text', async () => {
      const input = '| A | B |\n|---|---|\n| 1 | 2 |';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      await trello.serialize(tree, warnings);
      expect(warnings.some(w => w.message.includes('Tables'))).toBe(true);
    });

    it('should strip syntax highlighting', async () => {
      const input = '```javascript\nconsole.log("hi")\n```';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      const output = await trello.serialize(tree, warnings);
      expect(output).toContain('```\n');
      expect(output).not.toContain('javascript');
    });

    it('should remove task list checkboxes', async () => {
      const input = '- [x] Done\n- [ ] Todo';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      await trello.serialize(tree, warnings);
      expect(warnings.some(w => w.message.includes('checkboxes'))).toBe(true);
    });

    it('should round-trip basic content', async () => {
      const input = '# Title\n\nParagraph.\n';
      const { tree } = await trello.parse(input);
      const output = await trello.serialize(tree, []);
      expect(output).toContain('# Title');
      expect(output).toContain('Paragraph');
    });
  });

  describe('cross-format', () => {
    it('should convert GFM to Trello', async () => {
      const result = await convert('# Title\n\n**bold**', 'gfm', 'trello');
      expect(result.output).toContain('# Title');
      expect(result.output).toContain('**bold**');
    });
  });
});
