/**
 * DOM utility functions for interacting with Vinted pages
 */

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector
 * @param {number} timeout - Max wait time in ms (default: 5000)
 * @returns {Promise<Element>}
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      return resolve(element);
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Safely query an element and return its text content
 * @param {string} selector - CSS selector
 * @param {Element} parent - Parent element (default: document)
 * @returns {string|null}
 */
export function getTextContent(selector, parent = document) {
  try {
    const element = parent.querySelector(selector);
    return element?.textContent?.trim() || null;
  } catch (error) {
    console.error(`Error getting text content for ${selector}:`, error);
    return null;
  }
}

/**
 * Set input value and trigger React change events
 * @param {HTMLInputElement|HTMLTextAreaElement} input
 * @param {string} value
 */
export function setInputValue(input, value) {
  if (!input || value === undefined) {
    return;
  }

  try {
    // Use React's property setter to trigger onChange
    const setter = Object.getOwnPropertyDescriptor(
      input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    ).set;

    setter.call(input, value);

    // Dispatch events to trigger React handlers
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (error) {
    console.error('Error setting input value:', error);
    throw error;
  }
}

/**
 * Click an element with optional delay
 * @param {Element} element
 * @param {number} delay - Delay before click in ms (default: 0)
 * @returns {Promise<void>}
 */
export function clickElement(element, delay = 0) {
  return new Promise((resolve, reject) => {
    if (!element) {
      return reject(new Error('Element is null or undefined'));
    }

    setTimeout(() => {
      try {
        element.click();
        resolve();
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}

/**
 * Wait for a specific amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Query all elements and return as array
 * @param {string} selector
 * @param {Element} parent
 * @returns {Element[]}
 */
export function queryAll(selector, parent = document) {
  try {
    return Array.from(parent.querySelectorAll(selector));
  } catch (error) {
    console.error(`Error querying all for ${selector}:`, error);
    return [];
  }
}
