/**
 * Modulo puro para calcular los datos del modelo de area segun la estrategia.
 */
const AreaModelCalculator = {
    /**
     * Calcula los datos de visualizacion para una operacion.
     * 
     * @param {number} left - Factor izquierdo.
     * @param {number} right - Factor derecho.
     * @param {string} strategy - El ID de la estrategia (desde TableDiscriminator).
     * @returns {Object} Datos para Phaser.
     */
    calculate(left, right, strategy) {
        // Validaciones de rango para el tutor retro
        if (left > 10 || right > 10) {
            throw new Error('FUERA DE RANGO (MÁX 10x10)');
        }
        if (left <= 0 || right <= 0) {
            throw new Error('FACTORES DEBEN SER MAYORES A 0');
        }

        switch (strategy) {
            case 'group1-ten-shift':
                return this._calculateTen(left, right);
            case 'group1-five-skip':
                return this._calculateFive(left, right);
            case 'group1-double':
                return this._calculateDouble(left, right);
            case 'group2-nine-subtract':
                return this._calculateNine(left, right);
            case 'group3-area-decomposition':
                return this._calculateArea(left, right);
            default:
                throw new Error(`Estrategia no soportada: ${strategy}`);
        }
    },

    _calculateTen(left, right) {
        return {
            strategy: 'group1-ten-shift',
            rows: left,
            cols: right,
            answer: left * right,
            blocks: [
                { rows: left, columns: right, value: left * right, interaction: left === 10 ? 'horizontal' : 'vertical' }
            ],
            formula: `${left} x ${right} = ${left * right}`,
            targetFormula: `${left} x ${right} = ?`,
            hint: '¡Solo agregamos un cero!'
        };
    },

    _calculateFive(left, right) {
        const steps = left === 5 ? right : left;
        const sequence = [];
        for (let i = 1; i <= steps; i++) {
            sequence.push(i * 5);
        }
        return {
            strategy: 'group1-five-skip',
            rows: left,
            cols: right,
            steps: steps,
            sequence: sequence,
            answer: left * right,
            blocks: [
                { rows: left, columns: right, value: left * right, interaction: left === 5 ? 'vertical' : 'horizontal' }
            ],
            formula: `${left} x ${right} = ${left * right}`,
            targetFormula: `${left} x ${right} = ?`
        };
    },

    _calculateDouble(left, right) {
        return {
            strategy: 'group1-double',
            rows: left,
            cols: right,
            answer: left * right,
            blocks: [
                { rows: left, columns: right, value: left * right, interaction: left === 2 ? 'vertical' : 'horizontal' }
            ],
            formula: `${left} x ${right} = ${left * right}`,
            targetFormula: `${left} x ${right} = ?`,
            hint: `Doble de ${left === 2 ? right : left}`
        };
    },

    _calculateNine(left, right) {
        const factor = left === 9 ? right : left;
        const rows = 10;
        const cols = factor;
        return {
            strategy: 'group2-nine-subtract',
            rows: rows,
            cols: cols,
            base: { rows: rows, columns: cols, value: rows * cols },
            answer: 9 * factor,
            blocks: [
                { rows: rows, columns: cols, value: rows * cols, interaction: 'horizontal' }
            ],
            formula: `(10 x ${factor}) - (1 x ${factor}) = ${10 * factor} - ${factor} = ${9 * factor}`,
            targetFormula: `9 x ${factor} = (10 x ${factor}) - ${factor}`
        };
    },

    _calculateArea(left, right) {
        // Subgrupo 3.1: Ambos factores son pequeños (≤ 5)
        if (left <= 5 && right <= 5) {
            return {
                strategy: 'group3-area-decomposition',
                subgroup: '3.1',
                rows: left,
                cols: right,
                blocks: [
                    { rows: left, columns: right, value: left * right, interaction: 'horizontal' }
                ],
                answer: left * right,
                formula: `${left} x ${right} = ${left * right}`,
                targetFormula: `${left} x ${right} = ?`
            };
        }

        // Subgrupo 3.2: Al menos uno es mayor que 5
        let mainFactor = left;
        let splitFactor = right;
        let rotated = false;

        // Si el factor derecho es <= 5, intercambiamos (transpuesta)
        if (right <= 5 && left > 5) {
            mainFactor = right;
            splitFactor = left;
            rotated = true;
        }

        const part1 = 5;
        const part2 = splitFactor - 5;

        // Construir targetFormula sin redundancias
        let targetFormula = rotated 
            ? `${left} x ${right} = ${mainFactor} x ${splitFactor} = (${mainFactor} x ${part1}) + (${mainFactor} x ${part2})`
            : `${left} x ${right} = (${left} x ${part1}) + (${left} x ${part2})`;

        return {
            strategy: 'group3-area-decomposition',
            subgroup: '3.2',
            split: 'columns',
            rows: mainFactor,
            cols: splitFactor,
            blocks: [
                { rows: mainFactor, columns: part1, value: mainFactor * part1, interaction: 'horizontal' },
                { rows: mainFactor, columns: part2, value: mainFactor * part2, interaction: 'vertical' }
            ],
            answer: mainFactor * splitFactor,
            formula: `(${part1} x ${mainFactor}) + (${part2} x ${mainFactor}) = ${part1 * mainFactor} + ${part2 * mainFactor} = ${mainFactor * splitFactor}`,
            targetFormula: targetFormula
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AreaModelCalculator;
} else {
    window.AreaModelCalculator = AreaModelCalculator;
}
