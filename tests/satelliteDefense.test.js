const assert = require('node:assert/strict');
const SatelliteDefense = require('../src/core/satelliteDefense.js');

const difficultFacts = SatelliteDefense.getDifficultFacts([
    { a: 3, b: 4, errors: 1 },
    { a: 7, b: 9, errors: 4 },
    { a: 7, b: 9, errors: 2 },
    { a: 8, b: 8, errors: 3 }
]);

assert.deepEqual(
    difficultFacts.map(fact => `${fact.a}x${fact.b}`),
    ['7x9', '8x8', '3x4'],
    'failed facts should be sorted by error count and deduplicated'
);

const fallbackChallenge = SatelliteDefense.chooseChallenge([], undefined, 1);
assert.equal(fallbackChallenge.a * fallbackChallenge.b, fallbackChallenge.result);
assert.equal(fallbackChallenge.a, 7);
assert.equal(fallbackChallenge.b, 9);

const wrappedChallenge = SatelliteDefense.chooseChallenge([{ a: 4, b: 6, errors: 1 }], undefined, 4);
assert.deepEqual(wrappedChallenge, { a: 4, b: 6, result: 24 });

const options = SatelliteDefense.generateAnswerOptions(72);
assert.equal(options.length, 3);
assert(options.includes(72), 'options should include the correct answer');
assert.equal(new Set(options).size, 3, 'options should not repeat answers');
assert(options.every(answer => answer > 0), 'options should stay positive');

console.log('satelliteDefense tests passed');
