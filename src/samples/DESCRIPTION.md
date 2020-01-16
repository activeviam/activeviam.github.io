Basics about a query
=======

The query plans reported in this project all starts from a single MDX query. For details about MDX, refer to our 
own [documentation page](https://activeviam.com/en/resource-center/mdx-query-basics), providing several links to 
external documentation.

A query can be issued on a single ActivePivot or on a distributed ActivePivot - acting as the entry points for a
cluster of instances. Entry points are referenced as Query Cube while the others are Data Cubes, because they are the
instances actually containing the data.  
A query can also be executed in multiple passes. For example, for a query with a Sub-Select on the top elements for a
particular measure - that would be equivalent to a condition `field IN (SELECT ...)` in SQL - the engine runs a first
pass to find the top elements. Then, a second query is executed specifically on the found members.

Basically, a retrieval operation consist of a function accepting:

 - a **location**, single point or range of points in the cube
 - a **filter**, restricting the visible context of the query
 - a **list of underlying results**, that may be empty.

Such a function produces values for one or more measures.

Structure of the query plan DTO
========

The following sections detail the structure of the DTO of the query plan.

### The JSON wrapper

At ActiveViam, our REST services all return the data wrapped with a status payload, in order to differ a successful
query from a failure. This comes in addition to HTTP codes, and is shared with our WS API.

In this document, we only consider successful queries. The wrapper operates as follow:

```json
{
  "status": "success",
  "data": "<content of the call>"
}
```

### Whole query plan

As mentionned in the introduction, a single query can be made of multiple steps and operated on various machines.
Thus, a query plan export consists of all those steps, listed in an array.

Each step is made of a `planInfo` section, containing details about the pass execution, a list of retrieval
operations `retrievals` and the `dependencies` between the retrievals.

#### Plan info

> For now, this section will not be extensively described. Questions must be asked to orient the documentation effort.

 - `pivotType`: type of the ActivePivot instance that handled the pass
 - `pivotId`: id of the ActivePivot instance that performed the pass
 - `epoch`: MVCC "timestamp" of the data used by the query
 - `branch`: Simulation branch of the data used by the query
 - `mxdPass`: unique id of the pass within the MDX engine
 - `clusterMemberId` (optional): id of the ActivePivot instance within the cluster
 - `globalTimings`: Timings of the total plan to:
    1. build the plan of the query - `PLANNING`
    2. materialize the plan as operations - `FINALIZATION`
    3. prepare the contextual information for the query execution - `CONTEXT`
    4. execute all operations of the plan - `EXECUTION`.
    Basically, `PLANNING` and `FINALIZATION` can be aggregated for as the duration of the plan build, while `CONTEXT`
    and `FINALIZATION` are part of the plan execution.  
    There is no total of those 4 values.
 - `queryFiltersById`: section referencing all the filters applied to a result. This section normalizes the filter
   attribute of a single retrieval operation, value that is often shared by a whole chain.
 - `continuous`: simple flag to mark the query as executed a single time or as part of a continuous query process
 - `measures`, `totalRetrievals`, `retrievalsCountByType` and `partitioningCountByType`, and `partialProviders` are 
   summary statistics of the retrievals in the plan. This is particularly interesting for end users when asking only 
   for the summary.

### Retrievals

A retrieval represents an operation performed at a given location, for a given filter to produce values for a selection
of measures. Multiple instances of the operation, executed in parallel thanks to the partitioning, are represented by a
single retrieval entry.

 - `retrId`: unique id of the retrieval
 - `type`: internal type of retrievals, detailled in [this table](#retrieval-types)
 - `partitioning`: string description of the partitioning used by the retrieval
 - `location`: location where the retrieval is executed
 - `measures`: list of measures produced by this retrieval
 - `filterId`: unique id of the filter applied to this retrieval. This references an entry of section `queryFiltersById`
 - `timingInfo`: timings per parallel operations. `startTime` provides the list of start times in milliseconds for each
   operation, while `elapsedTime` measures per operation the duration in milliseconds of the execution once started.
   Both lists are indexed by the partition id.  
   For Query Cubes, 3 additional statistics are added: `executionTime`, the time to execute all retrievals on a Data
   Cube, `broadcastingTime`, the time to send the results from the Data Cube to the Query Cube, and `processingTime`,
   the time to adapt the results to the Query Cube internals. All those times are expressed in milliseconds and
   indexed by underlying nodes instead of partition id.
  - `underlyingDataNodes`: list of the Distributed ActivePivot instances that provided the underlying results.
    Values of this list are values from `clusterMemberId` from section `planInfo`. This contains values only for 
    leaf retrievals of the plan of a Query Cube. But not all retrievals of a Query Cube are leaves, as computations
    can be run directly into Query Cubes on top of the leaves.

#### Retrieval types

| Type                                  | Description                                                                                                                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NoOpPrimitiveAggregatesRetrieval      | Empty Retrieval. This often serves as the base for other Retrievals, because each Retrieval needs an underlying Primitive Retrieval, for technical reasons.                                          |
| JITPrimitiveAggregatesRetrieval       | Retrieval of primitive measures performed on the Just-In-Time Aggregate Provider.                                                                                                                    |
| BitmapPrimitiveAggregatesRetrieval    | Retrieval of primitive measures performed on a full Bitmap Aggregate Provider or Leaf Aggregate Provider.                                                                                            |
| PartialPrimitiveAggregatesRetrieval   | Retrieval of NAMs performed by a Partial Aggregate Provider.                                                                                                                                         |
| PostProcessedAggregatesRetrieval      | Retrieval for a post-processed measure. This involves the execution of the Post-Processor #compute(..) method.                                                                                       |
| DistributedAggregatesRetrieval        | Retrieval of any measure performed by a Query Cube. These retrievals are the leaves of Distributed query plans. They perform the query to the underlying ActivePivots to involve in the computation. |
| PrimitiveResultsMerger                | Operation merging retrievals of primitive measures performed on many partitions to a lower number of partitions.                                                                                     |
| PostProcessedResultsMerger            | Operation merging retrievals of post-processed measures performed on many partitions to a lower number of partitions.                                                                                |
| ExternalDatastoreRetrieval            | Retrieval performing a request to a Datastore Store, as part as an Aggregation Procedures                                                                                                            |
| PrimitiveAnalysisAggregationRetrieval | Retrieval for primitive measures involving Analysis hierarchies.                                                                                                                                     |

### Dependencies

This section simply references for each retrieval the underlying retrievals required for the operation.
This is made of lists indexed by `retrId`s and containing `retrId`s of the underlyings. The special id `-1` represent
the abstract top root of the plan.

Descriptions of the queries
========

## _minimal-query.json_

MDX Query: `SELECT NON EMPTY [Measures].[pnl.SUM] ON COLUMNS FROM [EquityDerivativesCube]`

This is the very minimal query on our sandbox project. It queries for a single aggregated value.

## _basic-query.json_

MDX Query: `SELECT NON EMPTY [Measures].[pnl.SUM] ON COLUMNS, NON EMPTY Hierarchize( DrilldownLevel( [CounterParty].[CounterParty].[ALL].[AllMember] ) ) ON ROWS FROM [EquityDerivativesCube]`

This query asks for the measure _pnl.SUM_ for for one level and the total of all values for this level.

This query illustrates that we can have multiple top results for a query.

## _distributed-query.json_

MDX Query: `SELECT NON EMPTY [Measures].[pnl.SUM] ON COLUMNS FROM [EquityDerivativesCube]`

This query hits a distributed ActivePivot, that is an ActivePivot instance that has underlying ActivePivots on separate machines, contacted through the network to obtain the query results.

This plan illustrates that we can have many plans in a single request.
