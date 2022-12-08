# Atoti Query Analyzer

## Application Overview

This application is used to analyze query execution plan reports. It can consume data in format of ActivePivot logs (referred to as V1) and in form of JSON.

Application has 4 sections: Input, Summary, Graph, Timeline.

Input is used for consuming plan reports.

Summary shows statistics on queries (e.g. execution time, measures, count of retrievals by type etc.)

Graph shows retrievals executed within a query, as well as dependencies between them.

Timeline represents execution time of retrievals.

## Data model

Input data is organized in form of list of query plans (see `com.quartetfs.biz.pivot.query.aggregates.IQueryPlan`). Each query corresponds to a _pass_. Within one pass, queries form a dependency tree.
![passes](https://user-images.githubusercontent.com/1702694/206495787-7cdb94cf-ba6c-4c85-8de1-413499411451.svg)

List of processed query plans is stored in `queryPlans` state variable of the `App` component.
Relations between queries (tree structure and pass info) are stored in `queryMetadata` varaible.

Each query has a set of retrievals. Some of them depend on others. Graph of retrievals is stored as `RetrievalGraph`.

## Project structure

* `cypress`: testing stuff,
* `public`: static assets of the web application,
* `src`: source code
    * `Components`: React components
        * `Details`: component for showing retrieval info
        * `ErrorBoundary`: technical component for catching react rendering-time errors
        * `Graph`: component for graph drawing
        * `Input`: component for input consuming
        * `NavBar`: component for navigation panel
        * `Notification`: technical component for showing notifications
        * `Summary`: component for showing query summary
        * `Timeline`: component for showing timeline
    * `hooks`: react hooks (mechanism for indirect communication between components and arbitrary js code)
    * `library`: React-free part of code
        * `dataStructures`: data structures used in this project
            * `common`: reusable containers and algorithms
            * `d3`: interfaces for communication with d3.js
            * `json`: interfaces and functions for parsing and validating raw json
            * `processing`: interfaces and functions for building handy internal data representation
        * `devTools`: utilities for making debugging easier
        * `graphProcessors`: tools for processing query plans
        * `graphView`: tools for graph visualization
        * `inputProcessors`: tools for input parsing and processing
        * `utulities`: helper functions
