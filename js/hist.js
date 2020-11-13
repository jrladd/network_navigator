export function drawHist(data) {
	data = Object.entries(data).map(d => { return {name: d[0], metric:d[1]}; });
	
	var svg = d3.select("svg#hist")
         .attr("preserveAspectRatio", "xMinYMin meet")
         .attr("viewBox", "0 0 1400 500")
         .classed("svg-content-responsive", true);
     
        var margin = {top: 10, right: 30, bottom: 30, left: 40},
	  width = +svg.attr('width')+1400 - margin.left - margin.right,
          height = +svg.attr('height')+500 - margin.top - margin.bottom;

	svg.selectAll('*').remove();

	svg.append("g")
          .attr("transform", 
                "translate(" + margin.left + "," + margin.top + ")");

	var x = d3.scaleLinear()
	  .domain([0, d3.max(data, function(d) { return d.metric; })])
          .range([0, width]);
	var y = d3.scaleLinear()
          .range([height, 0]);
	
	// set the parameters for the histogram
	var histogram = d3.histogram()
	    .value(function(d) { return d.metric; })
	    .domain(x.domain());
	
	var bins = histogram(data);

	// Scale the range of the data in the y domain
	y.domain([0, d3.max(bins, function(d) { return d.length; })]);
	
	// append the bar rectangles to the svg element
	svg.selectAll("rect")
	    .data(bins)
	  .enter().append("rect")
	    .attr("class", "bar")
	    .attr("x", 1)
	    .attr("transform", function(d) {
	      	  return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
	    .attr("width", function(d) { return x(d.x1) - x(d.x0) -1 ; })
	    .attr("height", function(d) { return height - y(d.length); });
	
	// add the x Axis
	svg.append("g")
	    .attr("transform", "translate(0," + height + ")")
	    .call(d3.axisBottom(x));
	
	// add the y Axis
	svg.append("g")
	    .call(d3.axisLeft(y));
}
