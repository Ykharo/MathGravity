const assert = require('node:assert/strict');
const AreaModelCalculator = require('../../src/core/computerTutor/areaModelCalculator.js');

console.log('--- Testing AreaModelCalculator Range Validation ---');

const invalidCases = [
    { a: 15, b: 5, s: 'group1-five-skip', err: 'FUERA DE RANGO' },
    { a: 5, b: 15, s: 'group1-five-skip', err: 'FUERA DE RANGO' },
    { a: 0, b: 5, s: 'group1-five-skip', err: 'MAYORES A 0' },
    { a: 5, b: -2, s: 'group1-five-skip', err: 'MAYORES A 0' }
];

invalidCases.forEach(({ a, b, s, err }) => {
    try {
        AreaModelCalculator.calculate(a, b, s);
        assert.fail(`Should have thrown for ${a}x${b}`);
    } catch (e) {
        assert.ok(e.message.includes(err), `Error message should include "${err}", got "${e.message}"`);
        console.log(`OK: Error detectado para ${a}x${b}: ${e.message}`);
    }
});

console.log('AreaModelCalculator range tests passed!');
