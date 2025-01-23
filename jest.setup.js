// Set up DOM environment for tests
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  runScripts: 'dangerously'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Mock getComputedStyle
global.window.getComputedStyle = (element) => ({
  display: 'flex',
  flexDirection: 'column',
  color: element.classList.contains('completed') ? 'green' : 'red'
});
