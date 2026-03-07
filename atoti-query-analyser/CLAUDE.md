# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Atoti Query Analyzer is a React-based web application for analyzing ActivePivot query execution plan reports. It supports both V1 (text log format) and V2 (JSON) query plan formats.

## Commands

```bash
npm start          # Development server at localhost:3000
npm test           # Run Jest tests in watch mode
npm run build      # Production build to ./build
npm run eslint     # Lint and auto-fix src/**/*.{js,ts,tsx}
npm run cypress    # Run Cypress E2E tests (requires dev server running)
```

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

- Jest unit tests: `src/**/*.test.{ts,tsx}`
- Cypress E2E tests: `cypress/integration/` - test fixtures in `cypress/fixtures/exports/`
