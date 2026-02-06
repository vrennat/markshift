import { describe, it, expect } from 'vitest';
import { joplin } from '../../src/lib/formats/joplin';
import { gfm } from '../../src/lib/formats/gfm';
import { convert } from '../../src/lib/convert';

describe('Joplin format', () => {
  describe('parse', () => {
    it('should parse basic markdown', async () => {
      const input = '# Title\n\n**bold** and *italic*';
      const { tree } = await joplin.parse(input);
      expect(tree.type).toBe('root');
    });

    it('should parse highlight syntax', async () => {
      const input = 'This is ==highlighted== text';
      const { tree } = await joplin.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'highlight')).toBe(true);
    });

    it('should parse callouts', async () => {
      const input = '> [!NOTE]\n> Important info';
      const { tree } = await joplin.parse(input);
      expect(tree.children.some(n => n.type === 'callout')).toBe(true);
    });

    it('should parse tables', async () => {
      const input = '| A | B |\n|---|---|\n| 1 | 2 |';
      const { tree } = await joplin.parse(input);
      expect(tree.children.some(n => n.type === 'table')).toBe(true);
    });
  });

  describe('serialize', () => {
    it('should round-trip highlight syntax', async () => {
      const input = 'This is ==highlighted== text';
      const { tree } = await joplin.parse(input);
      const output = await joplin.serialize(tree, []);
      expect(output).toContain('==highlighted==');
    });

    it('should convert highlights to bold for GFM', async () => {
      const result = await convert('This is ==highlighted== text', 'joplin', 'gfm');
      expect(result.output).toContain('**highlighted**');
      expect(result.warnings.some(w => w.message.includes('Highlighted'))).toBe(true);
    });

    it('should preserve callouts', async () => {
      const input = '> [!NOTE]\n> Info here';
      const { tree } = await joplin.parse(input);
      const output = await joplin.serialize(tree, []);
      expect(output).toContain('[!NOTE]');
    });
  });
});
