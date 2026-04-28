const assert = require('node:assert/strict');
const MathProgress = require('../src/core/mathProgress.js');

function createMemoryStorage() {
    const data = {};
    return {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
        },
        setItem(key, value) {
            data[key] = value;
        }
    };
}

const start = new Date('2026-04-28T12:00:00.000Z');
let progress = MathProgress.createEmptyProgress();

progress = MathProgress.reduceProgress(progress, {
    a: 7,
    b: 8,
    correct: true,
    responseMs: 3200,
    mode: 2,
    method: 'coin'
}, start);

progress = MathProgress.reduceProgress(progress, {
    a: 7,
    b: 8,
    correct: false,
    responseMs: 4800,
    mode: 2,
    method: 'voice',
    answer: 54
}, new Date('2026-04-28T12:01:00.000Z'));

const fact = MathProgress.getFactStats(progress, 7, 8);
assert.equal(fact.total, 2);
assert.equal(fact.correct, 1);
assert.equal(fact.errors, 1);
assert.equal(fact.accuracy, 0.5);
assert.equal(fact.averageResponseMs, 4000);
assert.equal(fact.lastCorrectAt, '2026-04-28T12:00:00.000Z');
assert.equal(fact.lastErrorAt, '2026-04-28T12:01:00.000Z');
assert.equal(fact.correctStreak, 0);
assert.equal(fact.errorStreak, 1);
assert.deepEqual(fact.methods, { coin: 1, voice: 1 });
assert.deepEqual(fact.wrongAnswers, { 54: 1 });
assert.deepEqual(progress.totals, { attempts: 2, correct: 1, errors: 1 });

const storage = createMemoryStorage();
MathProgress.recordAttempt({
    a: 9,
    b: 9,
    correct: true,
    responseMs: 2500,
    mode: 3,
    method: 'satellite'
}, { storage, now: start });

const loaded = MathProgress.loadProgress({ storage });
assert.equal(MathProgress.getFactStats(loaded, 9, 9).methods.satellite, 1);

MathProgress.recordAttempt({
    a: 2,
    b: 2,
    correct: true,
    responseMs: 1000,
    mode: 1,
    method: 'coin'
}, { storage, profileId: 'hija', now: start });

MathProgress.recordAttempt({
    a: 2,
    b: 2,
    correct: false,
    responseMs: 500,
    mode: 1,
    method: 'coin',
    answer: 5,
    profileId: 'dev'
}, { storage, now: start });

assert.equal(MathProgress.getFactStats(MathProgress.loadProgress({ storage, profileId: 'hija' }), 2, 2).correct, 1);
assert.equal(MathProgress.getFactStats(MathProgress.loadProgress({ storage, profileId: 'hija' }), 2, 2).errors, 0);
assert.equal(MathProgress.getFactStats(MathProgress.loadProgress({ storage, profileId: 'dev' }), 2, 2).correct, 0);
assert.equal(MathProgress.getFactStats(MathProgress.loadProgress({ storage, profileId: 'dev' }), 2, 2).errors, 1);
assert.notEqual(
    MathProgress.getProgressStorageKey('hija'),
    MathProgress.getProgressStorageKey('dev'),
    'profiles should use isolated storage keys'
);

const profiles = MathProgress.loadProfiles({ storage });
assert.deepEqual(
    profiles.map(profile => `${profile.id}:${profile.name}`),
    ['hija:Isabella', 'dev:Desarrollador'],
    'default profiles should be available'
);
assert.equal(MathProgress.setActiveProfileId('dev', { storage }), 'dev');
assert.equal(MathProgress.getActiveProfileId({ storage }), 'dev');

const exported = MathProgress.exportProgressJson(loaded);
const importedStorage = createMemoryStorage();
const imported = MathProgress.importProgressJson(exported, { storage: importedStorage });
assert.deepEqual(imported, MathProgress.loadProgress({ storage: importedStorage }));

const invalid = MathProgress.reduceProgress(progress, { a: 0, b: 4, correct: true }, start);
assert.deepEqual(invalid, progress, 'invalid attempts should not mutate progress');

console.log('mathProgress tests passed');
