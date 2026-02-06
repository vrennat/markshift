import { describe, it, expect } from 'vitest';
import { gitbook } from '../../src/lib/formats/gitbook';
import { gfm } from '../../src/lib/formats/gfm';

describe('GitBook format', () => {
  describe('parse', () => {
    it('should parse basic markdown', async () => {
      const input = '# Title\n\n**bold** and *italic*';
      const { tree } = await gitbook.parse(input);
      expect(tree.type).toBe('root');
      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should parse tables', async () => {
      const input = '| A | B |\n|---|---|\n| 1 | 2 |';
      const { tree } = await gitbook.parse(input);
      expect(tree.children.some(n => n.type === 'table')).toBe(true);
    });
  });

  describe('serialize', () => {
    it('should remove horizontal rules', async () => {
      const input = 'Before\n\n---\n\nAfter';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      const output = await gitbook.serialize(tree, warnings);
      expect(output).not.toContain('---');
      expect(warnings.some(w => w.message.includes('Horizontal'))).toBe(true);
    });

    it('should preserve tables', async () => {
      const input = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
      const { tree } = await gitbook.parse(input);
      const output = await gitbook.serialize(tree, []);
      expect(output).toContain('| A | B |');
    });

    it('should round-trip basic content', async () => {
      const input = '# Title\n\nParagraph.\n';
      const { tree } = await gitbook.parse(input);
      const output = await gitbook.serialize(tree, []);
      expect(output).toContain('# Title');
      expect(output).toContain('Paragraph');
    });
  });
});
