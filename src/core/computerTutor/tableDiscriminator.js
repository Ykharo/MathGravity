/**
 * Modulo puro para discriminar la estrategia educativa segun los factores.
 */
const TableDiscriminator = {
    STRATEGIES: {
        TEN: 'group1-ten-shift',
        FIVE: 'group1-five-skip',
        DOUBLE: 'group1-double',
        NINE: 'group2-nine-subtract',
        AREA: 'group3-area-decomposition'
    },

    /**
     * Determina la mejor estrategia para una operacion.
     * 
     * @param {number} left - Factor izquierdo.
     * @param {number} right - Factor derecho.
     * @returns {string} El ID de la estrategia.
     */
    getStrategy(left, right) {
        if (left === 10 || right === 10) {
            return this.STRATEGIES.TEN;
        }
        if (left === 5 || right === 5) {
            return this.STRATEGIES.FIVE;
        }
        if (left === 2 || right === 2) {
            return this.STRATEGIES.DOUBLE;
        }
        if (left === 9 || right === 9) {
            return this.STRATEGIES.NINE;
        }
        
        return this.STRATEGIES.AREA;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableDiscriminator;
} else {
    window.TableDiscriminator = TableDiscriminator;
}
