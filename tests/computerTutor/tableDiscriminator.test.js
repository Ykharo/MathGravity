const assert = require('node:assert/strict');
const TableDiscriminator = require('../../src/core/computerTutor/tableDiscriminator.js');

console.log('--- Testing TableDiscriminator ---');

const testCases = [
    { left: 10, right: 4, expected: 'group1-ten-shift' },
    { left: 7, right: 10, expected: 'group1-ten-shift' },
    { left: 5, right: 6, expected: 'group1-five-skip' },
    { left: 2, right: 8, expected: 'group1-double' },
    { left: 9, right: 7, expected: 'group2-nine-subtract' },
    { left: 8, right: 7, expected: 'group3-area-decomposition' },
    { left: 3, right: 4, expected: 'group3-area-decomposition' },
    // Casos de prioridad
    { left: 10, right: 5, expected: 'group1-ten-shift' },
    { left: 5, right: 2, expected: 'group1-five-skip' },
    { left: 2, right: 9, expected: 'group1-double' }
];

testCases.forEach(({ left, right, expected }) => {
    const result = TableDiscriminator.getStrategy(left, right);
    assert.equal(result, expected, `Failed for ${left}x${right}. Expected ${expected}, got ${result}`);
    console.log(`OK: ${left}x${right} -> ${result}`);
});

console.log('TableDiscriminator tests passed!');
