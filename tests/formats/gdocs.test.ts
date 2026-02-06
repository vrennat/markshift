import { describe, it, expect } from 'vitest';
import { gdocs } from '../../src/lib/formats/gdocs';

describe('Google Docs format', () => {
  describe('parse', () => {
    it('should parse HTML input', async () => {
      const input = '<h1>Title</h1><p>Some <strong>bold</strong> text.</p>';
      const { tree } = await gdocs.parse(input);
      expect(tree.type).toBe('root');
      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should parse plain markdown input', async () => {
      const input = '# Title\n\nSome **bold** text.';
      const { tree } = await gdocs.parse(input);
      expect(tree.type).toBe('root');
    });

    it('should handle Google Docs inline styles', async () => {
      const input = '<p><span style="font-weight:700">bold text</span></p>';
      const { tree } = await gdocs.parse(input);
      expect(tree.type).toBe('root');
    });
  });

  describe('serialize', () => {
    it('should add info warning', async () => {
      const input = '# Title';
      const { tree } = await gdocs.parse(input);
      const warnings: any[] = [];
      await gdocs.serialize(tree, warnings);
      expect(warnings.some(w => w.message.includes('Google Docs'))).toBe(true);
    });
  });
});
