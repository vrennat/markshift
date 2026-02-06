<script lang="ts">
  import type { FormatId, ConversionWarning } from '../lib/types';
  import { convert } from '../lib/convert';
  import { detectFormat } from '../lib/detect';
  import { readClipboard, writeClipboard } from '../lib/clipboard';
  import { getAllFormats } from '../lib/registry';
  import TextArea from './TextArea.svelte';
  import WarningPanel from './WarningPanel.svelte';

  const formats = getAllFormats();

  let input: string = $state('');
  let output: string = $state('');
  let warnings: ConversionWarning[] = $state([]);
  let converting: boolean = $state(false);
  let toast: string = $state('');
  let detectedFormat: FormatId | null = $state(null);
  let lastTarget: FormatId | null = $state(null);

  function handleInputChange() {
    if (input.trim()) {
      detectedFormat = detectFormat(input);
    } else {
      detectedFormat = null;
    }
  }

  async function handleConvertTo(targetId: FormatId) {
    if (converting) return;

    if (!input.trim()) {
      output = '';
      warnings = [];
      lastTarget = null;
      showToast('Nothing to convert');
      return;
    }

    const text = input;

    converting = true;
    lastTarget = targetId;
    try {
      const sourceId = detectFormat(text);
      detectedFormat = sourceId;
      const result = await convert(text, sourceId, targetId);
      output = result.output;
      warnings = result.warnings;
      await writeClipboard(result.output);
      const sourceFmt = formats.find(f => f.id === sourceId);
      const targetFmt = formats.find(f => f.id === targetId);
      showToast(`${sourceFmt?.label ?? sourceId} → ${targetFmt?.label ?? targetId} copied`);
    } catch (e) {
      console.error('Conversion error:', e);
      warnings = [{ severity: 'error', message: `Conversion failed: ${e instanceof Error ? e.message : 'Unknown error'}` }];
    } finally {
      converting = false;
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await readClipboard();
      input = text;
      detectedFormat = detectFormat(text);
    } catch {
      showToast('Failed to read clipboard');
    }
  }

  async function handleCopyOutput() {
    if (!output) return;
    try {
      await writeClipboard(output);
      showToast('Copied to clipboard');
    } catch {
      showToast('Failed to copy');
    }
  }

  function showToast(msg: string) {
    toast = msg;
    setTimeout(() => { toast = ''; }, 2000);
  }
</script>

<div class="mx-auto w-full max-w-3xl px-4 py-8 flex flex-col gap-6">
  <!-- Header -->
  <div class="flex flex-col gap-1">
    <h1 class="text-lg font-semibold text-foreground tracking-tight">Markshift</h1>
    <p class="text-sm text-muted-foreground">Paste or type content in any markdown format, then click a target format below to convert and copy to clipboard. Source format is auto-detected.</p>
    <p class="text-xs text-muted-foreground/60 mt-1">Everything runs locally in your browser. No data is sent to any server. <a href="https://github.com/vrennat/markshift" target="_blank" rel="noopener noreferrer" class="underline hover:text-muted-foreground transition-colors">Open source on GitHub</a>.</p>
  </div>

  <!-- Input textarea -->
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">Input</span>
        {#if detectedFormat}
          {@const fmt = formats.find(f => f.id === detectedFormat)}
          <span class="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
            detected: {fmt?.label ?? detectedFormat}
          </span>
        {/if}
      </div>
      <button
        onclick={handlePasteFromClipboard}
        class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
        Paste
      </button>
    </div>
    <TextArea bind:value={input} placeholder="Paste your content here..." oninput={handleInputChange} />
  </div>

  <!-- Convert to buttons -->
  <div class="flex flex-col gap-2">
    <span class="text-xs text-muted-foreground">Convert to</span>
    <div class="flex flex-wrap gap-2">
      {#each formats as format}
        <button
          onclick={() => handleConvertTo(format.id)}
          disabled={converting}
          class="rounded-md border px-3 py-1.5 text-sm transition-colors
            {lastTarget === format.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'}
            disabled:pointer-events-none disabled:opacity-50"
          title={format.description}
        >
          {format.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Output textarea with copy button -->
  {#if output}
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted-foreground">Output</span>
        <button
          onclick={handleCopyOutput}
          class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          Copy
        </button>
      </div>
      <TextArea value={output} readonly />
    </div>
  {/if}

  <!-- Warnings -->
  <WarningPanel {warnings} />

  <!-- Toast -->
  {#if toast}
    <div class="fixed bottom-4 right-4 rounded-md bg-foreground px-4 py-2 text-sm text-background shadow-lg">
      {toast}
    </div>
  {/if}
</div>
