const assert = require('node:assert/strict');
const AreaModelCalculator = require('../../src/core/computerTutor/areaModelCalculator.js');

console.log('--- Testing AreaModelCalculator ---');

// Test Tabla del 10
const resTen = AreaModelCalculator.calculate(10, 4, 'group1-ten-shift');
assert.equal(resTen.answer, 40);
assert.equal(resTen.formula, '10 x 4 = 40');
console.log('OK: Strategy Ten');

// Test Tabla del 5
const resFive = AreaModelCalculator.calculate(5, 6, 'group1-five-skip');
assert.equal(resFive.answer, 30);
assert.deepEqual(resFive.sequence, [5, 10, 15, 20, 25, 30]);
console.log('OK: Strategy Five');

// Test Tabla del 2
const resDouble = AreaModelCalculator.calculate(2, 8, 'group1-double');
assert.equal(resDouble.answer, 16);
assert.equal(resDouble.formula, '2 x 8 = 16');
console.log('OK: Strategy Double');

// Test Tabla del 9 (9x7)
const resNine = AreaModelCalculator.calculate(9, 7, 'group2-nine-subtract');
assert.equal(resNine.answer, 63);
assert.equal(resNine.rows, 10);
assert.equal(resNine.cols, 7);
assert.equal(resNine.base.value, 70);
console.log('OK: Strategy Nine (9x7)');

// Test Tabla del 9 (3x9) - El caso reportado
const resNineRev = AreaModelCalculator.calculate(3, 9, 'group2-nine-subtract');
assert.equal(resNineRev.answer, 27);
assert.equal(resNineRev.rows, 10);
assert.equal(resNineRev.cols, 3);
assert.equal(resNineRev.base.value, 30);
console.log('OK: Strategy Nine (3x9) - FIXED');

// Test Modelo de Area (8x7 - Grupo 3.2)
const resArea = AreaModelCalculator.calculate(8, 7, 'group3-area-decomposition');
assert.equal(resArea.answer, 56);
assert.equal(resArea.subgroup, '3.2');
assert.equal(resArea.blocks.length, 2);
assert.equal(resArea.blocks[0].value, 40); // 8x5
assert.equal(resArea.blocks[0].interaction, 'horizontal');
assert.equal(resArea.blocks[1].value, 16); // 8x2
assert.equal(resArea.blocks[1].interaction, 'vertical');
console.log('OK: Strategy Area 3.2 (Decomposition)');

// Test Modelo de Area (3x4 - Grupo 3.1)
const resAreaSmall = AreaModelCalculator.calculate(3, 4, 'group3-area-decomposition');
assert.equal(resAreaSmall.answer, 12);
assert.equal(resAreaSmall.subgroup, '3.1');
assert.equal(resAreaSmall.blocks.length, 1);
assert.equal(resAreaSmall.blocks[0].interaction, 'horizontal');
console.log('OK: Strategy Area 3.1 (Small)');

console.log('AreaModelCalculator tests passed!');
