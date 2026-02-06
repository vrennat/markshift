export async function readClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch (err) {
    throw new Error(`Failed to read clipboard: ${err instanceof Error ? err.message : 'Please grant clipboard permission.'}`);
  }
}

export async function writeClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    throw new Error(`Failed to write to clipboard: ${err instanceof Error ? err.message : 'Please grant clipboard permission.'}`);
  }
}
