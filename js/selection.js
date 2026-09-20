// Shared interaction state for the table and all visualizations, so each view doesn't need
// its own copy of the same logic. Views subscribe with addEventListener(type, fn, { signal });
// aborting the signal (done on every "Navigate") removes the listener.
//
// Events:
//   'select'     - the selected node changed (see .selected)
//   'filter'     - the table search changed (.filter is a Set of visible node ids, or null for all)
//   'attrfilter' - the edge-attribute filter changed (.attrFilter is {nodes: Set, test: fn} or null)

class Selection extends EventTarget {
  constructor() {
    super();
    this.reset();
  }

  // Forget all state without notifying anyone (used when a new network is loaded)
  reset() {
    this.selected = null;
    this.filter = null;
    this.attrFilter = null;
  }

  select(id) {
    const next = id === undefined ? null : id;
    if (next === this.selected) return;
    this.selected = next;
    this.dispatchEvent(new Event('select'));
  }

  clear() {
    this.select(null);
  }

  setFilter(ids) {
    this.filter = ids;
    this.dispatchEvent(new Event('filter'));
  }

  // filter: {nodes: Set of node ids, test: (edge) => boolean} or null
  setAttrFilter(filter) {
    this.attrFilter = filter;
    this.dispatchEvent(new Event('attrfilter'));
  }

  // True if a node should be shown given the table search
  isVisible(id) {
    return !this.filter || this.filter.has(id);
  }

  // True if a node passes the edge-attribute filter (used for dimming)
  passesAttrFilter(id) {
    return !this.attrFilter || this.attrFilter.nodes.has(id);
  }
}

export const selection = new Selection();
