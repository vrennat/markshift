<script lang="ts">
  let {
    value = $bindable(),
    readonly = false,
    placeholder = '',
    oninput,
  }: {
    value: string;
    readonly?: boolean;
    placeholder?: string;
    oninput?: () => void;
  } = $props();
</script>

<textarea
  bind:value
  {readonly}
  {placeholder}
  {oninput}
  spellcheck="false"
  class="w-full min-h-[200px] max-h-[500px] resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring {readonly ? 'cursor-default opacity-80' : ''}"
  rows="12"
></textarea>
