import { unified } from 'unified';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import type { Options as StringifyOptions } from 'remark-stringify';

const DEFAULT_OPTIONS: StringifyOptions = {
  bullet: '-',
  emphasis: '*',
  strong: '*' as StringifyOptions['strong'],
  listItemIndent: 'one',
};

/**
 * Create a remark serializer with standard options.
 * Centralizes the remarkStringify options cast that every format needs.
 */
export function createSerializer(opts?: {
  frontmatter?: boolean;
  math?: boolean;
  overrides?: Partial<StringifyOptions>;
}) {
  const options = { ...DEFAULT_OPTIONS, ...opts?.overrides };
  let pipeline = unified()
    .use(remarkStringify, options as Parameters<typeof remarkStringify>[0])
    .use(remarkGfm);

  if (opts?.frontmatter) {
    pipeline = pipeline.use(remarkFrontmatter, ['yaml']);
  }
  if (opts?.math) {
    pipeline = pipeline.use(remarkMath);
  }

  return pipeline;
}
