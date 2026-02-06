import { describe, it, expect } from 'vitest';
import { slack } from '../../src/lib/formats/slack';
import { gfm } from '../../src/lib/formats/gfm';

describe('Slack mrkdwn format', () => {
  describe('parse', () => {
    it('should parse bold text', async () => {
      const input = '*bold text*';
      const { tree } = await slack.parse(input);
      expect(tree.type).toBe('root');
      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should parse italic text', async () => {
      const input = '_italic text_';
      const { tree } = await slack.parse(input);
      expect(tree.type).toBe('root');
    });

    it('should parse links', async () => {
      const input = '<https://example.com|Example>';
      const { tree } = await slack.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'link')).toBe(true);
    });

    it('should parse mentions', async () => {
      const input = '<@U12345>';
      const { tree } = await slack.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'mention')).toBe(true);
    });

    it('should parse emoji shortcodes', async () => {
      const input = ':thumbsup:';
      const { tree } = await slack.parse(input);
      const para = tree.children[0] as any;
      expect(para.children.some((n: any) => n.type === 'emoji')).toBe(true);
    });

    it('should parse code blocks', async () => {
      const input = '```\nconsole.log("hi")\n```';
      const { tree } = await slack.parse(input);
      expect(tree.children.some(n => n.type === 'code')).toBe(true);
    });

    it('should parse blockquotes', async () => {
      const input = '> quoted text';
      const { tree } = await slack.parse(input);
      expect(tree.children.some(n => n.type === 'blockquote')).toBe(true);
    });

    it('should parse lists', async () => {
      const input = '- item 1\n- item 2';
      const { tree } = await slack.parse(input);
      expect(tree.children.some(n => n.type === 'list')).toBe(true);
    });
  });

  describe('serialize', () => {
    it('should convert headings to bold', async () => {
      const input = '# My Heading\n\nSome text.';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      const output = await slack.serialize(tree, warnings);
      expect(output).toContain('*My Heading*');
      expect(warnings.some(w => w.message.includes('Headings'))).toBe(true);
    });

    it('should convert links to Slack format', async () => {
      const input = '[Example](https://example.com)';
      const { tree } = await gfm.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('<https://example.com|Example>');
    });

    it('should convert bold to single asterisks', async () => {
      const input = '**bold text**';
      const { tree } = await gfm.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('*bold text*');
    });

    it('should convert italic to underscores', async () => {
      const input = '*italic text*';
      const { tree } = await gfm.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('_italic text_');
    });

    it('should convert strikethrough to single tildes', async () => {
      const input = '~~deleted~~';
      const { tree } = await gfm.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('~deleted~');
    });

    it('should warn about table conversion', async () => {
      const input = '| A | B |\n|---|---|\n| 1 | 2 |';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      await slack.serialize(tree, warnings);
      expect(warnings.some(w => w.message.includes('Tables'))).toBe(true);
    });

    it('should drop code block language hints with warning', async () => {
      const input = '```javascript\nconsole.log("hi")\n```';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      const output = await slack.serialize(tree, warnings);
      expect(output).toContain('```\nconsole.log("hi")\n```');
      expect(output).not.toContain('javascript');
      expect(warnings.some(w => w.message.includes('language'))).toBe(true);
    });

    it('should convert images to link format', async () => {
      const input = '![alt text](https://example.com/img.png)';
      const { tree } = await gfm.parse(input);
      const warnings: any[] = [];
      const output = await slack.serialize(tree, warnings);
      expect(output).toContain('<https://example.com/img.png|alt text>');
      expect(warnings.some(w => w.message.includes('Images'))).toBe(true);
    });

    it('should output bare URLs in angle brackets', async () => {
      const input = '<https://example.com>';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('<https://example.com>');
    });
  });

  describe('round-trip', () => {
    it('should round-trip bold', async () => {
      const input = '*bold text*';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('*bold text*');
    });

    it('should round-trip italic', async () => {
      const input = '_italic text_';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('_italic text_');
    });

    it('should round-trip strikethrough', async () => {
      const input = '~deleted~';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('~deleted~');
    });

    it('should round-trip inline code', async () => {
      const input = '`some code`';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('`some code`');
    });

    it('should round-trip links', async () => {
      const input = '<https://example.com|click here>';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('<https://example.com|click here>');
    });

    it('should round-trip emoji', async () => {
      const input = ':thumbsup:';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain(':thumbsup:');
    });

    it('should round-trip blockquotes', async () => {
      const input = '> quoted text';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('> quoted text');
    });

    it('should round-trip code blocks', async () => {
      const input = '```\nfunction hello() {}\n```';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('```');
      expect(output).toContain('function hello() {}');
    });

    it('should round-trip ordered lists', async () => {
      const input = '1. first\n2. second';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('1. first');
      expect(output).toContain('2. second');
    });

    it('should round-trip unordered lists', async () => {
      const input = '- alpha\n- beta';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('• alpha');
      expect(output).toContain('• beta');
    });

    it('should round-trip mentions', async () => {
      const input = '<@U12345>';
      const { tree } = await slack.parse(input);
      const output = await slack.serialize(tree, []);
      expect(output).toContain('<@U12345>');
    });
  });
});
