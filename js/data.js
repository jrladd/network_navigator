// Turning pasted or uploaded text into a list of edges

// Thrown for problems with the user's data (as opposed to bugs)
export class DataError extends Error {}

function firstLine(text) {
  return text.split(/\r?\n/).find((line) => line.trim() !== '') || '';
}

// Spreadsheets paste tab-separated text; European CSV exports often use semicolons
export function sniffDelimiter(text) {
  const line = firstLine(text);
  if (line.includes('\t')) return '\t';
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return semicolons > 0 && commas === 0 ? ';' : ',';
}

// True if the first line looks like a header naming "source" and "target" columns
export function looksLikeHeader(text) {
  const cells = firstLine(text.replace(/^\uFEFF/, ''))
    .split(sniffDelimiter(text))
    .map((cell) => cell.trim().replace(/^"|"$/g, '').toLowerCase());
  return cells.includes('source') && cells.includes('target');
}

/**
 * Parse text into a de-duplicated list of edges: {source, target, weight, ...extra columns}.
 * Duplicate edges (and, for undirected networks, reversed duplicates) are merged; the last wins.
 * Directed networks keep a->b and b->a as separate edges.
 * Throws DataError with a readable message for bad input.
 */
export function parseEdges(text, { hasHeader = false, directed = false, weighted = false } = {}) {
  text = text.replace(/^\uFEFF/, '');
  const dsv = d3.dsvFormat(sniffDelimiter(text));
  const rows = [];

  if (hasHeader) {
    const parsed = dsv.parse(text);
    const columns = (parsed.columns || []).map((c) => c.trim().toLowerCase());
    if (!columns.includes('source') || !columns.includes('target')) {
      throw new DataError('With "Header Row?" checked, your data needs columns named "source" and "target" (and "weight" for weighted networks).');
    }
    parsed.forEach((d, i) => {
      const row = {};
      parsed.columns.forEach((c, j) => { row[columns[j]] = d[c]; });
      const blank = Object.values(row).every((v) => v === undefined || String(v).trim() === '');
      if (blank) return;
      rows.push({ row, line: i + 2 });
    });
  } else {
    dsv.parseRows(text).forEach((cells, i) => {
      if (cells.every((c) => c.trim() === '')) return;
      if (cells.length < 2 || (weighted && cells.length < 3) || cells.length > 3) {
        throw new DataError(`Row ${i + 1} has ${cells.length} value${cells.length === 1 ? '' : 's'}.`);
      }
      rows.push({ row: { source: cells[0], target: cells[1], weight: cells[2] }, line: i + 1 });
    });
  }

  const edges = new Map();
  rows.forEach(({ row, line }) => {
    const source = String(row.source ?? '').trim();
    const target = String(row.target ?? '').trim();
    if (source === '' || target === '') {
      throw new DataError(`Row ${line} is missing a source or target.`);
    }
    let weight = 1;
    if (weighted) {
      weight = Number(row.weight);
      if (row.weight === undefined || String(row.weight).trim() === '' || isNaN(weight)) weight = 1;
    }
    const key = (directed || source <= target) ? `${source}\u0000${target}` : `${target}\u0000${source}`;
    edges.set(key, { ...row, source, target, weight });
  });

  if (edges.size === 0) {
    throw new DataError('No edges found. Paste, upload, or drop an edge list above.');
  }
  return [...edges.values()];
}
