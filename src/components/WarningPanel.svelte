<script lang="ts">
  import type { ConversionWarning } from '../lib/types';

  let { warnings = [] }: { warnings: ConversionWarning[] } = $props();
</script>

{#if warnings.length > 0}
  <div class="flex flex-col gap-1 pt-2">
    {#each warnings as warning}
      <p class="text-xs {warning.severity === 'error' ? 'text-destructive' : warning.severity === 'warning' ? 'text-yellow-500' : 'text-muted-foreground'}">
        {warning.severity === 'error' ? '!' : warning.severity === 'warning' ? '!' : 'i'} {warning.message}
      </p>
    {/each}
  </div>
{/if}
