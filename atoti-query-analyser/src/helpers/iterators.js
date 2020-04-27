const forEach = (iterator, consumer) => {
  for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
    const result = consumer(entry.value);
    if (result !== undefined) {
      return result;
    }
  }
  return undefined;
};

const reduce = (iterator, consumer, init) => {
  let result = init;
  for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
    result = consumer(result, entry.value);
  }
  return result;
};

export { forEach, reduce };
