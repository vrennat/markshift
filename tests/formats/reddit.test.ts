import { describe, it, expect } from 'vitest';
import { reddit } from '../../src/lib/formats/reddit';
import { gfm } from '../../src/lib/formats/gfm';
import { convert } from '../../src/lib/convert';

describe('Reddit format', () => {
  describe('parse', () => {
    it('should parse basic markdown', async () => {
      const input = '# Title\n\n**bold** and *italic*';
      const { tree } = await reddit.parse(input);
      expect(tree.type).toBe('root');
      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should parse spoilers', async () => {
      const input = 'This is >!hidden text!< here';
      const { tree } = await reddit.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'spoiler')).toBe(true);
    });

    it('should parse superscript with caret', async () => {
      const input = 'E=mc^2';
      const { tree } = await reddit.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'superscript')).toBe(true);
    });

    it('should parse superscript with parens', async () => {
      const input = '^(multi word superscript)';
      const { tree } = await reddit.parse(input);
      const para = tree.children[0] as any;
      const sup = para.children.find((n: any) => n.type === 'superscript');
      expect(sup).toBeTruthy();
      expect(sup.value).toBe('multi word superscript');
    });

    it('should parse tables', async () => {
      const input = '| A | B |\n|---|---|\n| 1 | 2 |';
      const { tree } = await reddit.parse(input);
      expect(tree.children.some(n => n.type === 'table')).toBe(true);
    });

    it('should parse strikethrough', async () => {
      const input = '~~deleted~~';
      const { tree } = await reddit.parse(input);
      expect(tree.type).toBe('root');
    });
  });

  describe('serialize', () => {
    it('should round-trip spoilers', async () => {
      const input = 'This is >!hidden!< text';
      const { tree } = await reddit.parse(input);
      const output = await reddit.serialize(tree, []);
      expect(output).toContain('>!hidden!<');
    });

    it('should round-trip superscript single word', async () => {
      const input = 'E=mc^2';
      const { tree } = await reddit.parse(input);
      const output = await reddit.serialize(tree, []);
      expect(output).toContain('^2');
    });

    it('should round-trip superscript multi word', async () => {
      const input = '^(multi word)';
      const { tree } = await reddit.parse(input);
      const output = await reddit.serialize(tree, []);
      expect(output).toContain('^(multi word)');
    });

    it('should strip syntax highlighting from code blocks', async () => {
      const input = '```javascript\nconsole.log("hi")\n```';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      const output = await reddit.serialize(tree, warnings);
      expect(output).toContain('```\n');
      expect(output).not.toContain('javascript');
      expect(warnings.some(w => w.message.includes('highlighting'))).toBe(true);
    });

    it('should convert images to links', async () => {
      const input = '![alt](https://example.com/img.png)';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      const output = await reddit.serialize(tree, warnings);
      expect(output).toContain('https://example.com/img.png');
      expect(warnings.some(w => w.message.includes('Images'))).toBe(true);
    });
  });

  describe('cross-format', () => {
    it('should convert Reddit to GFM stripping spoilers', async () => {
      const result = await convert('This is >!hidden!< text', 'reddit', 'gfm');
      expect(result.output).toContain('hidden');
      expect(result.output).not.toContain('>!');
    });

    it('should convert GFM to Reddit', async () => {
      const result = await convert('# Title\n\n**bold**', 'gfm', 'reddit');
      expect(result.output).toContain('# Title');
      expect(result.output).toContain('**bold**');
    });
  });
});
