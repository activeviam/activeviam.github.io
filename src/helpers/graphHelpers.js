import * as d3 from "d3";

const color = d3.scaleOrdinal(d3.schemeCategory10);

const updateGraph = selection => {
  selection.selectAll(".node").call(updateNode);
  selection.selectAll(".link").call(updateLink);
};

const enterLink = selection => {
  selection
    .attr("stroke-width", 2)
    .style("stroke", "yellow")
    .style("opacity", ".2");
};

const updateLink = selection => {
  selection
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);
};

const enterNode = selection => {
  selection
    .select("circle")
    .attr("r", 30)
    .style("fill", function(d) {
      return color(d.name);
    });

  selection
    .select("text")
    .attr("dy", ".35em")
    .style("transform", "translateX(-50%,-50%");
};

const updateNode = selection => {
  selection.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
};

export { updateGraph, enterLink, updateLink, enterNode, updateNode };
