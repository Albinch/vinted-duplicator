/**
 * Fill Vinted create listing form with template data
 */

import { setInputValue, clickElement, waitForElement, delay, queryAll } from './dom.js';

/**
 * Form field selectors
 */
const FORM_SELECTORS = {
  title: '[name="title"]',
  description: 'textarea[name="description"]',
  category: 'input[name="category"]',
  categorySearch: 'input#catalog-search-input',
  categoryResult: '[id^="catalog-search-"][id$="-result"]',
  brand: 'input[name="brand"]',
  brandResult: '[id^="brand-"]',
  size: 'input[name="size"]',
  condition: 'input[name="condition"]',
  color: 'input[name="color"]'
};

/**
 * Fill basic text fields (title, description)
 * @param {Object} data - Template data
 */
export async function fillTextFields(data) {
  try {
    const titleInput = document.querySelector(FORM_SELECTORS.title);
    if (titleInput && data.title) {
      setInputValue(titleInput, data.title);
    }

    const descriptionInput = document.querySelector(FORM_SELECTORS.description);
    if (descriptionInput && data.description) {
      setInputValue(descriptionInput, data.description);
    }
  } catch (error) {
    console.error('Error filling text fields:', error);
    throw error;
  }
}

/**
 * Search and select from autocomplete dropdown
 * @param {string} inputSelector - Selector for the input field to click
 * @param {string} searchInputSelector - Selector for the search input
 * @param {string} resultSelector - Selector for results
 * @param {string} query - Search query
 * @param {number} searchDelay - Delay after typing (default: 1500ms)
 */
async function searchAndSelect(inputSelector, searchInputSelector, resultSelector, query, searchDelay = 1500) {
  if (!query) {
    throw new Error('Search query is required');
  }

  // Click to open dropdown
  const input = document.querySelector(inputSelector);
  if (!input) {
    throw new Error(`Input not found: ${inputSelector}`);
  }

  await clickElement(input);
  await delay(300);

  // Type in search field
  const searchInput = document.querySelector(searchInputSelector);
  if (!searchInput) {
    throw new Error(`Search input not found: ${searchInputSelector}`);
  }

  setInputValue(searchInput, query);

  // Wait for results
  await delay(searchDelay);

  // Select first result
  const result = document.querySelector(resultSelector);
  if (!result) {
    throw new Error(`No result found for query: ${query}`);
  }

  const title = result.querySelector('.web_ui__Cell__title')?.textContent;
  console.log(`✅ Found and selecting: ${title}`);

  await clickElement(result);
}

/**
 * Fill category field
 * @param {string} category - Category name
 */
export async function fillCategory(category) {
  if (!category) {
    console.warn('No category provided, skipping');
    return;
  }

  try {
    await searchAndSelect(
      FORM_SELECTORS.category,
      FORM_SELECTORS.categorySearch,
      FORM_SELECTORS.categoryResult,
      category
    );
    console.log('✅ Category filled successfully');
  } catch (error) {
    console.error('Error filling category:', error);
    throw new Error(`Failed to fill category: ${error.message}`);
  }
}

/**
 * Fill brand field
 * @param {string} brand - Brand name
 */
export async function fillBrand(brand) {
  if (!brand) {
    console.warn('No brand provided, skipping');
    return;
  }

  try {
    await searchAndSelect(
      FORM_SELECTORS.brand,
      FORM_SELECTORS.brand,
      FORM_SELECTORS.brandResult,
      brand
    );
    console.log('✅ Brand filled successfully');
  } catch (error) {
    console.error('Error filling brand:', error);
    throw new Error(`Failed to fill brand: ${error.message}`);
  }
}

/**
 * Select from dropdown menu by matching text
 * @param {string} inputSelector - Selector for input field
 * @param {string} value - Value to select
 */
