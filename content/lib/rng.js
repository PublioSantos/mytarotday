/** Picks `count` unique items from an array using a seeded random function. */
function pickUnique(array, count, random) {
  const pool = array.slice();
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

/** Picks one item from an array using a seeded random function. */
function pickOne(array, random) {
  return array[Math.floor(random() * array.length)];
}

module.exports = { pickUnique, pickOne };
