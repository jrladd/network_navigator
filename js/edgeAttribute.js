var graphType, attr, edgeList;

export function addEdgeAttributeDropdown(currentEdgeList, type) {
	graphType = type;
	d3.select('#attribute-section').remove();
	edgeList = currentEdgeList;
	let keys = Object.keys(edgeList[0]);
	keys = keys.filter(k => ['source','target','weight'].indexOf(k) === -1);
	keys.unshift('none');
	if (keys.length > 0) {
		var optionDiv = d3.select(`#customize-form #${graphType}`).append('div').classed("fl w-100 f6 mid-gray pv2", true).attr('id', 'attribute-section'),
		    label = optionDiv.append("label").attr("for", "edge-attributes").text("Filter by edge attribute: "),
		    select = optionDiv.append("select").attr("name", "edge-attributes").attr("id", "edge-attributes").on("change", edgeAttrChange),
		    options = select.selectAll('option').data(keys); // Data join

		options.enter().append("option").text(function(d) { return d; });
	}
}

function edgeAttrChange() {
	attr = this.value;
	resetOpacity();
	if (attr === 'none') {
		d3.select('#edge-attr-container').remove();
	} else {
		d3.select('#edge-attr-container').remove();
		var containerDiv= d3.select(`#customize-form #${graphType}`).append('div').attr("id", 'edge-attr-container').classed("fl w-100 f6 mid-gray pv2", true),
		    optionDiv = containerDiv.append("div").classed("fl w-50 f6 mid-gray pv2", true),
		    label = optionDiv.append("label").attr("for", "edge-attr-type").text("This attribute is..."),
		    select = optionDiv.append("select").attr("name", "edge-attr-type").attr("id", "edge-attr-type").on("change", function() {
			    if (this.value === 'categorical') { createCategoryDropdown(); }
			    else { console.log(this.value); }
		    }),
		    options = select.selectAll('option').data(['categorical', 'continuous']); // Data join

		options.enter().append("option").text(function(d) { return d; });
		createCategoryDropdown();
	}
}

function createCategoryDropdown() {
	d3.select('#category-container').remove();
	var categories = edgeList.map(e => e[attr]);
	categories = [...new Set(categories)]
	categories.unshift('');
	var optionDiv = d3.select(`#edge-attr-container`).append('div').attr("id", 'category-container').classed("fl w-50 f6 mid-gray pv2", true),
	    label = optionDiv.append("label").attr("for", "category-filter").text("Filter by: "),
	    select = optionDiv.append("select").attr("name", "category-filter").attr("id", "category-filter").on("change", function() {
		    let nodes = [];
		    edgeList.forEach(e => {
			    if (e[attr].toString() === this.value) {
				    nodes.push(e.source.id);
				    nodes.push(e.target.id);
			    }
		    });
		    if (graphType === 'force-layout') {
			    d3.selectAll('.edge').style('opacity', l => { return l[attr].toString() === this.value ? 1 : 0.1});
			    d3.selectAll('.node').style('opacity', n => { return nodes.indexOf(n.id) !== -1 ? 1 : 0.1});
		    } else if (graphType === 'arc-diagram') {
			    d3.selectAll('.arc').style('opacity', l => { return l[attr].toString() === this.value ? 1 : 0.1});
			    d3.selectAll('.node-arc').style('opacity', n => { return nodes.indexOf(n.id) !== -1 ? 1 : 0.1});
		    }
	    }),
	    options = select.selectAll('option').data(categories); // Data join

	options.enter().append("option").text(function(d) { return d; });
}

function resetOpacity() {
	d3.selectAll('.edge').style('opacity', 1);
	d3.selectAll('.node').style('opacity', 1);
	d3.selectAll('.arc').style('opacity', 1);
	d3.selectAll('.node-arc').style('opacity', 1);
}
