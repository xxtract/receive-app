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
    jest.clearAllMocks();
  });

  test('should match product correctly', async () => {
    // Mock data
    const mockCategories = ['Food', 'Beverage'];
    const mockRecords = [
      { category: 'Food', codeDescription: 'Fruits', codeDefinition: 'Fresh apples and pears', code: '10000100' },
      { category: 'Food', codeDescription: 'Vegetables', codeDefinition: 'Fresh carrots and potatoes', code: '10000200' },
      { category: 'Beverage', codeDescription: 'Soft Drinks', codeDefinition: 'Carbonated cola drinks', code: '20000100' },
    ];

    // Set up mock implementations
    GPC.distinct.mockResolvedValue(mockCategories);
    GPC.find.mockResolvedValue(mockRecords);

    // Test cases
    const testCases = [
      { description: 'Fresh red apples', expectedCode: '10000100' },
      { description: 'Carbonated cola beverage', expectedCode: '20000100' },
      { description: 'Fresh green vegetables', expectedCode: '10000200' },
      { description: 'Electronic device', expectedCode: null },
    ];

    for (const { description, expectedCode } of testCases) {
      const result = await matchProduct(description);
      expect(result).toBe(expectedCode);
    }

    // Verify that the mocks were called correctly
    expect(GPC.distinct).toHaveBeenCalledWith('category');
    expect(GPC.find).toHaveBeenCalledWith({ category: { $in: expect.any(Array) } });
  });
});