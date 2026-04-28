(function (root) {
    const UNITS = {
        cero: 0,
        un: 1,
        uno: 1,
        una: 1,
        dos: 2,
        tres: 3,
        cuatro: 4,
        cinco: 5,
        seis: 6,
        siete: 7,
        ocho: 8,
        nueve: 9
    };

    const SPECIALS = {
        diez: 10,
        once: 11,
        doce: 12,
        trece: 13,
        catorce: 14,
        quince: 15,
        dieciseis: 16,
        diecisiete: 17,
        dieciocho: 18,
        diecinueve: 19,
        veinte: 20,
        veintiuno: 21,
        veintidos: 22,
        veintitres: 23,
        veinticuatro: 24,
        veinticinco: 25,
        veintiseis: 26,
        veintisiete: 27,
        veintiocho: 28,
        veintinueve: 29
    };

    const TENS = {
        treinta: 30,
        cuarenta: 40,
        cincuenta: 50,
        sesenta: 60,
        setenta: 70,
        ochenta: 80,
        noventa: 90,
        cien: 100
    };

    function normalizeText(text) {
        return (text || "")
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function parseSpanishNumber(text) {
        const clean = normalizeText(text);
        const digitMatch = clean.match(/\b\d{1,3}\b/g);
        if (digitMatch && digitMatch.length > 0) {
            return parseInt(digitMatch[digitMatch.length - 1], 10);
        }

        const words = clean
            .split(" ")
            .filter(word => ![
                "es", "son", "igual", "igual", "a", "por", "multiplicado",
                "multiplicar", "cuanto", "cuantos", "respuesta", "la", "el"
            ].includes(word));

        const candidates = [];
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (SPECIALS[word] !== undefined) candidates.push(SPECIALS[word]);
            if (TENS[word] !== undefined) {
                if (words[i + 1] === "y" && UNITS[words[i + 2]] !== undefined) {
                    candidates.push(TENS[word] + UNITS[words[i + 2]]);
                    i += 2;
                    continue;
                }
                candidates.push(TENS[word]);
            }
            if (UNITS[word] !== undefined) candidates.push(UNITS[word]);
        }

        return candidates.length > 0 ? candidates[candidates.length - 1] : null;
    }

    function isSpokenAnswerCorrect(spokenText, expectedNumber) {
        return parseSpanishNumber(spokenText) === expectedNumber;
    }

    const api = {
        normalizeText,
        parseSpanishNumber,
        isSpokenAnswerCorrect
    };

    root.MathSpeech = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
