const { showAlert, highlightRow, copyToClipboard } = require('../test-helpers/test-utils');

describe('Test Utils', () => {
    it('should mock showAlert function', () => {
        const consoleSpy = jest.spyOn(console, 'log');
        showAlert('Test message', true);
        expect(consoleSpy).toHaveBeenCalledWith('Alert:', 'Test message', '(success)');
        consoleSpy.mockRestore();
    });

    it('should mock highlightRow function', () => {
        const consoleSpy = jest.spyOn(console, 'log');
        highlightRow('test-row', true);
        expect(consoleSpy).toHaveBeenCalledWith('Highlight row:', 'test-row', '(success)');
        consoleSpy.mockRestore();
    });

    it('should mock copyToClipboard function', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        await copyToClipboard('test text');
        expect(consoleSpy).toHaveBeenCalledWith('Copy to clipboard:', 'test text');
        consoleSpy.mockRestore();
    });
});
