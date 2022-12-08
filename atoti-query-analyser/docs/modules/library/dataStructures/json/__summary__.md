The modules in this directory export interfaces that describe request data, as well as `validate...()` functions that
take the result of `JSON.parse()` as input, check if the interface matches and, if necessary, transform the data (for
example, an array in a `Set`, or an object in a `Map`).
