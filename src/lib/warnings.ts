import type { ConversionWarning } from './types';

export function warn(severity: ConversionWarning['severity'], message: string, nodeType?: string): ConversionWarning {
  return { severity, message, nodeType };
}

export function deduplicateWarnings(warnings: ConversionWarning[]): ConversionWarning[] {
  const seen = new Set<string>();
  return warnings.filter(w => {
    const key = `${w.severity}:${w.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Predefined warning messages
export const WARNINGS = {
  HEADING_TO_BOLD: 'Headings converted to bold text; heading levels lost',
  TABLE_TO_TEXT: 'Tables converted to plain text; formatting lost',
  WIKILINK_TO_LINK: 'Wikilinks converted to standard markdown links',
  EMBED_TO_LINK: 'Embeds converted to standard links',
  CALLOUT_TO_BLOCKQUOTE: 'Callouts converted to plain blockquotes; callout type lost',
  FRONTMATTER_DROPPED: 'YAML frontmatter removed (not supported in target format)',
  MATH_DROPPED: 'Math expressions removed (not supported in target format)',
  FOOTNOTE_DROPPED: 'Footnotes removed (not supported in target format)',
  TAG_DROPPED: 'Tags removed (not supported in target format)',
  MENTION_TO_TEXT: 'User mentions converted to plain text',
  EMOJI_TO_TEXT: 'Emoji shortcodes converted to text',
  STRIKETHROUGH_SYNTAX: 'Strikethrough syntax changed between formats',
  NESTED_LIST_FLAT: 'Nested lists flattened (limited nesting support)',
  GDOCS_INFO: 'Google Docs output is standard markdown (importable by Google Docs)',
  TASK_LIST_TO_LIST: 'Task list checkboxes removed (not supported in target format)',
  IMAGE_LINK_ONLY: 'Images kept as links (no embedding in target format)',
  CODE_BLOCK_LANG_DROPPED: 'Code block language hints removed',
  HTML_STRIPPED: 'Inline HTML stripped (not supported in target format)',
  SPOILER_TO_TEXT: 'Spoiler tags removed; hidden text shown as plain text',
  UNDERLINE_TO_EMPHASIS: 'Underline converted to emphasis (no underline in target format)',
  HIGHLIGHT_TO_BOLD: 'Highlighted text converted to bold (no highlight in target format)',
  SUBTEXT_TO_TEXT: 'Subtext converted to plain text (not supported in target format)',
  SUPERSCRIPT_TO_TEXT: 'Superscript converted to plain text (not supported in target format)',
  TABLES_NOT_SUPPORTED: 'Tables not supported in target format; converted to plain text',
  IMAGES_NOT_SUPPORTED: 'Images not supported; converted to links',
  HR_NOT_SUPPORTED: 'Horizontal rules not supported in target format; removed',
  SYNTAX_HIGHLIGHT_DROPPED: 'Syntax highlighting not supported; language hints removed',
} as const;
