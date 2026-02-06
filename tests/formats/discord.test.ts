import { describe, it, expect } from 'vitest';
import { discord } from '../../src/lib/formats/discord';
import { gfm } from '../../src/lib/formats/gfm';
import { convert } from '../../src/lib/convert';

describe('Discord format', () => {
  describe('parse', () => {
    it('should parse bold text', async () => {
      const input = '**bold text**';
      const { tree } = await discord.parse(input);
      expect(tree.type).toBe('root');
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'strong')).toBe(true);
    });

    it('should parse italic text', async () => {
      const input = '*italic text*';
      const { tree } = await discord.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'emphasis')).toBe(true);
    });

    it('should parse spoilers', async () => {
      const input = 'This is ||hidden text|| here';
      const { tree } = await discord.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'spoiler')).toBe(true);
    });

    it('should parse subtext', async () => {
      const input = '-# This is subtext';
      const { tree } = await discord.parse(input);
      expect(tree.children.some((n: any) => n.type === 'subtext')).toBe(true);
    });

    it('should parse headings', async () => {
      const input = '# Heading\n## Subheading';
      const { tree } = await discord.parse(input);
      expect(tree.children.some(n => n.type === 'heading')).toBe(true);
    });

    it('should parse code blocks', async () => {
      const input = '```js\nconsole.log("hi")\n```';
      const { tree } = await discord.parse(input);
      expect(tree.children.some(n => n.type === 'code')).toBe(true);
    });

    it('should parse blockquotes', async () => {
      const input = '> quoted text';
      const { tree } = await discord.parse(input);
      expect(tree.children.some(n => n.type === 'blockquote')).toBe(true);
    });

    it('should parse strikethrough', async () => {
      const input = '~~deleted~~';
      const { tree } = await discord.parse(input);
      expect(tree.type).toBe('root');
    });

    it('should parse lists', async () => {
      const input = '- item 1\n- item 2';
      const { tree } = await discord.parse(input);
      expect(tree.children.some(n => n.type === 'list')).toBe(true);
    });
  });

  describe('serialize', () => {
    it('should round-trip spoilers', async () => {
      const input = 'This is ||hidden|| text';
      const { tree } = await discord.parse(input);
      const output = await discord.serialize(tree, []);
      expect(output).toContain('||hidden||');
    });

    it('should round-trip subtext', async () => {
      const input = '-# This is subtext';
      const { tree } = await discord.parse(input);
      const output = await discord.serialize(tree, []);
      expect(output).toContain('-# This is subtext');
    });

    it('should cap headings at level 3', async () => {
      const input = '#### Too Deep\n\n##### Way Too Deep';
      const { tree } = await gfm.parse(input);
      const output = await discord.serialize(tree, []);
      expect(output).toContain('### ');
      expect(output).not.toContain('####');
    });

    it('should convert tables to text with warning', async () => {
      const input = '| A | B |\n|---|---|\n| 1 | 2 |';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      await discord.serialize(tree, warnings);
      expect(warnings.some(w => w.message.includes('Tables'))).toBe(true);
    });

    it('should convert images to links with warning', async () => {
      const input = '![alt](https://example.com/img.png)';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      const output = await discord.serialize(tree, warnings);
      expect(output).toContain('https://example.com/img.png');
      expect(warnings.some(w => w.message.includes('Images'))).toBe(true);
    });

    it('should remove horizontal rules with warning', async () => {
      const input = 'Before\n\n---\n\nAfter';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      const output = await discord.serialize(tree, warnings);
      expect(output).not.toContain('---');
      expect(warnings.some(w => w.message.includes('Horizontal'))).toBe(true);
    });
  });

  describe('cross-format', () => {
    it('should convert GFM to Discord', async () => {
      const result = await convert('# Hello\n\n**bold** and *italic*', 'gfm', 'discord');
      expect(result.output).toContain('# Hello');
      expect(result.output).toContain('**bold**');
    });

    it('should strip spoilers when converting to GFM', async () => {
      const result = await convert('This is ||hidden|| text', 'discord', 'gfm');
      expect(result.output).toContain('hidden');
      expect(result.output).not.toContain('||');
    });
  });
});
