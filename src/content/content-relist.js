/**
 * Content script for injecting Relist buttons on Vinted product listings
 * Runs on all Vinted pages except /items/new
 */

import { queryAll } from '../utils/dom.js';

/**
 * Vinted API configuration
 */
const VINTED_API = {
  itemUpload: (itemId) => `https://www.vinted.fr/api/v2/item_upload/items/${itemId}`,
  createItem: `https://www.vinted.fr/api/v2/item_upload/items`
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
 * Generate a UUID v4
 * @returns {string}
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
 * Transform Vinted API item data to add_item payload format
 * @param {Object} apiData - Data from Vinted API
 * @returns {Object} Payload for creating item
 */
function transformToAddItemPayload(apiData) {
  const item = apiData.item || apiData;
  const uuid = generateUUID();

  // Extract color IDs
  const colorIds = [item.color1_id];

  // Extract photo IDs from photos array
  const assignedPhotos = item.photos?.map(photo => ({
    id: photo.id,
    orientation: photo.orientation || 0
  })) || [];

  // Extract price amount (price is an object with 'amount' field)
  const priceAmount = typeof item.price === 'object' ? item.price?.amount : (item.price || item.price_numeric || 10);

  // Build the payload matching the add_item API structure
  const payload = {
    item: {
      id: null,
      currency: item.currency || 'EUR',
      temp_uuid: uuid,
      title: item.title || '',
      description: item.description || '',
      brand_id: item.brand_id || item.brand?.id || null,
      brand: item.brand?.title || '',
      size_id: item.size_id || item.size?.id || null,
      catalog_id: item.catalog_id || item.catalog?.id || null,
      isbn: null,
      author: null,
      book_title: null,
      model: null,
      video_game_rating_id: null,
      is_unisex: item.is_unisex || false,
      status_id: item.status_id || item.status?.id || 2, // Default to "Good condition"
      price: priceAmount,
      package_size_id: item.package_size_id || 1, // Default to small package
      shipment_prices: {
        domestic: null,
        international: null
      },
      color_ids: colorIds,
      assigned_photos: assignedPhotos,
      item_attributes: item.item_attributes || [],
      manufacturer: null,
      manufacturer_labelling: null,
      measurement_length: null,
      measurement_width: null,
      measurement_unit: null
    },
    feedback_id: null,
    push_up: false,
    parcel: null,
    upload_session_id: uuid
  };

  console.log('[Vinted Duplicator] Transformed payload:', {
    photoCount: assignedPhotos.length,
    price: priceAmount,
    currency: item.currency
  });

  return payload;
}

/**
 * Create a new listing via Vinted API
 * @param {Object} payload - Add item payload
 * @returns {Promise<Object>}
 */
async function createListing(payload) {
  console.log('[Vinted Duplicator] Creating listing with payload:', payload);

  try {
    // Build headers
    const headers = {
      'Accept': 'text/plain, */*, application/json',
      'Content-Type': 'application/json',
    };

    headers['x-csrf-token'] = '75f6c9fa-dc8e-4e52-a000-e09dd4084b3e';
    headers['x-anon-id'] = '187c28ac-9c79-461d-b780-49b994c57d25'
    headers['x-enable-multiple-size-groups'] = 'true';
    headers['x-upload-form'] = 'true';

    const response = await fetch(VINTED_API.createItem, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('[Vinted Duplicator] API Error:', errorData);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Vinted Duplicator] Listing created:', data);

    return data;
  } catch (error) {
    console.error('[Vinted Duplicator] Error creating listing:', error);
    throw new Error(`Failed to create listing: ${error.message}`);
  }
}

/**
 * Relist a product by creating it via API and opening edit page for photos
 * @param {string} productId
 * @returns {Promise<void>}
 */
async function relistProduct(productId) {
  // Fetch product data
  const productData = await fetchProductData(productId);

  // Transform to add_item payload
  const payload = transformToAddItemPayload(productData);

  // Create the listing
  const result = await createListing(payload);

  // Open the newly created item's edit page to add photos
  // The API returns the created item with its ID
  if (result.item && result.item.id) {
    const editUrl = `${window.location.origin}/items/${result.item.id}/edit`;
    window.open(editUrl, '_blank');
    console.log('[Vinted Duplicator] Opened edit page for photos:', editUrl);
  } else {
    // Fallback: open general items page
    const itemsUrl = `${window.location.origin}/member/general/items`;
    window.open(itemsUrl, '_blank');
  }

  return result;
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
  updateButtonState(button, 'loading', 'Creating...');

  try {
    await relistProduct(productId);

    // Success feedback
    updateButtonState(button, 'success', 'Created!');

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
