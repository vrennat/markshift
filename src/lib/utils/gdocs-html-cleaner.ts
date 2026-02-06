/**
 * Pre-process Google Docs HTML export to normalize its quirks.
 * Google Docs exports use inline styles extensively instead of semantic tags.
 * This cleaner converts common patterns to semantic HTML before Turndown processing.
 */
export function cleanGDocsHtml(html: string): string {
  // Remove Google Docs wrapper elements
  let cleaned = html;

  // Convert font-weight:700 or font-weight:bold spans to <strong>
  cleaned = cleaned.replace(
    /<span[^>]*style="[^"]*font-weight:\s*(?:700|bold)[^"]*"[^>]*>(.*?)<\/span>/gi,
    '<strong>$1</strong>'
  );

  // Convert font-style:italic spans to <em>
  cleaned = cleaned.replace(
    /<span[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>(.*?)<\/span>/gi,
    '<em>$1</em>'
  );

  // Convert text-decoration:line-through spans to <del>
  cleaned = cleaned.replace(
    /<span[^>]*style="[^"]*text-decoration:\s*line-through[^"]*"[^>]*>(.*?)<\/span>/gi,
    '<del>$1</del>'
  );

  // Remove empty spans
  cleaned = cleaned.replace(/<span[^>]*>\s*<\/span>/gi, '');

  // Remove Google Docs specific classes and attributes but keep the content
  cleaned = cleaned.replace(/\s+class="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+id="[^"]*"/gi, '');

  // Remove style attributes from most elements (keep structure)
  cleaned = cleaned.replace(/(<(?!span)[^>]*?)\s+style="[^"]*"/gi, '$1');

  // Clean up remaining spans with just style (no semantic meaning detected)
  cleaned = cleaned.replace(/<span[^>]*style="[^"]*"[^>]*>(.*?)<\/span>/gi, '$1');

  // Remove remaining plain spans
  cleaned = cleaned.replace(/<span>(.*?)<\/span>/gi, '$1');

  // Normalize whitespace in tags
  cleaned = cleaned.replace(/<(\w+)\s+>/g, '<$1>');

  return cleaned;
}
