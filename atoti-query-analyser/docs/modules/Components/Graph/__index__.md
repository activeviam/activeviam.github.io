# /modules/Components/Graph 

[Parent directory](../__index__.md)


## Table of contents 
* [Graph.md](#__autogen_17__)
* [Link.md](#__autogen_18__)
* [Menu.md](#__autogen_19__)
* [Node.md](#__autogen_20__)


## src/Components/Graph/Graph.tsx <a id="__autogen_17__"></a>
This component is responsible for representing the query execution plan in the form of a graph.

Tasks:

* Building an animated SVG for a given Retrievals graph;
* Interaction of the graph with the user (zoom, dragging);
* Filtering nodes by used _measures_.

## src/Components/Graph/Link.tsx <a id="__autogen_18__"></a>

This component is responsible for representing the edge of the graph as an SVG element.

## src/Components/Graph/Menu.tsx <a id="__autogen_19__"></a>

This component is responsible for the filter selection menu.

Tasks:

* Manage the list of selected measures;
* Search form among the available measures.

## src/Components/Graph/Node.tsx <a id="__autogen_20__"></a>
This component is responsible for the graphical representation of a vertex of the graph.

Tasks:

* Represents a vertex of the graph in the form of an SVG element;
* Display information about the corresponding Retrieval when you click on the vertex of the graph;
* Showing buttons to navigate to child queries.

