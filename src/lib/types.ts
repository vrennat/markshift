import type { Node, Parent, Literal } from 'unist';
import type { Root, PhrasingContent, BlockContent } from 'mdast';

// Format identifiers
export type FormatId =
  | 'gfm' | 'linear' | 'slack' | 'obsidian' | 'notion' | 'gdocs'
  | 'discord' | 'reddit' | 'gitbook' | 'joplin' | 'mattermost' | 'trello'
  | 'claude' | 'chatgpt' | 'gemini' | 'grok';

// Conversion warning
export interface ConversionWarning {
  severity: 'info' | 'warning' | 'error';
  message: string;
  nodeType?: string;
}

// Parse result from a format module
export interface ParseResult {
  tree: Root;
  warnings: ConversionWarning[];
}

// Format module interface
export interface FormatModule {
  id: FormatId;
  label: string;
  description: string;
  parse(input: string): Promise<ParseResult>;
  serialize(tree: Root, warnings: ConversionWarning[]): Promise<string>;
}

// Conversion result
export interface ConversionResult {
  output: string;
  warnings: ConversionWarning[];
}

// Custom mdast node types

export interface WikilinkNode extends Literal {
  type: 'wikilink';
  value: string;
  data?: {
    alias?: string;
    heading?: string;
  };
}

export interface EmbedNode extends Literal {
  type: 'embed';
  value: string;
  data?: {
    alt?: string;
  };
}

export interface CalloutNode extends Parent {
  type: 'callout';
  data: {
    calloutType: string;
    title?: string;
    foldable?: boolean;
  };
  children: BlockContent[];
}

export interface TagNode extends Literal {
  type: 'tag';
  value: string;
}

export interface FrontmatterNode extends Literal {
  type: 'yaml' | 'toml';
  value: string;
}

export interface MentionNode extends Literal {
  type: 'mention';
  value: string;
  data?: {
    userId?: string;
    label?: string;
  };
}

export interface EmojiNode extends Literal {
  type: 'emoji';
  value: string;
}

export interface SpoilerNode extends Parent {
  type: 'spoiler';
  children: PhrasingContent[];
}

export interface UnderlineNode extends Parent {
  type: 'underline';
  children: PhrasingContent[];
}

export interface HighlightNode extends Parent {
  type: 'highlight';
  children: PhrasingContent[];
}

export interface SubtextNode extends Parent {
  type: 'subtext';
  children: PhrasingContent[];
}

export interface SuperscriptNode extends Literal {
  type: 'superscript';
  value: string;
}

// Extend mdast types
declare module 'mdast' {
  interface RootContentMap {
    wikilink: WikilinkNode;
    embed: EmbedNode;
    callout: CalloutNode;
    tag: TagNode;
    mention: MentionNode;
    emoji: EmojiNode;
    spoiler: SpoilerNode;
    underline: UnderlineNode;
    highlight: HighlightNode;
    subtext: SubtextNode;
    superscript: SuperscriptNode;
  }

  interface PhrasingContentMap {
    wikilink: WikilinkNode;
    tag: TagNode;
    mention: MentionNode;
    emoji: EmojiNode;
    spoiler: SpoilerNode;
    underline: UnderlineNode;
    highlight: HighlightNode;
    superscript: SuperscriptNode;
  }
}
