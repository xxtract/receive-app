const { formatToGTIN14 } = require('../utils/gtin');

describe('GTIN Utility Functions', () => {
    describe('formatToGTIN14', () => {
        it('should add leading zeros to shorter numbers', () => {
            expect(formatToGTIN14('12345678905')).toBe('00012345678905');
            expect(formatToGTIN14('123')).toBe('00000000000123');
        });

        it('should remove whitespace', () => {
            expect(formatToGTIN14(' 12345678905 ')).toBe('00012345678905');
            expect(formatToGTIN14('123 456')).toBe('00000123456000');
        });

        it('should not modify 14-digit numbers', () => {
            expect(formatToGTIN14('00012345678905')).toBe('00012345678905');
            expect(formatToGTIN14('40012345678902')).toBe('40012345678902');
        });

        it('should handle GTIN-128 format', () => {
            expect(formatToGTIN14('(01)00012345678905')).toBe('00012345678905');
            expect(formatToGTIN14('(01)40012345678902')).toBe('40012345678902');
        });

        it('should remove non-digit characters', () => {
            expect(formatToGTIN14('ABC12345678905')).toBe('00012345678905');
            expect(formatToGTIN14('123-456-789')).toBe('00000123456789');
        });
    });
});