async function selectFromDropdown(inputSelector, value) {
  if (!value) {
    return;
  }

  const input = document.querySelector(inputSelector);
  if (!input) {
    throw new Error(`Input not found: ${inputSelector}`);
  }

  await clickElement(input);
  await delay(500);

  const dropdown = input.nextElementSibling;
  if (!dropdown) {
    throw new Error('Dropdown menu not found');
  }

  const items = queryAll('ul > li', dropdown);
  const matchingItem = items.find(li => {
    const title = li.querySelector('.web_ui__Cell__title');
    return title?.textContent?.trim() === value;
  });

  if (!matchingItem) {
    throw new Error(`Dropdown item not found: ${value}`);
  }

  await clickElement(matchingItem.firstChild);
}

/**
 * Fill size field
 * @param {string} size - Size value
 */
export async function fillSize(size) {
  if (!size) {
    console.warn('No size provided, skipping');
    return;
  }

  try {
    await selectFromDropdown(FORM_SELECTORS.size, size);
    console.log('✅ Size filled successfully');
  } catch (error) {
    console.error('Error filling size:', error);
    throw new Error(`Failed to fill size: ${error.message}`);
  }
}

/**
 * Fill condition field
 * @param {string} condition - Condition value
 */
export async function fillCondition(condition) {
  if (!condition) {
    console.warn('No condition provided, skipping');
    return;
  }

  try {
    await selectFromDropdown(FORM_SELECTORS.condition, condition);
    console.log('✅ Condition filled successfully');
  } catch (error) {
    console.error('Error filling condition:', error);
    throw new Error(`Failed to fill condition: ${error.message}`);
  }
}

/**
 * Fill colors field (multi-select)
 * @param {string} colorsString - Comma-separated colors
 */
export async function fillColors(colorsString) {
  if (!colorsString) {
    console.warn('No colors provided, skipping');
    return;
  }

  try {
    const colorsArray = colorsString.replace(/\s+/g, '').split(',');

    const input = document.querySelector(FORM_SELECTORS.color);
    if (!input) {
      throw new Error('Color input not found');
    }

    await clickElement(input);
    await delay(500);

    const dropdown = input.nextElementSibling;
    if (!dropdown) {
      throw new Error('Color dropdown not found');
    }

    const colorElements = queryAll('div.web_ui__Cell__title', dropdown);

    for (const colorElement of colorElements) {
      const colorText = colorElement.textContent?.trim();
      if (colorsArray.includes(colorText)) {
        await clickElement(colorElement, 100);
      }
    }

    console.log('✅ Colors filled successfully');
  } catch (error) {
    console.error('Error filling colors:', error);
    throw new Error(`Failed to fill colors: ${error.message}`);
  }
}

/**
 * Fill entire Vinted form with template data
 * @param {Object} data - Template data
 * @returns {Promise<Object>} Result with success status and any errors
 */
export async function fillVintedForm(data) {
  const results = {
    success: true,
    filled: [],
    errors: []
  };

  try {
    // Fill text fields first (instant)
    await fillTextFields(data);
    results.filled.push('title', 'description');

    // Fill category
    try {
      await fillCategory(data.category);
      results.filled.push('category');
    } catch (error) {
      results.errors.push({ field: 'category', error: error.message });
    }

    // Wait before filling dependent fields
    await delay(3000);

    // Fill brand
    try {
      await fillBrand(data.brand);
      results.filled.push('brand');
    } catch (error) {
      results.errors.push({ field: 'brand', error: error.message });
    }

    // Fill remaining fields
    try {
      await fillSize(data.size);
      results.filled.push('size');
    } catch (error) {
      results.errors.push({ field: 'size', error: error.message });
    }

    try {
      await fillCondition(data.condition);
      results.filled.push('condition');
    } catch (error) {
      results.errors.push({ field: 'condition', error: error.message });
    }

    try {
      await fillColors(data.colors);
      results.filled.push('colors');
    } catch (error) {
      results.errors.push({ field: 'colors', error: error.message });
    }

    // If there were errors but some fields filled, partial success
    if (results.errors.length > 0) {
      results.success = results.filled.length > 2; // At least more than title/description
      console.warn('Form filling completed with errors:', results.errors);
    }

    return results;
  } catch (error) {
    console.error('Critical error filling form:', error);
    results.success = false;
    results.errors.push({ field: 'general', error: error.message });
    return results;
  }
}
