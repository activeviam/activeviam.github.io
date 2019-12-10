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
