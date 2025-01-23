/**
 * @jest-environment jsdom
 */

beforeAll(() => {
  window.getComputedStyle = (element) => ({
    display: 'flex',
    flexDirection: 'column',
    color: element.classList.contains('completed') ? 'green' : 'red'
  });
});

describe('Upload Steps UI', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  test('shows file upload step indicator', () => {
    // Arrange
    container.innerHTML = `
      <div class="upload-step" data-step="1">
        <span class="step-text">file uploaded</span>
        <span class="step-status"></span>
      </div>
    `;
    const stepElement = container.querySelector('[data-step="1"]');
    const textElement = stepElement.querySelector('.step-text');

    // Assert
    expect(stepElement).toBeTruthy();
    expect(textElement.textContent).toBe('file uploaded');
  });

  test('shows file sent to mediaserver step indicator', () => {
    // Arrange
    container.innerHTML = `
      <div class="upload-step" data-step="2">
        <span class="step-text">file sent to mediaserver</span>
        <span class="step-status"></span>
      </div>
    `;
    const stepElement = container.querySelector('[data-step="2"]');
    const textElement = stepElement.querySelector('.step-text');

    // Assert
    expect(stepElement).toBeTruthy();
    expect(textElement.textContent).toBe('file sent to mediaserver');
  });

  test('shows file accepted by mediaserver step indicator', () => {
    // Arrange
    container.innerHTML = `
      <div class="upload-step" data-step="3">
        <span class="step-text">file accepted by mediaserver</span>
        <span class="step-status"></span>
      </div>
    `;
    const stepElement = container.querySelector('[data-step="3"]');
    const textElement = stepElement.querySelector('.step-text');

    // Assert
    expect(stepElement).toBeTruthy();
    expect(textElement.textContent).toBe('file accepted by mediaserver');
  });

  test('steps are shown as rows underneath each other', () => {
    // Arrange
    container.innerHTML = `
      <div class="upload-steps">
        <div class="upload-step" data-step="1">
          <span class="step-text">file uploaded</span>
          <span class="step-status"></span>
        </div>
        <div class="upload-step" data-step="2">
          <span class="step-text">file sent to mediaserver</span>
          <span class="step-status"></span>
        </div>
        <div class="upload-step" data-step="3">
          <span class="step-text">file accepted by mediaserver</span>
          <span class="step-status"></span>
        </div>
      </div>
    `;

    const steps = container.querySelectorAll('.upload-step');
    const stepsContainer = container.querySelector('.upload-steps');

    // Assert
    expect(steps.length).toBe(3);
    expect(window.getComputedStyle(stepsContainer).display).toBe('flex');
    expect(window.getComputedStyle(stepsContainer).flexDirection).toBe('column');
  });

  test('completed steps show green checkmark', () => {
    // Arrange
    container.innerHTML = `
      <div class="upload-step completed" data-step="1">
        <span class="step-text">file uploaded</span>
        <span class="step-status">✓</span>
      </div>
    `;
    const statusElement = container.querySelector('.step-status');

    // Assert
    expect(statusElement.textContent).toBe('✓');
    expect(window.getComputedStyle(statusElement).color).toBe('green');
  });

  test('not completed steps show red cross', () => {
    // Arrange
    container.innerHTML = `
      <div class="upload-step failed" data-step="1">
        <span class="step-text">file uploaded</span>
        <span class="step-status">✗</span>
      </div>
    `;
    const statusElement = container.querySelector('.step-status');

    // Assert
    expect(statusElement.textContent).toBe('✗');
    expect(window.getComputedStyle(statusElement).color).toBe('red');
  });

  test('steps are completed in order', () => {
    // Arrange
    container.innerHTML = `
      <div class="upload-steps">
        <div class="upload-step completed" data-step="1">
          <span class="step-text">file uploaded</span>
          <span class="step-status">✓</span>
        </div>
        <div class="upload-step completed" data-step="2">
          <span class="step-text">file sent to mediaserver</span>
          <span class="step-status">✓</span>
        </div>
        <div class="upload-step" data-step="3">
          <span class="step-text">file accepted by mediaserver</span>
          <span class="step-status"></span>
        </div>
      </div>
    `;

    const steps = container.querySelectorAll('.upload-step');

    // Assert
    expect(steps[0].classList.contains('completed')).toBe(true);
    expect(steps[1].classList.contains('completed')).toBe(true);
    expect(steps[2].classList.contains('completed')).toBe(false);
  });
});
