import { describe, it, expect } from 'vitest';
import { linear } from '../../src/lib/formats/linear';

describe('Linear format', () => {
  describe('parse', () => {
    it('should parse basic markdown', async () => {
      const input = '# Issue Title\n\n- Task 1\n- Task 2';
      const { tree } = await linear.parse(input);
      expect(tree.type).toBe('root');
      expect(tree.children.length).toBeGreaterThan(0);
    });
  });

  describe('serialize', () => {
    it('should round-trip basic markdown', async () => {
      const input = '# Title\n\nParagraph.\n';
      const { tree } = await linear.parse(input);
      const output = await linear.serialize(tree, []);
      expect(output).toContain('# Title');
      expect(output).toContain('Paragraph');
    });
  });
});
