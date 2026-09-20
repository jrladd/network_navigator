// Filter the force layout and arc diagram by an edge attribute (extra columns in your data).
// The filter lives in the shared selection state, so both views react to it.
import { selection } from './selection.js';

const HIDDEN_KEYS = ['source', 'target', 'scaled_weight', 'index', 'edgeClicked'];

// Build the "Filter by edge attribute" controls inside #edge-filter for the given edges
export function addEdgeAttributeDropdown(edgeList) {
	const root = d3.select('#edge-filter');
	root.selectAll('*').remove();
	if (edgeList.length === 0) return;

	// Offer every extra column; skip "weight" when all weights are the same (unweighted data)
	const weights = new Set(edgeList.map(e => e.weight));
	const keys = Object.keys(edgeList[0]).filter(k => !HIDDEN_KEYS.includes(k) && !(k === 'weight' && weights.size < 2));
	if (keys.length === 0) return;

	let attr = 'none';
	root.append('h3').text('Filter edges');

	const attributeField = root.append('div').classed('field', true);
	attributeField.append('label').attr('for', 'edge-attributes').text('Filter by edge attribute');
	attributeField.append('select')
		.attr('name', 'edge-attributes')
		.attr('id', 'edge-attributes')
		.on('change', edgeAttrChange)
		.selectAll('option')
		.data(['none', ...keys])
		.enter().append('option')
		.text(d => d);

	const details = root.append('div').classed('stack', true).attr('id', 'edge-attr-container');

	function edgeAttrChange() {
		attr = this.value;
		selection.setAttrFilter(null);
		details.selectAll('*').remove();
		if (attr === 'none') return;

		const typeField = details.append('div').classed('field', true);
		typeField.append('label').attr('for', 'edge-attr-type').text('This attribute is…');
		typeField.append('select')
			.attr('name', 'edge-attr-type')
			.attr('id', 'edge-attr-type')
			.on('change', function() {
				if (this.value === 'categorical') { createCategoryDropdown(); }
				else { createContinuousGraph(); }
			})
			.selectAll('option')
			.data(['categorical', 'continuous'])
			.enter().append('option')
			.text(d => d);

		createCategoryDropdown();
	}

	// Apply a filter that keeps the edges passing `test` (and the nodes they connect)
	function applyFilter(test) {
		const nodes = new Set();
		edgeList.forEach(e => {
			if (test(e)) {
				nodes.add(e.source.id);
				nodes.add(e.target.id);
			}
		});
		selection.setAttrFilter({ nodes, test });
	}

	function clearSubcontrols() {
		details.select('#category-container').remove();
		details.select('#continuous-container').remove();
	}

	function createCategoryDropdown() {
		clearSubcontrols();
		selection.setAttrFilter(null);
		const categories = ['', ...new Set(edgeList.map(e => e[attr]))];
		const field = details.append('div').attr('id', 'category-container').classed('field', true);
		field.append('label').attr('for', 'category-filter').text('Show only edges where it is');
		field.append('select')
			.attr('name', 'category-filter')
			.attr('id', 'category-filter')
			.on('change', function() {
				const value = this.value;
				if (value === '') {
					selection.setAttrFilter(null);
				} else {
					applyFilter(e => String(e[attr]) === value);
				}
			})
			.selectAll('option')
			.data(categories)
			.enter().append('option')
			.attr('value', d => d)
			.text(d => d === '' ? '(all)' : d);
	}

	function createContinuousGraph() {
		clearSubcontrols();
		selection.setAttrFilter(null);
		// Values from CSV columns are strings; keep only the numeric ones
		const data = edgeList.map(e => { return {'metric': +e[attr]} }).filter(d => Number.isFinite(d.metric));
		const containerDiv = details.append('div').attr('id', 'continuous-container').classed('field', true);
		if (data.length === 0) {
			containerDiv.text('This attribute has no numeric values.');
			return;
		}
		const lo = d3.min(data, d => d.metric);
		const hi = d3.max(data, d => d.metric);

		// Create SVG and containers
		const svg = containerDiv.append('svg')
			.attr('preserveAspectRatio', 'xMinYMin meet')
			.attr('viewBox', '0 0 1400 500');

		const margin = {top: 10, right: 30, bottom: 50, left: 90},
			width = 1400 - margin.left - margin.right,
			height = 500 - margin.top - margin.bottom;

		const container = svg.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		const x = d3.scaleLinear().domain([lo, hi]).range([0, width]);
		const y = d3.scaleLog().range([height, 0]).clamp(true).nice();

		// Set the parameters for the histogram
		const bins = d3.bin().value(d => d.metric).domain(x.domain())(data);

		// Scale the range of the data in the y domain
		y.domain([0.1, d3.max(bins, d => d.length)]);

		// Append the bar rectangles to the svg element
		container.selectAll('rect')
			.data(bins)
			.enter().append('rect')
			.attr('class', 'bar')
			.attr('x', 1)
			.attr('transform', d => 'translate(' + x(d.x0) + ',' + y(d.length) + ')')
			.attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
			.attr('height', d => height - y(d.length))
			.style('fill', '#08B3E5');

		// Text labels for histogram x axis
		container.append('text')
			.attr('class', 'x label right')
			.attr('text-anchor', 'end')
			.attr('x', width)
			.attr('y', height + (margin.bottom - 5))
			.attr('font-size', '2.5em')
			.text(hi);

		container.append('text')
			.attr('class', 'x label left')
			.attr('text-anchor', 'start')
			.attr('x', 0)
			.attr('y', height + (margin.bottom - 5))
			.attr('font-size', '2.5em')
			.text(lo);

		// Create brush to select part of histogram
		const brush = d3.brushX()
			.extent([[0, 0], [width, height]])
			.handleSize(0)
			.on('brush', updateBrush)
			.on('end', brushed);

		const brushSelection = container.append('g')
			.attr('class', 'brush')
			.call(brush);

		// Custom brush handles (code adapted from Six Degrees of Francis Bacon)
		brushSelection.selectAll('.handle-custom')
			.data([{type: 'w'}, {type: 'e'}])
			.enter().append('rect')
			.attr('class', d => d.type === 'e' ? 'handle-custom handle-e' : 'handle-custom handle-w')
			.attr('width', 20)
			.attr('height', height / 2)
			.attr('fill', 'black')
			.attr('rx', 2)
			.attr('ry', 2)
			.attr('cursor', 'ew-resize')
			.attr('x', d => d.type === 'e' ? width - 20 : 2)
			.attr('y', height / 4 + 5);

		function updateBrush() {
			// Use this brush's own selection rectangle (other brushes on the page have one too)
			const box = brushSelection.select('.selection').node().getBBox();
			brushSelection.select('.handle-custom.handle-w').attr('x', box.x - 2);
			brushSelection.select('.handle-custom.handle-e').attr('x', box.x + box.width - 2);
		}

		function brushed(event) {
			const s = event.selection;
			if (!s) return;
			const toValue = d3.scaleLinear().domain([0, width]).range([lo, hi]);
			const min = toValue(s[0]);
			const max = toValue(s[1]);
			applyFilter(e => min <= +e[attr] && +e[attr] <= max);
		}

		brushSelection.call(brush.move, [0, width]);
	}
}
