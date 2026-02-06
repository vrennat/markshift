import type { FormatId, FormatModule } from './types';
import { gfm } from './formats/gfm';
import { linear } from './formats/linear';
import { obsidian } from './formats/obsidian';
import { notion } from './formats/notion';
import { slack } from './formats/slack';
import { gdocs } from './formats/gdocs';
import { discord } from './formats/discord';
import { reddit } from './formats/reddit';
import { gitbook } from './formats/gitbook';
import { joplin } from './formats/joplin';
import { mattermost } from './formats/mattermost';
import { trello } from './formats/trello';
import { claude, chatgpt, gemini, grok } from './formats/ai-chat';

const registry = new Map<FormatId, FormatModule>();

function registerFormat(mod: FormatModule): void {
  registry.set(mod.id, mod);
}

// Register all formats (order determines button display order)
// Popular targets first
registerFormat(obsidian);
registerFormat(notion);
registerFormat(slack);
registerFormat(discord);
registerFormat(linear);
// Markdown flavors
registerFormat(gfm);
registerFormat(gitbook);
registerFormat(joplin);
// Other platforms
registerFormat(reddit);
registerFormat(gdocs);
registerFormat(mattermost);
registerFormat(trello);
// AI chat (primarily input formats)
registerFormat(claude);
registerFormat(chatgpt);
registerFormat(gemini);
registerFormat(grok);

export function getFormat(id: FormatId): FormatModule {
  const mod = registry.get(id);
  if (!mod) throw new Error(`Unknown format: ${id}`);
  return mod;
}

export function getAllFormats(): FormatModule[] {
  return Array.from(registry.values());
}

export function getFormatIds(): FormatId[] {
  return Array.from(registry.keys());
}
