import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { convert } from '../../src/lib/convert';
import { getFormatIds } from '../../src/lib/registry';
import type { FormatId } from '../../src/lib/types';

const FIXTURE_DIR = join(__dirname, 'fixtures');

const fixtures: Record<FormatId, string> = {} as any;
const formatIds = getFormatIds();

for (const id of formatIds) {
  fixtures[id] = readFileSync(join(FIXTURE_DIR, `${id}.txt`), 'utf-8');
}

describe('all conversion pairs', () => {
  // 16 x 16 = 256 conversion pairs
  for (const source of formatIds) {
    for (const target of formatIds) {
      it(`${source} → ${target}`, async () => {
        const input = fixtures[source];
        expect(input).toBeTruthy();

        const result = await convert(input, source, target);

        // Must not throw and must produce non-empty output
        expect(result.output).toBeTruthy();
        expect(result.output.trim().length).toBeGreaterThan(0);

        // Warnings should be an array (may be empty)
        expect(Array.isArray(result.warnings)).toBe(true);

        // No error-severity warnings (those indicate bugs, not lossy conversion)
        const errors = result.warnings.filter(w => w.severity === 'error');
        expect(errors).toHaveLength(0);
      });
    }
  }
});

describe('content preservation', () => {
  // For each format, converting to itself should preserve key content
  for (const id of formatIds) {
    // Skip gdocs since it always outputs GFM (not HTML)
    if (id === 'gdocs') continue;

    it(`${id} → ${id} round-trip preserves core text`, async () => {
      const input = fixtures[id];
      const result = await convert(input, id, id);

      // The word "bold" should survive any round-trip
      expect(result.output).toContain('bold');
    });
  }

  // Cross-format: basic text content should survive any conversion
  const commonWords = ['bold', 'italic'];

  for (const source of formatIds) {
    for (const target of formatIds) {
      // Slack uses different syntax, so check differently
      if (source === 'slack' || target === 'slack') continue;
      // gdocs input is HTML, output is markdown
      if (source === 'gdocs') continue;

      it(`${source} → ${target} preserves word "bold"`, async () => {
        const input = fixtures[source];
        const result = await convert(input, source, target);
        expect(result.output.toLowerCase()).toContain('bold');
      });
    }
  }
});

describe('format-specific features survive conversion', () => {
  it('GFM callout → Obsidian preserves callout', async () => {
    const result = await convert(fixtures.gfm, 'gfm', 'obsidian');
    expect(result.output).toMatch(/\[!NOTE\]/i);
  });

  it('GFM callout → Notion becomes emoji callout', async () => {
    const result = await convert(fixtures.gfm, 'gfm', 'notion');
    // Notion uses emoji-prefixed callouts
    expect(result.output).toMatch(/[ℹ️💡⚠️❗]/);
  });

  it('GFM table → Slack becomes text', async () => {
    const result = await convert(fixtures.gfm, 'gfm', 'slack');
    // Table content should exist even if formatting is lost
    expect(result.output).toContain('Alice');
    expect(result.output).toContain('Bob');
  });

  it('GFM code block → Slack strips language', async () => {
    const result = await convert(fixtures.gfm, 'gfm', 'slack');
    expect(result.output).toContain('```');
    expect(result.output).toContain('console.log');
  });

  it('Obsidian wikilinks → GFM become standard links', async () => {
    const result = await convert(fixtures.obsidian, 'obsidian', 'gfm');
    expect(result.output).toContain('[Team Members]');
    expect(result.output).not.toContain('[[');
  });

  it('Obsidian tags → Slack become text', async () => {
    const result = await convert(fixtures.obsidian, 'obsidian', 'slack');
    expect(result.output).toContain('#project-alpha');
  });

  it('Slack mentions → GFM become text', async () => {
    const result = await convert(fixtures.slack, 'slack', 'gfm');
    expect(result.output).toContain('@U12345678');
  });

  it('Slack links → GFM become standard links', async () => {
    const result = await convert(fixtures.slack, 'slack', 'gfm');
    expect(result.output).toContain('[PR #42]');
    expect(result.output).toContain('https://github.com/example/repo/pull/42');
  });

  it('Discord spoilers → GFM removes spoiler tags', async () => {
    const result = await convert(fixtures.discord, 'discord', 'gfm');
    expect(result.output).toContain('spoiler about the ending');
    expect(result.output).not.toContain('||');
  });

  it('Discord subtext → GFM becomes plain text', async () => {
    const result = await convert(fixtures.discord, 'discord', 'gfm');
    expect(result.output).toContain('small subtext');
  });

  it('Reddit spoilers → GFM removes spoiler tags', async () => {
    const result = await convert(fixtures.reddit, 'reddit', 'gfm');
    expect(result.output).toContain('hidden spoiler');
  });

  it('Reddit superscript → GFM becomes plain text', async () => {
    const result = await convert(fixtures.reddit, 'reddit', 'gfm');
    expect(result.output).toContain('this is superscript text');
  });

  it('Joplin highlights → GFM become bold', async () => {
    const result = await convert(fixtures.joplin, 'joplin', 'gfm');
    // Highlight is downgraded to bold
    expect(result.output).toContain('**highlighted text**');
  });

  it('Joplin highlights → Joplin preserves ==syntax==', async () => {
    const result = await convert(fixtures.joplin, 'joplin', 'joplin');
    expect(result.output).toContain('==highlighted text==');
  });

  it('GDocs HTML → GFM produces clean markdown', async () => {
    const result = await convert(fixtures.gdocs, 'gdocs', 'gfm');
    expect(result.output).toContain('# Meeting Agenda');
    expect(result.output).toContain('**bold text**');
    expect(result.output).not.toContain('<strong>');
  });

  it('GFM → Trello strips tables', async () => {
    const result = await convert(fixtures.gfm, 'gfm', 'trello');
    // Tables should be converted to text
    expect(result.output).toContain('Alice');
    expect(result.warnings.some(w => w.message.includes('Table'))).toBe(true);
  });

  it('GFM → Discord caps headings at level 3', async () => {
    const result = await convert('# H1\n## H2\n### H3\n#### H4\n', 'gfm', 'discord');
    expect(result.output).toContain('# H1');
    expect(result.output).toContain('## H2');
    expect(result.output).toContain('### H3');
    // H4 should be capped at ### or converted
    expect(result.output).not.toContain('####');
  });

  it('Notion emoji callouts → GFM become standard callouts', async () => {
    const result = await convert(fixtures.notion, 'notion', 'gfm');
    expect(result.output).toMatch(/\[!(NOTE|WARNING|TIP|INFO)\]/i);
  });

  it('GFM → GitBook removes horizontal rules', async () => {
    const result = await convert(fixtures.gfm, 'gfm', 'gitbook');
    expect(result.output).not.toMatch(/^---$/m);
    expect(result.output).not.toMatch(/^\*\*\*$/m);
  });
});

describe('dollar amounts do not crash (inlineMath fix)', () => {
  const textWithDollars = `
Shopping list:

- ecobee3 Lite ($170) or ecobee Premium ($250)
- Venstar Add-a-Wire (~$35)

Total budget: $500
`;

  for (const target of formatIds) {
    it(`GFM with dollar amounts → ${target}`, async () => {
      const result = await convert(textWithDollars, 'gfm', target);
      expect(result.output).toBeTruthy();
      const errors = result.warnings.filter(w => w.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  }
});
