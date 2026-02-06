import { describe, it, expect } from 'vitest';
import { convert } from '../src/lib/convert';

describe('convert (integration)', () => {
  it('should convert GFM to Slack', async () => {
    const input = '# Hello World\n\nThis is **bold** and *italic*.';
    const result = await convert(input, 'gfm', 'slack');
    expect(result.output).toContain('*Hello World*');
    expect(result.output).toContain('*bold*');
    expect(result.output).toContain('_italic_');
  });

  it('should convert GFM to Linear', async () => {
    const input = '# Title\n\n- Item 1\n- Item 2\n';
    const result = await convert(input, 'gfm', 'linear');
    expect(result.output).toContain('# Title');
    expect(result.output).toContain('Item 1');
  });

  it('should convert Slack to GFM', async () => {
    const input = '*bold* and _italic_ with <https://example.com|a link>';
    const result = await convert(input, 'slack', 'gfm');
    expect(result.output).toContain('**bold**');
    expect(result.output).toContain('*italic*');
    expect(result.output).toContain('[a link](https://example.com)');
  });

  it('should convert Obsidian to GFM with warnings', async () => {
    const input = 'Link to [[My Page]] with #tag';
    const result = await convert(input, 'obsidian', 'gfm');
    expect(result.output).toContain('[My Page]');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should convert GFM to Notion', async () => {
    const input = '# Title\n\n> [!NOTE]\n> This is a note';
    const result = await convert(input, 'gfm', 'notion');
    expect(result.output).toContain('Title');
  });

  it('should convert Google Docs HTML to GFM', async () => {
    const input = '<h1>Title</h1><p>Hello <strong>world</strong></p>';
    const result = await convert(input, 'gdocs', 'gfm');
    expect(result.output).toContain('# Title');
    expect(result.output).toContain('**world**');
  });

  it('should return empty output for empty input', async () => {
    const result = await convert('', 'gfm', 'slack');
    expect(result.output).toBe('');
    expect(result.warnings).toHaveLength(0);
  });

  it('should return empty output for whitespace-only input', async () => {
    const result = await convert('   \n  ', 'gfm', 'slack');
    expect(result.output).toBe('');
  });

  it('should convert same format to same format', async () => {
    const input = '# Title\n\nParagraph.\n';
    const result = await convert(input, 'gfm', 'gfm');
    expect(result.output).toContain('# Title');
    expect(result.output).toContain('Paragraph');
  });

  it('should deduplicate warnings', async () => {
    const input = 'Link to [[Page1]] and [[Page2]] and [[Page3]]';
    const result = await convert(input, 'obsidian', 'slack');
    const wikiWarnings = result.warnings.filter(w => w.message.includes('Wikilinks'));
    expect(wikiWarnings.length).toBeLessThanOrEqual(1);
  });
});
