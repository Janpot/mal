export function * pairwise (array) {
  for (let i = 0; i < array.length; i += 2) {
    yield array.slice(i, i + 2);
  }
}
