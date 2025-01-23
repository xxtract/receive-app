import { CompanySearch } from './company-search.js';

describe('CompanySearch', () => {
  let companySearch;
  let mockSearchInput;
  let mockConfig;

  beforeEach(() => {
    mockSearchInput = document.createElement('input');
    mockConfig = {
      apiBaseUrl: 'http://test-api.com',
      searchInput: mockSearchInput,
      searchSpinner: document.createElement('div'),
      dropdown: document.createElement('div'),
      keyboardNavigation: { reset: jest.fn() },
      onCompanySelect: jest.fn(),
    };
    companySearch = new CompanySearch(mockConfig);
  });

  test('initial background color is set to light gray', () => {
    expect(mockSearchInput.style.backgroundColor).toBe('rgb(248, 249, 250)');
  });

  test('changeBackgroundColor sets background to white', () => {
    companySearch.changeBackgroundColor();
    expect(mockSearchInput.style.backgroundColor).toBe('white');
  });

  test('resetBackgroundColor sets background to light gray', () => {
    companySearch.resetBackgroundColor();
    expect(mockSearchInput.style.backgroundColor).toBe('rgb(248, 249, 250)');
  });

  test('focus event changes background color to white', () => {
    mockSearchInput.dispatchEvent(new Event('focus'));
    expect(mockSearchInput.style.backgroundColor).toBe('white');
  });

  test('blur event resets background color to light gray', () => {
    mockSearchInput.dispatchEvent(new Event('focus'));
    mockSearchInput.dispatchEvent(new Event('blur'));
    expect(mockSearchInput.style.backgroundColor).toBe('rgb(248, 249, 250)');
  });
});
