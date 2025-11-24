/**
 * Content script for injecting Relist buttons on Vinted product listings
 * Runs on all Vinted pages except /items/new
 */

import { queryAll } from '../utils/dom.js';
import { addTemplate } from '../utils/storage.js';

/**
 * Vinted API configuration
 */
const VINTED_API = {
  baseUrl: 'https://www.vinted.fr/api/v2',
  itemUpload: (itemId) => `${VINTED_API.baseUrl}/item_upload/items/${itemId}`
};

/**
 * Button styles matching Vinted's design system
 */
const BUTTON_CONFIG = {
  className: 'web_ui__Button__button web_ui__Button__outlined web_ui__Button__small web_ui__Button__primary web_ui__Button__truncated vd-relist-btn',
  style: 'margin-top: 10px;',
  label: 'Relist'
};

/**
 * Extract product ID from footer element's data-testid
 * @param {Element} footer
 * @returns {string|null}
 */
function extractProductId(footer) {
  try {
    const testId = footer.getAttribute('data-testid');
    if (!testId) {
      return null;
    }

    const match = testId.match(/product-item-id-(\d+)--footer/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('[Vinted Duplicator] Error extracting product ID:', error);
    return null;
  }
}

/**
 * Create a Relist button element
 * @param {string} productId
 * @returns {HTMLButtonElement}
 */
function createRelistButton(productId) {
  const button = document.createElement('button');
  button.className = BUTTON_CONFIG.className;
  button.style = BUTTON_CONFIG.style;
  button.dataset.productId = productId;
  button.innerHTML = `
    <span class="web_ui__Button__content">
      <span class="web_ui__Button__label">${BUTTON_CONFIG.label}</span>
    </span>
  `;

  button.onclick = (e) => handleRelistClick(e, productId);

  return button;
}

/**
 * Fetch product data from Vinted API
 * @param {string} productId
 * @returns {Promise<Object>}
 */
async function fetchProductData(productId) {
  const apiUrl = VINTED_API.itemUpload(productId);

  console.log(`[Vinted Duplicator] Fetching product data: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Vinted Duplicator] Product data fetched:', data);

    return data;
  } catch (error) {
    console.error('[Vinted Duplicator] Error fetching product data:', error);
    throw new Error(`Failed to fetch product data: ${error.message}`);
  }
}

/**
 * Transform Vinted API item data to template format
 * @param {Object} apiData - Data from Vinted API
 * @returns {Object} Template data
 */
function transformApiDataToTemplate(apiData) {
  const item = apiData.item || apiData;

  return {
    title: item.title || '',
    description: item.description || '',
    brand: item.brand?.title || '',
    size: item.size?.title || '',
    category: item.catalog?.title || '',
    condition: item.status?.title || '',
    colors: item.colors?.map(c => c.title).join(', ') || ''
  };
}

/**
 * Save product as template and open create listing page
 * @param {string} productId
 * @returns {Promise<void>}
 */
async function saveAndOpenCreatePage(productId) {
  // Fetch product data
  const productData = await fetchProductData(productId);

  // Transform to template format
  const templateData = transformApiDataToTemplate(productData);

  // Save as template
  const template = await addTemplate(templateData);
  console.log('[Vinted Duplicator] Template saved:', template);

  // Open create listing page in new tab
  const createUrl = `${window.location.origin}/items/new`;
  window.open(createUrl, '_blank');

  return template;
}

/**
 * Update button state
 * @param {HTMLButtonElement} button
 * @param {string} state - 'loading' | 'success' | 'error'
 * @param {string} message
 */
function updateButtonState(button, state, message) {
  const stateConfig = {
    loading: { emoji: '⏳', className: 'loading' },
    success: { emoji: '✅', className: 'success' },
    error: { emoji: '❌', className: 'error' }
  };

  const config = stateConfig[state];
  button.innerHTML = `<span class="${config.className}">${config.emoji} ${message}</span>`;

  if (state !== 'loading') {
    button.disabled = false;
  }
}

/**
 * Handle Relist button click
 * @param {Event} e
 * @param {string} productId
 */
async function handleRelistClick(e, productId) {
  e.preventDefault();
  e.stopPropagation();

  const button = e.currentTarget;
  const originalContent = button.innerHTML;

  // Set loading state
  button.disabled = true;
  updateButtonState(button, 'loading', 'Saving...');

  try {
    await saveAndOpenCreatePage(productId);

    // Success feedback
    updateButtonState(button, 'success', 'Saved!');

    // Reset after 2 seconds
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = originalContent;
    }, 2000);

  } catch (error) {
    console.error('[Vinted Duplicator] Relist error:', error);

    // Error feedback
    updateButtonState(button, 'error', 'Failed');

    // Reset after 2 seconds
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = originalContent;
    }, 2000);
  }
}

/**
 * Inject Relist buttons into product footers
 */
function injectRelistButtons() {
  const footers = queryAll('[data-testid*="product-item-id-"][data-testid$="--footer"]');

  if (footers.length === 0) {
    console.warn('[Vinted Duplicator] No product footers found');
    return;
  }

  let injectedCount = 0;

  footers.forEach((footer) => {
    // Skip if button already exists
    if (footer.querySelector('.vd-relist-btn')) {
      return;
    }

    const productId = extractProductId(footer);
    if (!productId) {
      console.warn('[Vinted Duplicator] Could not extract product ID from footer');
      return;
    }

    const button = createRelistButton(productId);
    footer.appendChild(button);
    injectedCount++;
  });

  if (injectedCount > 0) {
    console.log(`[Vinted Duplicator] Injected ${injectedCount} Relist buttons`);
  }
}

/**
 * Initialize the content script
 */
function init() {
  console.log('[Vinted Duplicator] Relist script loaded');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectRelistButtons);
  } else {
    // DOM already loaded, wait a bit for dynamic content
    setTimeout(injectRelistButtons, 1000);
  }

  // Re-inject on dynamic content changes (Vinted uses SPA)
  const observer = new MutationObserver(() => {
    injectRelistButtons();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize when script loads
init();
