// Code to create and draw histogram of metrics
export function drawHist(data) {
	// Reconfigure data object
	data = Object.entries(data).map(d => { return {name: d[0], metric:d[1]}; });
	
	// Create SVG and containers
	var svg = d3.select("svg#hist")
         .attr("preserveAspectRatio", "xMinYMin meet")
         .attr("viewBox", "0 0 1400 500");
     
        var margin = {top: 10, right: 30, bottom: 50, left: 90},
	  width = +svg.attr('width')+1400 - margin.left - margin.right,
          height = +svg.attr('height')+500 - margin.top - margin.bottom;

	svg.selectAll('*').remove();

	var container = svg.append("g")
          .attr("transform", 
                "translate(" + margin.left + "," + margin.top + ")");

	var x = d3.scaleLinear()
	  .domain([0, d3.max(data, function(d) { return d.metric; })])
          .range([0, width]);
	var y = d3.scaleLog()
          .range([height, 0])
	  .clamp(true)
	  .nice();
	
	// Set the parameters for the histogram
	var histogram = d3.histogram()
	    .value(function(d) { return d.metric; })
	    .domain(x.domain());
	
	var bins = histogram(data);

	// Scale the range of the data in the y domain
	y.domain([0.1, d3.max(bins, function(d) { return d.length; })]);
	
	// Append the bar rectangles to the svg element
	container.selectAll("rect")
	    .data(bins)
	  .enter().append("rect")
	    .attr("class", "bar")
	    .attr("x", 1)
	    .attr("transform", function(d) {
	      	  return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
	    .attr("width", function(d) { return x(d.x1) - x(d.x0) -1 ; })
	    .attr("height", function(d) { return height - y(d.length);
		})
		.style('fill', '#08B3E5');
	
	// Add the x Axis
	container.append("g")
	    .attr("transform", "translate(0," + height + ")")
	    .call(d3.axisBottom(x));
	
	// Add the y Axis
	container.append("g")
	    .call(d3.axisLeft(y));

	container.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + (margin.bottom - 5))
	    .attr("font-size", "1.5em")
            .text("value range for selected metric");

	svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
	    .attr("x", -margin.top)
            .attr("dy", ".75em")
	    .attr("font-size", "1.5em")
            .attr("transform", "rotate(-90)")
            .text("number of nodes in range (log scale)");
}
