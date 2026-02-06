import { describe, it, expect } from 'vitest';
import { obsidian } from '../../src/lib/formats/obsidian';

describe('Obsidian format', () => {
  describe('parse', () => {
    it('should parse wikilinks', async () => {
      const input = 'Link to [[My Page]]';
      const { tree } = await obsidian.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'wikilink')).toBe(true);
    });

    it('should parse wikilinks with alias', async () => {
      const input = '[[My Page|display text]]';
      const { tree } = await obsidian.parse(input);
      const para = tree.children[0] as any;
      const wikilink = para.children.find((n: any) => n.type === 'wikilink');
      expect(wikilink.data.alias).toBe('display text');
    });

    it('should parse wikilinks with heading', async () => {
      const input = '[[My Page#section]]';
      const { tree } = await obsidian.parse(input);
      const para = tree.children[0] as any;
      const wikilink = para.children.find((n: any) => n.type === 'wikilink');
      expect(wikilink.data.heading).toBe('section');
    });

    it('should parse embeds', async () => {
      const input = '![[image.png]]';
      const { tree } = await obsidian.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'embed')).toBe(true);
    });

    it('should parse tags', async () => {
      const input = 'Text with #mytag here';
      const { tree } = await obsidian.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'tag')).toBe(true);
    });

    it('should parse callouts', async () => {
      const input = '> [!WARNING]\n> Be careful';
      const { tree } = await obsidian.parse(input);
      expect(tree.children.some(n => n.type === 'callout')).toBe(true);
    });
  });

  describe('serialize', () => {
    it('should round-trip wikilinks', async () => {
      const input = 'Link to [[My Page]]';
      const { tree } = await obsidian.parse(input);
      const output = await obsidian.serialize(tree, []);
      expect(output).toContain('[[My Page]]');
    });

    it('should round-trip wikilinks with alias', async () => {
      const input = '[[My Page|display text]]';
      const { tree } = await obsidian.parse(input);
      const output = await obsidian.serialize(tree, []);
      expect(output).toContain('[[My Page|display text]]');
    });

    it('should round-trip embeds', async () => {
      const input = '![[image.png]]';
      const { tree } = await obsidian.parse(input);
      const output = await obsidian.serialize(tree, []);
      expect(output).toContain('![[image.png]]');
    });

    it('should round-trip tags', async () => {
      const input = 'Text with #mytag here';
      const { tree } = await obsidian.parse(input);
      const output = await obsidian.serialize(tree, []);
      expect(output).toContain('#mytag');
    });
  });
});
