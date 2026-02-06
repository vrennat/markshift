import { describe, it, expect } from 'vitest';
import { gfm } from '../../src/lib/formats/gfm';

describe('GFM format', () => {
  describe('parse', () => {
    it('should parse basic markdown', async () => {
      const input = '# Hello\n\nThis is a **bold** and *italic* test.';
      const { tree } = await gfm.parse(input);
      expect(tree.type).toBe('root');
      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should parse GFM tables', async () => {
      const input = '| A | B |\n|---|---|\n| 1 | 2 |';
      const { tree } = await gfm.parse(input);
      expect(tree.children.some(n => n.type === 'table')).toBe(true);
    });

    it('should parse task lists', async () => {
      const input = '- [x] Done\n- [ ] Todo';
      const { tree } = await gfm.parse(input);
      expect(tree.children.some(n => n.type === 'list')).toBe(true);
    });

    it('should parse callouts', async () => {
      const input = '> [!NOTE]\n> This is a note';
      const { tree } = await gfm.parse(input);
      expect(tree.children.some(n => n.type === 'callout')).toBe(true);
    });

    it('should parse strikethrough', async () => {
      const input = '~~deleted text~~';
      const { tree } = await gfm.parse(input);
      expect(tree.type).toBe('root');
    });
  });

  describe('serialize', () => {
    it('should round-trip basic markdown', async () => {
      const input = '# Hello\n\nParagraph text.\n';
      const { tree } = await gfm.parse(input);
      const output = await gfm.serialize(tree, []);
      expect(output).toContain('# Hello');
      expect(output).toContain('Paragraph text.');
    });

    it('should round-trip GFM tables', async () => {
      const input = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
      const { tree } = await gfm.parse(input);
      const output = await gfm.serialize(tree, []);
      expect(output).toContain('| A | B |');
    });

    it('should serialize callouts back to blockquote syntax', async () => {
      const input = '> [!NOTE]\n> This is a note';
      const { tree } = await gfm.parse(input);
      const output = await gfm.serialize(tree, []);
      expect(output).toContain('[!NOTE]');
    });
  });
});
