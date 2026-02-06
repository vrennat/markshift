import { describe, it, expect } from 'vitest';
import { detectFormat } from '../src/lib/detect';

describe('detectFormat', () => {
  it('should return gfm for empty input', () => {
    expect(detectFormat('')).toBe('gfm');
    expect(detectFormat('   ')).toBe('gfm');
  });

  it('should return gfm for plain markdown', () => {
    expect(detectFormat('# Hello\n\nThis is **bold** and *italic*.')).toBe('gfm');
  });

  it('should detect Slack mrkdwn', () => {
    expect(detectFormat('*bold* and _italic_ with <https://example.com|a link>')).toBe('slack');
  });

  it('should detect Slack by mention syntax', () => {
    expect(detectFormat('Hey <@U12345>, check this out')).toBe('slack');
  });

  it('should detect Slack by channel reference', () => {
    expect(detectFormat('Post in <#C12345|general>')).toBe('slack');
  });

  it('should detect Discord by spoiler syntax', () => {
    expect(detectFormat('This is ||a spoiler|| in the message')).toBe('discord');
  });

  it('should detect Discord by subtext', () => {
    expect(detectFormat('Some text\n-# This is subtext')).toBe('discord');
  });

  it('should detect Reddit by spoiler syntax', () => {
    expect(detectFormat('This is >!a spoiler!< on Reddit')).toBe('reddit');
  });

  it('should detect Reddit by superscript', () => {
    expect(detectFormat('E=mc^2 and also ^(multi word)')).toBe('reddit');
  });

  it('should detect Obsidian by wikilinks', () => {
    expect(detectFormat('Link to [[My Page]] here')).toBe('obsidian');
  });

  it('should detect Obsidian by embeds', () => {
    expect(detectFormat('![[image.png]]')).toBe('obsidian');
  });

  it('should detect Obsidian with multiple wikilinks', () => {
    expect(detectFormat('See [[Page A]] and [[Page B|alias]]')).toBe('obsidian');
  });

  it('should detect Google Docs HTML with attributes', () => {
    expect(detectFormat('<h1 style="color:red">Title</h1><p>Some <strong>bold</strong> text.</p>')).toBe('gdocs');
  });

  it('should detect Google Docs by inline styles', () => {
    expect(detectFormat('<p><span style="font-weight:700">bold</span></p>')).toBe('gdocs');
  });

  it('should detect Joplin by highlight syntax', () => {
    expect(detectFormat('This is ==highlighted text== in Joplin')).toBe('joplin');
  });

  it('should prefer obsidian over gfm when wikilinks present', () => {
    const input = '# Title\n\nSee [[My Page]] for details.\n\n- Item 1\n- Item 2';
    expect(detectFormat(input)).toBe('obsidian');
  });

  it('should prefer slack over gfm when slack links present', () => {
    const input = 'Check out <https://example.com|this link> and <https://other.com|that one>';
    expect(detectFormat(input)).toBe('slack');
  });

  it('should not misdetect HTML entities as gdocs or slack', () => {
    expect(detectFormat('Tom &amp; Jerry')).toBe('gfm');
    expect(detectFormat('5 &lt; 10 &amp; 10 &gt; 5')).toBe('gfm');
    expect(detectFormat('Entities: &amp;, &lt;, &gt;, &quot;')).toBe('gfm');
  });

  it('should not misdetect bare HTML tags in markdown as gdocs', () => {
    expect(detectFormat('Use the <div> tag for layout')).toBe('gfm');
    expect(detectFormat('# Heading\n\nUse <br> for line breaks')).toBe('gfm');
    expect(detectFormat('This has <b>bold</b> text')).toBe('gfm');
  });
});
