# /modules/library/dataStructures/json 
The modules in this directory export interfaces that describe request data, as well as `validate...()` functions that
take the result of `JSON.parse()` as input, check if the interface matches and, if necessary, transform the data (for
example, an array in a `Set`, or an object in a `Map`).


[Parent directory](../__index__.md)


## Table of contents 
* [cubeLocation.md](#__autogen_48__)
* [dependencyMap.md](#__autogen_49__)
* [filter.md](#__autogen_50__)
* [jsonQueryPlan.md](#__autogen_51__)
* [measure.md](#__autogen_52__)
* [planInfo.md](#__autogen_53__)
* [querySummary.md](#__autogen_54__)
* [retrieval.md](#__autogen_55__)
* [timingInfo.md](#__autogen_56__)
* [validatingUtils.md](#__autogen_57__)


## src/library/dataStructures/json/cubeLocation.ts <a id="__autogen_48__"></a>
This module contains the `CubeLocation` interface for storing information about `Location` from ActivePivot.

## src/library/dataStructures/json/dependencyMap.ts <a id="__autogen_49__"></a>
This module contains the `DependencyMap` interface for storing dependencies between retrievals.

## src/library/dataStructures/json/filter.ts <a id="__autogen_50__"></a>
This module contains the `Filter` interface corresponding to `com.quartetfs.biz.pivot.context.subcube.ICubeFilter` from ActivePivot.

## src/library/dataStructures/json/jsonQueryPlan.ts <a id="__autogen_51__"></a>
This module exports the `JsonQueryPlan` interface corresponding to user data in JSON format.

## src/library/dataStructures/json/measure.ts <a id="__autogen_52__"></a>
This module contains the `Measure` interface.

## src/library/dataStructures/json/planInfo.ts <a id="__autogen_53__"></a>
This module contains `PlanInfo` interface.

## src/library/dataStructures/json/querySummary.ts <a id="__autogen_54__"></a>
This module contains `QuerySummary` interface.

## src/library/dataStructures/json/retrieval.ts <a id="__autogen_55__"></a>
This module contains interfaces corresponding to different types of retrievals, as well as classes for working with the
retrievals graph.

## src/library/dataStructures/json/timingInfo.ts <a id="__autogen_56__"></a>
This module contains `TimingInfo` interface.

## src/library/dataStructures/json/validatingUtils.ts <a id="__autogen_57__"></a>

This module contains helper functions for validation.