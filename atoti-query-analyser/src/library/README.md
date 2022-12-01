# The helper files

This README is completely outdated, TODO fix it

In this folders are all the functions that allows us to manipulate the data of the application.

We will explain here the purpose of each file.

## jsonToD3Data.js

We recieve a big object, JSON format, that contains a list of queries. For us, each query is a graph to display. We need to convert this data so the App can use it easily and so D3 can display it.

D3 takes a list of nodes and a list of links. If links and nodes are coherent, D3 can display them. We can give them some characteristic that D3 will take into account in the display.

For each query, this functions computes a list of nodes and a list of links.

A link looks like this:

```javascript
{
    source: the id of the parent node
    target: the id of the child node (he depends on the parent node)
    id: the unique id of the link
    critical: is true if the link is part of the critical path
}
```

A node looks like this:

```javascript
{
    id: int id of the node (same as retrieval)
    name: str id of the node
    chlidrenIds: list of the ids of underlying graphs
    isSelected: only one node selected at the time, when user clicks on it
    details: usefull insight on retrieval that user might want to know about
    clusterId: in case graph can be seen as multiple graphs
    radius: the radius the node should be displayed with
    yFixed: the y coordinate the node should have
    status: leaf, root or else
}
```

For each query of the input, the main function will compute this object:

```javascript
{
    id: id of the query,
    parentId: if is an undelying graphe, id of the parent graph
    pass: the pass the query belongs to,
    name: clusterMenberId of the query
    nodes: will be given to D3
    links: will be given to D3
}
```

In odrer to return accurate data, the main function will use the other helpers

## cluster.ts

In some case, a graph can actually be multiple graphs, because some groups of nodes does not have dependencies with the others. In this case, we want the graphs to be displayed separately and not on top of each other

This is why we compute clusters in our graph, so that D3 kwows he has to seperate some nodes

## depth.js

We define the concept of node depth, such as each node must be deeper than the nodes it depends on. Our nodes are plotted according to their depth, the attribute `yFixed` of a node is computed based on its depth

The functions computeDepth compute each node's depth

## criticalPath.ts

A path is a sequence of nodes, starting with a root, ending with a leaf, and where each node depends on the previous one.

The critical path is the path were the sum of all the elapsed time is maximal.

Even with unlimited resources, we cannot be faster than the critical path.

Each link belonging to the critical path is marked as so in this function.

## v1tov2.js

Written by ActiveViam, allows to convert ancient format data to the new format (JSON)

## server.js

Written by ActiveViam, allows to import data from server

## graphHelpers.js

Functions that tell D3 how nodes and links should be displayed (position, size, color
