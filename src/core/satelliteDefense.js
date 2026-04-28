(function (root) {
    const DEFAULT_DIFFICULT_FACTS = [
        { a: 8, b: 8 },
        { a: 7, b: 9 },
        { a: 9, b: 8 },
        { a: 6, b: 9 },
        { a: 7, b: 8 }
    ];

    function normalizeFact(fact) {
        if (!fact) return null;
        const a = Number(fact.a);
        const b = Number(fact.b);
        if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return null;
        return {
            a,
            b,
            errors: Number.isFinite(Number(fact.errors)) ? Number(fact.errors) : 0
        };
    }

    function getDifficultFacts(failedFacts, fallbackFacts = DEFAULT_DIFFICULT_FACTS) {
        const seen = {};
        const normalized = (failedFacts || [])
            .map(normalizeFact)
            .filter(Boolean)
            .sort((left, right) => right.errors - left.errors);

        const facts = normalized.length > 0 ? normalized : fallbackFacts.map(normalizeFact).filter(Boolean);
        return facts.filter(fact => {
            const key = `${fact.a}x${fact.b}`;
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
    }

    function chooseChallenge(failedFacts, fallbackFacts, index = 0) {
        const facts = getDifficultFacts(failedFacts, fallbackFacts);
        const fact = facts[index % facts.length] || DEFAULT_DIFFICULT_FACTS[0];
        return {
            a: fact.a,
            b: fact.b,
            result: fact.a * fact.b
        };
    }

    function generateAnswerOptions(result) {
        const offsets = [-10, 10, -9, 9, -8, 8, -7, 7, -5, 5, -2, 2, -1, 1];
        const answers = [result];

        for (const offset of offsets) {
            const candidate = result + offset;
            if (candidate > 0 && !answers.includes(candidate)) answers.push(candidate);
            if (answers.length === 3) break;
        }

        return answers.sort((left, right) => left - right);
    }

    const api = {
        DEFAULT_DIFFICULT_FACTS,
        getDifficultFacts,
        chooseChallenge,
        generateAnswerOptions
    };

    root.SatelliteDefense = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
