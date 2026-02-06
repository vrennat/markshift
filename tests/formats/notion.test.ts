import { describe, it, expect } from 'vitest';
import { notion } from '../../src/lib/formats/notion';

describe('Notion format', () => {
  describe('parse', () => {
    it('should parse basic markdown', async () => {
      const input = '# Title\n\nSome text with **bold**.';
      const { tree } = await notion.parse(input);
      expect(tree.type).toBe('root');
      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should parse callout syntax', async () => {
      const input = '> [!NOTE]\n> Important info';
      const { tree } = await notion.parse(input);
      expect(tree.children.some(n => n.type === 'callout')).toBe(true);
    });
  });

  describe('serialize', () => {
    it('should serialize basic content', async () => {
      const input = '# Title\n\nParagraph.';
      const { tree } = await notion.parse(input);
      const output = await notion.serialize(tree, []);
      expect(output).toContain('Title');
      expect(output).toContain('Paragraph');
    });
  });
});
