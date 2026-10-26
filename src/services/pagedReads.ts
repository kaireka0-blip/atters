export const MAX_DATA_PAGE_SIZE = 20;

type PageResult<T> = { data: T[] | null; error: unknown };

/** Read a collection in deterministic, bounded PostgREST pages. */
export async function readInPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  options: { pageSize?: number; offset?: number; maxRows?: number } = {},
): Promise<T[]> {
  const pageSize = Math.min(MAX_DATA_PAGE_SIZE, Math.max(1, Math.floor(options.pageSize || MAX_DATA_PAGE_SIZE)));
  const offset = Math.max(0, Math.floor(options.offset || 0));
  const maxRows = options.maxRows === undefined ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(options.maxRows));
  const rows: T[] = [];

  while (rows.length < maxRows) {
    const from = offset + rows.length;
    const to = from + Math.min(pageSize, maxRows - rows.length) - 1;
    if (to < from) break;
    const { data, error } = await fetchPage(from, to);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < to - from + 1) break;
  }

  return rows;
}
