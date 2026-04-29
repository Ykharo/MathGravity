/**
 * Modulo puro para parsear operaciones de multiplicacion desde texto.
 */
const MultiplicationParser = {
    /**
     * Parsea una cadena de texto y devuelve los factores de la multiplicacion.
     * Soporta formatos: "8x7", "8 x 7", "8*7", "8 × 7".
     * 
     * @param {string} input - La cadena a parsear.
     * @returns {Object} { left: number, right: number }
     * @throws {Error} Si el formato es invalido o no es una multiplicacion valida.
     */
    parse(input) {
        if (!input || typeof input !== 'string') {
            throw new Error('Input invalido: se requiere una cadena de texto.');
        }

        // Limpiar espacios y normalizar simbolos de multiplicacion
        const normalized = input.trim()
            .replace(/×/g, 'x')
            .replace(/\*/g, 'x');

        // Limpiar espacios y normalizar
        const cleanStr = normalized.replace(/\s+/g, '').toUpperCase();
        
        // Regex mas flexible: Numero (1-2 digitos) X Numero (1-2 digitos)
        const match = cleanStr.match(/^(\d{1,2})X(\d{1,2})$/);
        
        if (!match) {
            throw new Error(`FORMATO INVÁLIDO: "${input}". USE "AXB"`);
        }
        
        return {
            left: parseInt(match[1], 10),
            right: parseInt(match[2], 10)
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplicationParser;
} else {
    window.MultiplicationParser = MultiplicationParser;
}
