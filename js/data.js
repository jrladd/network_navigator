// Turning pasted or uploaded text into a list of edges

// Thrown for problems with the user's data (as opposed to bugs)
// Errors about one row also carry its line number and the line the user typed, so the page can point at it.
export class DataError extends Error {
  constructor(message, { line, text } = {}) {
    super(message);
    this.line = line;
    this.text = text;
  }
}

// Lines that start with "%" (KONECT, MatrixMarket) or with "#" followed by a space or nothing (SNAP)
// are comments. A "#" attached to a name ("#metoo") is data, so hashtag networks still work.
const COMMENT_LINE = /^\s*(%|#(\s|$))/;

const stripBom = (text) => text.replace(/^\uFEFF/, '');

// Comment lines become blank lines, so "Row N" in error messages is still the line the user sees
function blankComments(text) {
  return stripBom(text).split(/\r?\n/).map((line) => (COMMENT_LINE.test(line) ? '' : line)).join('\n');
}

/**
 * Work out what separates the columns. Commas, tabs, and semicolons are used when they appear
 * anywhere in the data (names may contain spaces then); only when none of them appear are
 * columns separated by whitespace. Comment lines and text inside "double quotes" are ignored.
 *
 * @returns {'\t' | ',' | ';' | 'whitespace'}
 */
export function detectSeparator(text) {
  const lines = blankComments(text).split('\n').map((line) => line.replace(/"[^"]*"/g, ''));
  const appears = (character) => lines.some((line) => line.includes(character));
  if (appears('\t')) return '\t';
  if (appears(',')) return ',';
  if (appears(';')) return ';';
  return 'whitespace';
}

// A short description of how the columns will be read, for the note under the data box ('' if no data)
export function describeSeparator(text) {
  if (blankComments(text).trim() === '') return '';
  const separator = detectSeparator(text);
  if (separator === '\t') return 'Columns separated by tabs.';
  if (separator === ',') return 'Columns separated by commas.';
  if (separator === ';') return 'Columns separated by semicolons.';
  return 'Columns separated by spaces. A name can only contain spaces if it is in "quotes".';
}

// Split a line on whitespace, keeping "quoted text" together as one value
function splitWhitespace(line) {
  return (line.match(/"[^"]*"|\S+/g) || []).map((token) =>
    token.length >= 2 && token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token);
}

// The data as rows of values with their line numbers; blank and comment lines are left out
function readRows(text) {
  const clean = blankComments(text);
  const separator = detectSeparator(text);
  const rows = separator === 'whitespace'
    ? clean.split('\n').map(splitWhitespace)
    : d3.dsvFormat(separator).parseRows(clean);
  return {
    separator,
    rows: rows
      .map((cells, i) => ({ cells, line: i + 1 }))
      .filter(({ cells }) => !cells.every((cell) => cell.trim() === ''))
  };
}

// True if the first line looks like a header naming "source" and "target" columns
export function looksLikeHeader(text) {
  const { rows } = readRows(text);
  if (rows.length === 0) return false;
  const cells = rows[0].cells.map((cell) => cell.trim().toLowerCase());
  return cells.includes('source') && cells.includes('target');
}

/**
 * Parse text into a de-duplicated list of edges: {source, target, weight, ...extra columns}.
 * Duplicate edges (and, for undirected networks, reversed duplicates) are merged; the last wins.
 * Directed networks keep a->b and b->a as separate edges.
 * Throws DataError with a readable message for bad input.
 */
export function parseEdges(text, { hasHeader = false, directed = false, weighted = false } = {}) {
  const { separator, rows: parsedRows } = readRows(text);
  const rawLines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const rows = [];

  if (hasHeader) {
    const [header, ...body] = parsedRows;
    const columns = header ? header.cells.map((cell) => cell.trim().toLowerCase()) : [];
    if (!columns.includes('source') || !columns.includes('target')) {
      throw new DataError('With "Header Row?" checked, your data needs columns named "source" and "target" (and "weight" for weighted networks).');
    }
    body.forEach(({ cells, line }) => {
      const row = {};
      columns.forEach((column, j) => { row[column] = cells[j]; });
      rows.push({ row, line });
    });
  } else {
    // Spaces are a common separator online, but then a name can't contain one: say so
    const hint = separator === 'whitespace'
      ? ' Spaces separate the columns in your data (no commas, tabs, or semicolons were found), so a name with spaces needs "quotes", or separate the columns with commas or tabs instead.'
      : '';
    parsedRows.forEach(({ cells, line }) => {
      if (cells.length < 2 || (weighted && cells.length < 3) || cells.length > 3) {
        throw new DataError(`Row ${line} has ${cells.length} value${cells.length === 1 ? '' : 's'}.${hint}`, { line, text: rawLines[line - 1] });
      }
      rows.push({ row: { source: cells[0], target: cells[1], weight: cells[2] }, line });
    });
  }

  const edges = new Map();
  rows.forEach(({ row, line }) => {
    const source = String(row.source ?? '').trim();
    const target = String(row.target ?? '').trim();
    if (source === '' || target === '') {
      throw new DataError(`Row ${line} is missing a source or target.`, { line, text: rawLines[line - 1] });
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

/**
 * Split the edges of a bipartite network into its two node sets: set A is every name in the first
 * column, set B every name in the second (first-appearance order). Throws DataError if a name
 * appears in both columns, since then the columns don't define two separate sets.
 */
export function splitSets(edges) {
  const A = new Set(edges.map((edge) => edge.source));
  const B = new Set(edges.map((edge) => edge.target));
  const both = [...A].filter((name) => B.has(name));
  if (both.length > 0) {
    const shown = both.slice(0, 5).map((name) => `"${name}"`).join(', ');
    const more = both.length > 5 ? `, and ${both.length - 5} more` : '';
    throw new DataError(
      `${both.length === 1 ? 'The name' : `${both.length} names`} ${shown}${more} appear${both.length === 1 ? 's' : ''} in both columns. ` +
      'In a bipartite network every node belongs to just one set, so the first and second columns can\'t share names. ' +
      'Check your data, or choose "One-mode" if this is an ordinary network.'
    );
  }
  return { A, B };
}
