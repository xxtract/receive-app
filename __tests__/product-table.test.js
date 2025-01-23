import { ProductTable } from '../public/js/product/product-table.js';

describe('ProductTable', () => {
  let productTable;
  let mockConfig;
  let mockAudio;

  beforeEach(() => {
    // Mock the DOM elements
    document.body.innerHTML = `
      <div id="productTableContainer">
        <table id="productTable">
          <tbody id="productTableBody"></tbody>
        </table>
      </div>
      <div id="productCounter"></div>
    `;

    // Mock the Audio object
    mockAudio = {
      play: jest.fn().mockResolvedValue(undefined),
    };
    global.Audio = jest.fn(() => mockAudio);

    mockConfig = {
      productTableContainer: document.getElementById('productTableContainer'),
      productTableBody: document.getElementById('productTableBody'),
      onProductsChanged: jest.fn(),
      serviceChecker: { checkServices: jest.fn() },
    };

    productTable = new ProductTable(mockConfig);
  });

  test('displayUnrecognizedGtin adds a row with inactive service icons', () => {
    const testGtin = '12345678901234';
    productTable.displayUnrecognizedGtin(testGtin);

    const row = document.querySelector('tr.unrecognized-gtin');
    expect(row).not.toBeNull();
    expect(row.dataset.gtin).toBe(testGtin);

    const servicesCell = row.querySelector('.services-cell');
    expect(servicesCell).not.toBeNull();
    expect(servicesCell.dataset.activeService).toBe('[]');

    const serviceIcons = servicesCell.querySelectorAll('.service-icon');
    expect(serviceIcons.length).toBe(2);

    serviceIcons.forEach(icon => {
      expect(icon.classList.contains('active')).toBe(false);
    });

    // Check if the beep sound was played
    expect(global.Audio).toHaveBeenCalledWith(expect.stringContaining('beep.wav'));
    expect(mockAudio.play).toHaveBeenCalled();
  });
});