const assert = require('node:assert/strict');
const MultiplicationParser = require('../../src/core/computerTutor/multiplicationParser.js');

console.log('--- Testing MultiplicationParser ---');

const testCases = [
    { input: '8x7', expected: { left: 8, right: 7 } },
    { input: '8 x 7', expected: { left: 8, right: 7 } },
    { input: '9*6', expected: { left: 9, right: 6 } },
    { input: '5 × 4', expected: { left: 5, right: 4 } },
    { input: ' 10x10 ', expected: { left: 10, right: 10 } }
];

testCases.forEach(({ input, expected }) => {
    const result = MultiplicationParser.parse(input);
    assert.deepEqual(result, expected, `Failed to parse "${input}"`);
    console.log(`OK: "${input}" -> ${JSON.stringify(result)}`);
});

const errorCases = [
    '',
    '8+7',
    'abc',
    '8x',
    'x7'
];

errorCases.forEach(input => {
    assert.throws(() => {
        MultiplicationParser.parse(input);
    }, Error, `Should have thrown error for "${input}"`);
    console.log(`OK: Error detectado correctamente para "${input}"`);
});

console.log('MultiplicationParser tests passed!');
