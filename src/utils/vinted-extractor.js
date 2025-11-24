/**
 * Extract data from Vinted item pages
 */

import { getTextContent } from './dom.js';

/**
 * Vinted DOM selectors
 */
const SELECTORS = {
  title: 'div[data-testid="item-page-summary-plugin"] h1',
  description: 'div[itemprop="description"]',
  brand: 'span[itemprop="name"]',
  size: 'div[itemprop="size"] > span',
  condition: 'div[itemprop="status"] > span',
  colors: 'div[itemprop="color"]',
  breadcrumb: '#content > section > div.web_ui__Cell__cell.web_ui__Cell__tight.web_ui__Cell__transparent > div.web_ui__Cell__content > div > div > ul > li'
};

/**
 * Extract category from breadcrumb navigation
 * @returns {string|null}
 */
function extractCategory() {
  try {
    const breadcrumbNodes = document.querySelectorAll(SELECTORS.breadcrumb);
    if (breadcrumbNodes.length === 0) {
      return null;
    }

    const lastNode = breadcrumbNodes[breadcrumbNodes.length - 1];
    const categoryTitle = lastNode.querySelector('span[itemprop="title"]')?.textContent;

    if (!categoryTitle) {
      return null;
    }

    // Handle multi-word categories (remove first word if multiple)
    const words = categoryTitle.trim().split(' ');
    return words.length === 1 ? categoryTitle : words.slice(1).join(' ');
  } catch (error) {
    console.error('Error extracting category:', error);
    return null;
  }
}

/**
 * Extract description from Vinted item page
 * @returns {string|null}
 */
function extractDescription() {
  try {
    const descriptionElement = document.querySelector(SELECTORS.description);
    return descriptionElement?.firstChild?.textContent?.trim() || null;
  } catch (error) {
    console.error('Error extracting description:', error);
    return null;
  }
}

/**
 * Extract all data from a Vinted item page
 * @returns {Object} Extracted data
 */
export function extractVintedItemData() {
  try {
    const data = {
      title: getTextContent(SELECTORS.title),
      description: extractDescription(),
      brand: getTextContent(SELECTORS.brand),
      size: getTextContent(SELECTORS.size),
      category: extractCategory(),
      condition: getTextContent(SELECTORS.condition),
      colors: getTextContent(SELECTORS.colors)
    };

    // Log missing fields for debugging
    const missingFields = Object.entries(data)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.warn('Missing fields during extraction:', missingFields);
    }

    return data;
  } catch (error) {
    console.error('Error extracting Vinted data:', error);
    throw new Error(`Failed to extract data: ${error.message}`);
  }
}

/**
 * Validate extracted data
 * @param {Object} data - Extracted data
 * @returns {boolean}
 */
export function validateExtractedData(data) {
  if (!data) {
    return false;
  }

  // At minimum, we need a title
  if (!data.title || data.title.trim() === '') {
    console.error('Validation failed: missing title');
    return false;
  }

  return true;
}

/**
 * Check if current page is a Vinted item page
 * @returns {boolean}
 */
export function isVintedItemPage() {
  const url = window.location.href;
  return url.match(/\/items\/\d+/) !== null;
}

/**
 * Check if current page is Vinted create/upload page
 * @returns {boolean}
 */
export function isVintedCreatePage() {
  const url = window.location.href;
  return url.includes('/items/new') || url.includes('/upload');
}
