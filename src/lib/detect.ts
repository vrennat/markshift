import type { FormatId } from './types';

interface FormatSignal {
  pattern: RegExp;
  weight: number;
}

const FORMAT_SIGNALS: Record<FormatId, FormatSignal[]> = {
  // Slack: <url|text> links, <@U...> mentions, <#C...> channels, :emoji:
  // Note: *bold* single asterisk is NOT a signal — it's ambiguous with standard markdown italic
  slack: [
    { pattern: /<https?:\/\/[^>|]+\|[^>]+>/m, weight: 5 },  // <url|text>
    { pattern: /<@U[A-Z0-9]+>/m, weight: 6 },                // <@U123>
    { pattern: /<#C[A-Z0-9]+(\|[^>]+)?>/m, weight: 6 },      // <#C123|channel>
    { pattern: /^&gt;/m, weight: 2 },                          // HTML-encoded blockquote (line-start only)
  ],

  // Discord: ||spoiler||, -# subtext, >>> multiline quote
  discord: [
    { pattern: /\|\|.+?\|\|/m, weight: 5 },                   // ||spoiler||
    { pattern: /^-# .+/m, weight: 6 },                        // -# subtext
    { pattern: /^>>>/m, weight: 5 },                           // >>> multi-line quote
  ],

  // Reddit: >!spoiler!<, ^superscript, ^(multi word)
  reddit: [
    { pattern: />!.+?!</m, weight: 6 },                       // >!spoiler!<
    { pattern: /\^(?:\([^)]+\)|\S+)/m, weight: 3 },           // ^super or ^(super text)
  ],

  // Obsidian: [[wikilinks]], ![[embeds]], #tags in text, > [!callout]
  obsidian: [
    { pattern: /(?<!!)\[\[[^\]]+\]\]/m, weight: 6 },          // [[wikilink]]
    { pattern: /!\[\[[^\]]+\]\]/m, weight: 7 },               // ![[embed]]
    { pattern: /^>\s*\[!\w+\]/m, weight: 4 },                 // > [!NOTE] (shared with GFM)
    { pattern: /(?<=\s|^)#[a-zA-Z][\w/-]+(?=\s|$)/m, weight: 2 }, // #tag
  ],

  // Google Docs: HTML with attributes/structure (not bare tags, which are valid inline HTML in markdown)
  gdocs: [
    { pattern: /<[a-z][^>]*\s[^>]*>/i, weight: 4 },          // HTML tag with attributes (not bare <br>, <b>, etc.)
    { pattern: /style="[^"]*font-weight/i, weight: 6 },       // Google Docs inline styles
    { pattern: /<span[^>]*\s[^>]*>/i, weight: 3 },            // <span> with attributes
    { pattern: /class="[^"]*"/i, weight: 2 },                 // class attributes
  ],

  // Joplin: ==highlight==
  joplin: [
    { pattern: /==[^=]+==/m, weight: 5 },                     // ==highlight==
  ],

  // Notion: emoji-prefixed blockquotes
  notion: [
    { pattern: /^>\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u2139\u2757\u26A0\u2705\u2753\u274C\u26A1]/mu, weight: 5 },
  ],

  // GFM: callout syntax (shared with obsidian), ~~strikethrough~~, task lists, tables, footnotes
  gfm: [
    { pattern: /^>\s*\[!\w+\]/m, weight: 2 },                 // > [!NOTE] (lower than obsidian)
    { pattern: /\[\^[^\]]+\]/m, weight: 3 },                  // [^footnote]
    { pattern: /^```\w+$/m, weight: 1 },                      // fenced code with lang (generic)
  ],

  // Linear: very similar to GFM, no strong unique signals
  linear: [],

  // GitBook: no unique signals beyond GFM
  gitbook: [],

  // Mattermost: no unique signals beyond GFM
  mattermost: [],

  // Trello: no unique signals beyond GFM
  trello: [],

  // AI chat formats: no unique signals (standard markdown with math)
  claude: [],
  chatgpt: [],
  gemini: [],
  grok: [],
};

/**
 * Detect the most likely source format from input text.
 * Returns the format with the highest score, falling back to 'gfm'.
 */
export function detectFormat(input: string): FormatId {
  if (!input.trim()) return 'gfm';

  const scores: Partial<Record<FormatId, number>> = {};

  for (const [formatId, signals] of Object.entries(FORMAT_SIGNALS) as [FormatId, FormatSignal[]][]) {
    let score = 0;
    for (const signal of signals) {
      const flags = signal.pattern.flags.includes('g') ? signal.pattern.flags : signal.pattern.flags + 'g';
      const matches = input.match(new RegExp(signal.pattern.source, flags));
      if (matches) {
        // Score = weight * log(count+1) so multiple matches boost but don't dominate
        score += signal.weight * Math.log2(matches.length + 1);
      }
    }
    if (score > 0) {
      scores[formatId] = score;
    }
  }

  // Find highest scoring format
  let bestFormat: FormatId = 'gfm';
  let bestScore = 0;

  for (const [formatId, score] of Object.entries(scores) as [FormatId, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestFormat = formatId;
    }
  }

  return bestFormat;
}
