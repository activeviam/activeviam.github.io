# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Atoti Query Analyzer is a React-based web application for analyzing ActivePivot query execution plan reports. It supports both V1 (text log format) and V2 (JSON) query plan formats.

## Commands

```bash
npm start          # Development server at localhost:3000
npm run build      # Production build to ./build
npm run eslint     # Lint and auto-fix src/**/*.{js,ts,tsx}
npm run format-prettier # Run prettier to format the code according to conventions
```

## Key features

### Input page to load graph

It can be loaded from files, from a pasted file content or by querying a distant server with a given MDX query.

Old plans can be restored from the IndexedDB. This history is limited to the last 5 plans.

### Summary page

Showing all the measures in the graph.
Showing all the data and query nodes involved

For a given node, it reports the time spend in the database layer, the network layer, the engine layer.

### Graph page

Showing the graph of nodes executing a given node.

The graph view uses a VS Code-style left sidebar layout:
- **Activity Bar**: A permanent vertical icon column (48px wide) on the left side
- **Sidebar Drawer**: Clicking an icon opens a floating panel that slides over the graph (does not resize the graph)
- **Filters Panel**: Contains measure filtering, zoom controls, untangle button, fast retrieval condensation settings, and critical score filter

The sidebar architecture is designed to support multiple panels in the future. The `activePanel` state accepts panel IDs like `"filters"` and can be extended with additional panels.

### Timeline

Showing a timeline of the operations, with an ordering created from the graph timing, by sorting them on as less lines as possible.

This view does not report the actual thread execution in the backend, as this information is not encoded in the plan.

## Architecture

### Data Flow

1. **Input Processing**: Raw input (V1 text or JSON) is parsed in `src/library/inputProcessors/`
   - V1 logs are converted to V2 JSON via `v1tov2.ts`
   - JSON is validated and transformed into `JsonQueryPlan` objects

2. **Query Plan Processing**: `preprocessQueryPlan()` in `src/library/dataStructures/processing/queryPlan.ts` converts JSON into internal `QueryPlan` objects containing:
   - `planInfo`: Query metadata
   - `graph`: `RetrievalGraph` - the core data structure representing retrieval dependencies
   - `queryFilters`: Applied filters
   - `querySummary`: Statistics

3. **State Management**: `App.tsx` is the root component managing:
   - `queryPlans`: List of processed QueryPlan objects
   - `queryMetadata`: Pass/query relationships extracted via `extractMetadata()`
   - `selections`: Per-query vertex selection state for graph filtering
   - Current route, pass, and query IDs

### Key Data Structures

- **RetrievalGraph** (`src/library/dataStructures/json/retrieval.ts`): Graph of retrieval operations with timing info and dependencies
- **QueryPlanMetadata** (`src/library/graphProcessors/extractMetadata.ts`): Tree structure for passes and query dependencies
- **VertexSelection** (`src/library/dataStructures/processing/selection.ts`): Controls which nodes are visible/highlighted in graph view

### Component Sections

- **Input**: File/text input and server query forms
- **Summary**: Query statistics table
- **PassGraph**: Visualization of passes and query dependencies
- **Graph**: D3-based force-directed graph of retrievals
- **Timeline**: Execution timeline of retrievals

### Library Structure

`src/library/` contains React-free logic:
- `dataStructures/common/`: Generic containers (Graph, Dictionary, UnionFind)
- `dataStructures/json/`: JSON parsing/validation interfaces
- `dataStructures/processing/`: Internal processed data types
- `graphProcessors/`: Graph algorithms (critical path, clustering, filtering)
- `graphView/`: D3 visualization helpers
- `inputProcessors/`: Input parsing (V1 logs, server queries)

## Testing

- Cypress E2E tests: `cypress/integration/` - test fixtures in `cypress/fixtures/exports/` (not working anymore at the moment)
