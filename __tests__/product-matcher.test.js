import { matchProduct } from '../server/product-matcher.js';
import { GPC } from '../mongodb.js';

// Mock the GPC model
jest.mock('../mongodb.js', () => ({
  GPC: {
    distinct: jest.fn(),
    find: jest.fn(),
  },
}));

describe('Product Matcher', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('matchProduct should return the correct GPC code for a given product description', async () => {
    // Mock data
    const mockCategories = ['Food', 'Beverage'];
    const mockCodeDescriptions = ['Fruits', 'Vegetables'];
    const mockMatchedRecords = [
      { category: 'Food', codeDescription: 'Fruits', codeDefinition: 'Fresh apples', code: '10000100' },
      { category: 'Food', codeDescription: 'Fruits', codeDefinition: 'Fresh oranges', code: '10000200' },
    ];

    // Set up mock implementations
    GPC.distinct.mockResolvedValueOnce(mockCategories);
    GPC.find.mockReturnValueOnce({
      distinct: jest.fn().mockResolvedValueOnce(mockCodeDescriptions),
    });
    GPC.find.mockResolvedValueOnce(mockMatchedRecords);

    // Test the matchProduct function
    const result = await matchProduct('Fresh red apples');

    // Assertions
    expect(result).toBe('10000100');
    expect(GPC.distinct).toHaveBeenCalledWith('category');
    expect(GPC.find).toHaveBeenCalledWith({ category: { $in: ['Food'] } });
    expect(GPC.find).toHaveBeenCalledWith({
      category: { $in: ['Food'] },
      codeDescription: { $in: ['Fruits'] },
    });
  });

  test('matchProduct should return null if no matching GPC code is found', async () => {
    // Mock data
    const mockCategories = ['Electronics'];
    const mockCodeDescriptions = ['Computers'];
    const mockMatchedRecords = [];

    // Set up mock implementations
    GPC.distinct.mockResolvedValueOnce(mockCategories);
    GPC.find.mockReturnValueOnce({
      distinct: jest.fn().mockResolvedValueOnce(mockCodeDescriptions),
    });
    GPC.find.mockResolvedValueOnce(mockMatchedRecords);

    // Test the matchProduct function
    const result = await matchProduct('Fresh red apples');

    // Assertions
    expect(result).toBeNull();
    expect(GPC.distinct).toHaveBeenCalledWith('category');
    expect(GPC.find).toHaveBeenCalledWith({ category: { $in: [] } });
    expect(GPC.find).toHaveBeenCalledWith({
      category: { $in: [] },
      codeDescription: { $in: [] },
    });
  });
});