const assert = require('node:assert/strict');
const MathSpeech = require('../src/core/mathSpeech.js');

const parseCases = [
    ['48', 48],
    ['cuarenta y ocho', 48],
    ['ocho por seis es cuarenta y ocho', 48],
    ['ocho por seis igual a 48', 48],
    ['sesenta y tres', 63],
    ['nueve por siete son sesenta y tres', 63],
    ['cien', 100],
    ['veintidos', 22],
    ['veintidós', 22]
];

for (const [spoken, expected] of parseCases) {
    assert.equal(
        MathSpeech.parseSpanishNumber(spoken),
        expected,
        `Expected "${spoken}" to parse as ${expected}`
    );
}

const correctnessCases = [
    ['48', 48, true],
    ['cuarenta y ocho', 48, true],
    ['ocho por seis es cuarenta y ocho', 48, true],
    ['cuarenta y nueve', 48, false],
    ['no se', 48, false]
];

for (const [spoken, expected, isCorrect] of correctnessCases) {
    assert.equal(
        MathSpeech.isSpokenAnswerCorrect(spoken, expected),
        isCorrect,
        `Expected "${spoken}" correctness against ${expected} to be ${isCorrect}`
    );
}

console.log('mathSpeech tests passed');
