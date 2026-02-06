import type { FormatId, ConversionResult, ConversionWarning } from './types';
import { getFormat } from './registry';
import { deduplicateWarnings } from './warnings';

const MAX_INPUT_SIZE = 1_000_000; // 1MB

export async function convert(
  input: string,
  sourceFormat: FormatId,
  targetFormat: FormatId
): Promise<ConversionResult> {
  if (!input.trim()) {
    return { output: '', warnings: [] };
  }

  if (input.length > MAX_INPUT_SIZE) {
    return {
      output: '',
      warnings: [{
        severity: 'error',
        message: `Input too large (${(input.length / 1_000_000).toFixed(1)}MB). Maximum is 1MB.`,
      }],
    };
  }

  const source = getFormat(sourceFormat);
  const target = getFormat(targetFormat);

  // Parse input to mdast
  const { tree, warnings: parseWarnings } = await source.parse(input);

  // Serialize mdast to output
  const allWarnings: ConversionWarning[] = [...parseWarnings];
  const output = await target.serialize(tree, allWarnings);

  return {
    output,
    warnings: deduplicateWarnings(allWarnings),
  };
}
