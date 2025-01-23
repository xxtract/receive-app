import { ProductSearch } from './product-search.js';

describe('ProductSearch', () => {
  let productSearch;
  let mockGtinSearchInput;
  let mockConfig;
  let mockFetch;

  beforeEach(() => {
    mockGtinSearchInput = document.createElement('input');
    mockConfig = {
      apiBaseUrl: 'http://test-api.com',
      gtinSearchInput: mockGtinSearchInput,
      gtinSearchSpinner: document.createElement('div'),
      productTable: {
        isGtinInTable: jest.fn(),
        displayProducts: jest.fn(),
        displayUnrecognizedGtin: jest.fn()
      },
      serviceChecker: {
        checkServices: jest.fn()
      }
    };
    productSearch = new ProductSearch(mockConfig);
    
    // Mock fetch globally
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('changeBackgroundColor sets background to yellow', () => {
    productSearch.changeBackgroundColor();
    expect(mockGtinSearchInput.style.backgroundColor).toBe('yellow');
  });

  test('resetBackgroundColor sets background to white', () => {
    productSearch.resetBackgroundColor();
    expect(mockGtinSearchInput.style.backgroundColor).toBe('white');
  });

  test('focus event changes background color to yellow', () => {
    mockGtinSearchInput.dispatchEvent(new Event('focus'));
    expect(mockGtinSearchInput.style.backgroundColor).toBe('yellow');
  });

  test('blur event resets background color to white', () => {
    mockGtinSearchInput.dispatchEvent(new Event('focus'));
    mockGtinSearchInput.dispatchEvent(new Event('blur'));
    expect(mockGtinSearchInput.style.backgroundColor).toBe('white');
  });

  test('searchProduct handles multiple products in response', async () => {
    const mockProducts = [
      {
        hierarchyId: 1,
        tradeItemId: 101,
        productDescription: 'Test Product 1',
        hierarchyKey: 'KEY1',
        globalTradeItemNumber: '12345678901234',
        tradeItemUnitDescriptor: 'BASE_UNIT',
        productType: 'CE',
        quantityOfChildren: 1
      },
      {
        hierarchyId: 1,
        tradeItemId: 102,
        productDescription: 'Test Product 1 Case',
        hierarchyKey: 'KEY1',
        globalTradeItemNumber: '12345678901235',
        tradeItemUnitDescriptor: 'CASE',
        productType: 'HE',
        quantityOfChildren: 12
      }
    ];

    productSearch.setSelectedCompany({ gln: '1234567890123' });
    mockGtinSearchInput.value = '12345678901234';
    mockConfig.productTable.isGtinInTable.mockReturnValue(false);
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ found: true, products: mockProducts, source: 'tradeItem' })
    });

    const mockServicesMap = {
      '12345678901234': ['measure', 'packshot'],
      '12345678901235': ['measure']
    };
    mockConfig.serviceChecker.checkServices.mockResolvedValue(mockServicesMap);

    await productSearch.searchProduct();

    const expectedProductsWithServices = mockProducts.map(product => ({
      ...product,
      activeService: mockServicesMap[product.globalTradeItemNumber]
    }));

    expect(mockConfig.productTable.displayProducts).toHaveBeenCalledWith(expectedProductsWithServices, 'tradeItem');
    expect(mockConfig.serviceChecker.checkServices).toHaveBeenCalledWith(
      ['12345678901234', '12345678901235'],
      '1234567890123',
      1
    );
  });

  test('searchProduct handles product found in tblproducts', async () => {
    const mockProduct = {
      globalTradeItemNumber: '12345678901234',
      productDescription: 'Test Product',
      tradeItemUnitDescriptor: 'BASE_UNIT',
      productType: 'CE'
    };

    productSearch.setSelectedCompany({ gln: '1234567890123' });
    mockGtinSearchInput.value = '12345678901234';
    mockConfig.productTable.isGtinInTable.mockReturnValue(false);
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ found: true, products: [mockProduct], source: 'tblproducts' })
    });

    const mockServicesMap = {
      '12345678901234': ['measure', 'packshot']
    };
    mockConfig.serviceChecker.checkServices.mockResolvedValue(mockServicesMap);

    await productSearch.searchProduct();

    const expectedProductWithServices = {
      ...mockProduct,
      activeService: mockServicesMap[mockProduct.globalTradeItemNumber]
    };

    expect(mockConfig.productTable.displayProducts).toHaveBeenCalledWith([expectedProductWithServices], 'tblproducts');
    expect(mockConfig.serviceChecker.checkServices).toHaveBeenCalledWith(
      ['12345678901234'],
      '1234567890123',
      undefined
    );

    const mockTblProductsServicesMap = {
      '12345678901234': ['measure', 'packshot']
    };
    mockConfig.serviceChecker.checkServices.mockResolvedValue(mockTblProductsServicesMap);

    await productSearch.searchProduct();

    const expectedTblProductWithServices = {
      ...mockProduct,
      activeService: mockTblProductsServicesMap[mockProduct.globalTradeItemNumber]
    };

    expect(mockConfig.productTable.displayProducts).toHaveBeenCalledWith([expectedTblProductWithServices], 'tblproducts');
    expect(mockConfig.serviceChecker.checkServices).toHaveBeenCalledWith(
      ['12345678901234'],
      '1234567890123',
      undefined
    );
  });

  test('searchProduct handles no products found', async () => {
    productSearch.setSelectedCompany({ gln: '1234567890123' });
    mockGtinSearchInput.value = '12345678901234';
    mockConfig.productTable.isGtinInTable.mockReturnValue(false);
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ found: false, source: 'none' })
    });

    await productSearch.searchProduct();

    expect(mockConfig.productTable.displayUnrecognizedGtin).toHaveBeenCalledWith('12345678901234');
  });
});
