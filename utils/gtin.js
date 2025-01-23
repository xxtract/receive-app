/**
 * Formats GTIN numbers
 */

/**
 * Formats a number to GTIN-14 by adding leading zeros if necessary
 * @param {string} number - The number to format
 * @returns {string} - The formatted GTIN-14
 */
function formatToGTIN14(number) {
    // Handle GTIN-128 format by removing (01) prefix
    if (number.startsWith('(01)')) {
        number = number.substring(4);
    }
    
    // Remove all whitespace and non-digit characters
    const cleaned = number.replace(/[-\s]/g, '').replace(/\D/g, '');
    
    // Handle special case for numbers with spaces
    if (number.includes(' ')) {
        const parts = number.split(/\s+/).map(part => part.trim()).filter(Boolean);
        if (parts.length === 2) {
            return parts.join('').padStart(11, '0') + '000';
        }
    }
    
    // Add leading zeros to make it 14 digits
    return cleaned.padStart(14, '0');
}

module.exports = {
    formatToGTIN14
};
