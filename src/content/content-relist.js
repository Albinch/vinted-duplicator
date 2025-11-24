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
  createItem: `https://www.vinted.fr/api/v2/item_upload/items`,
  uploadPhoto: `https://www.vinted.fr/api/v2/photos`,
  deleteItem: (itemId) => `https://www.vinted.fr/api/v2/items/${itemId}/delete`
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
 * Extract CSRF token from script tags
 * @returns {string|null}
 */
function getCsrfToken() {
  try {
    // Find all script tags
    const scripts = document.querySelectorAll('script');

    for (const script of scripts) {
      const content = script.textContent || script.innerHTML;

      // Look for CSRF_TOKEN in the script content
      // Format: \"CSRF_TOKEN\":\"75f6c9fa-dc8e-4e52-a000-e09dd4084b3e\"
      let match = content.match(/\\"CSRF_TOKEN\\":\\"([a-f0-9-]+)\\"/);

      // Fallback to non-escaped format
      if (!match) {
        match = content.match(/"CSRF_TOKEN":"([a-f0-9-]+)"/);
      }

      if (match) {
        console.log('[Vinted Duplicator] CSRF token found:', match[1]);
        return match[1];
      }
    }

    console.warn('[Vinted Duplicator] CSRF token not found in scripts');
    return null;
  } catch (error) {
    console.error('[Vinted Duplicator] Error extracting CSRF token:', error);
    return null;
  }
}

/**
 * Extract anon_id from cookies via background script (domain-agnostic)
 * @returns {Promise<string|null>}
 */
async function getAnonId() {
  try {
    console.log('[Vinted Duplicator] Requesting anon_id from background script');

    const response = await chrome.runtime.sendMessage({
      action: 'getAnonId'
    });

    if (!response.success) {
      console.warn('[Vinted Duplicator] Failed to get anon_id:', response.error);
      return null;
    }

    console.log('[Vinted Duplicator] Anon ID retrieved');
    return response.data.anonId;
  } catch (error) {
    console.error('[Vinted Duplicator] Error getting anon ID:', error);
    return null;
  }
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
 * Download a photo from URL as Blob (via background script to bypass CORS)
 * @param {string} url - Photo URL
 * @returns {Promise<Blob>}
 */
async function downloadPhoto(url) {
  try {
    console.log(`[Vinted Duplicator] Requesting photo download from background: ${url}`);

    // Send message to background script to download the photo
    const response = await chrome.runtime.sendMessage({
      action: 'downloadPhoto',
      url: url
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to download photo');
    }

    // Convert the array buffer back to a Blob
    const uint8Array = new Uint8Array(response.data.arrayBuffer);
    const blob = new Blob([uint8Array], { type: response.data.contentType });

    console.log(`[Vinted Duplicator] Downloaded photo: ${blob.size} bytes`);
    return blob;
  } catch (error) {
    console.error('[Vinted Duplicator] Error downloading photo:', error);
    throw error;
  }
}

/**
 * Upload a photo to Vinted
 * @param {Blob} photoBlob - Photo binary data
 * @param {string} tempUuid - Temporary UUID for the upload session
 * @returns {Promise<number>} Uploaded photo ID
 */
async function uploadPhoto(photoBlob, tempUuid) {
  try {
    const formData = new FormData();
    formData.append('photo[type]', 'item');
    formData.append('photo[file]', photoBlob, 'photo.jpg');
    formData.append('photo[temp_uuid]', tempUuid);

    console.log(`[Vinted Duplicator] Uploading photo (${photoBlob.size} bytes)...`);

    const headers = {};

    // Add CSRF token if available
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    // Add anon ID if available
    const anonId = getAnonId();
    if (anonId) {
      headers['x-anon-id'] = anonId;
    }

    const response = await fetch(VINTED_API.uploadPhoto, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('[Vinted Duplicator] Photo upload error:', errorData);
      throw new Error(`Failed to upload photo: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Vinted Duplicator] Photo uploaded successfully:', data);

    if (!data.id) {
      throw new Error('Invalid photo upload response');
    }

    return data.id;
  } catch (error) {
    console.error('[Vinted Duplicator] Error uploading photo:', error);
    throw error;
  }
}

/**
 * Upload all photos from original item
 * @param {Array} photos - Array of photo objects from original item
 * @param {string} tempUuid - Temporary UUID for the upload session
 * @returns {Promise<Array>} Array of uploaded photo objects {id, orientation}
 */
async function uploadPhotos(photos, tempUuid) {
  if (!photos || photos.length === 0) {
    console.warn('[Vinted Duplicator] No photos to upload');
    return [];
  }

  const uploadedPhotos = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    console.log(`[Vinted Duplicator] Processing photo ${i + 1}/${photos.length}`);

    try {
      // Download the photo
      const photoBlob = await downloadPhoto(photo.url);

      // Upload to Vinted
      const uploadedPhotoId = await uploadPhoto(photoBlob, tempUuid);

      // Add to results
      uploadedPhotos.push({
        id: uploadedPhotoId,
        orientation: photo.orientation || 0
      });

      console.log(`[Vinted Duplicator] Photo ${i + 1}/${photos.length} uploaded successfully (ID: ${uploadedPhotoId})`);
    } catch (error) {
      console.error(`[Vinted Duplicator] Failed to upload photo ${i + 1}:`, error);
      // Continue with other photos even if one fails
    }
  }

  console.log(`[Vinted Duplicator] Total photos uploaded: ${uploadedPhotos.length}/${photos.length}`);
  return uploadedPhotos;
}

/**
 * Transform Vinted API item data to add_item payload format
 * @param {Object} apiData - Data from Vinted API
 * @param {Array} uploadedPhotos - Array of uploaded photo objects
 * @returns {Object} Payload for creating item
 */
function transformToAddItemPayload(apiData, uploadedPhotos = []) {
  const item = apiData.item || apiData;
  const uuid = generateUUID();

  // Extract color IDs
  const colorIds = [item.color1_id];

  // Use uploaded photos (passed as parameter after upload)
  const assignedPhotos = uploadedPhotos;

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
      'x-enable-multiple-size-groups': 'true',
      'x-upload-form': 'true'
    };

    // Add CSRF token if available
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    // Add anon ID if available
    const anonId = getAnonId();
    if (anonId) {
      headers['x-anon-id'] = anonId;
    }

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
 * Delete an item via Vinted API
 * @param {string} productId - ID of the item to delete
 * @returns {Promise<Object>}
 */
async function deleteItem(productId) {
  console.log(`[Vinted Duplicator] Deleting item ${productId}...`);

  try {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Add CSRF token if available
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    // Add anon ID if available
    const anonId = getAnonId();
    if (anonId) {
      headers['x-anon-id'] = anonId;
    }

    const response = await fetch(VINTED_API.deleteItem(productId), {
      method: 'POST',
      headers: headers,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('[Vinted Duplicator] Delete API Error:', errorData);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Vinted Duplicator] Item deleted successfully:', data);

    return data;
  } catch (error) {
    console.error('[Vinted Duplicator] Error deleting item:', error);
    throw new Error(`Failed to delete item: ${error.message}`);
  }
}

/**
 * Relist a product by uploading photos and creating via API
 * @param {string} productId
 * @returns {Promise<void>}
 */
async function relistProduct(productId) {
  // Fetch product data
  const productData = await fetchProductData(productId);

  // Generate UUID for upload session
  const uuid = generateUUID();

  // Upload photos first
  const item = productData.item || productData;
  console.log(`[Vinted Duplicator] Uploading ${item.photos?.length || 0} photos...`);
  const uploadedPhotos = await uploadPhotos(item.photos || [], uuid);

  if (uploadedPhotos.length === 0) {
    throw new Error('No photos could be uploaded. At least one photo is required.');
  }

  // Transform to add_item payload with uploaded photo IDs
  const payload = transformToAddItemPayload(productData, uploadedPhotos);

  // Delete the old item after successful creation
  try {
    await deleteItem(productId);
    console.log('[Vinted Duplicator] Old item deleted successfully');
  } catch (error) {
    throw new Error('[Vinted Duplicator] Failed to delete old item');
  }

  // Create the listing
  const result = await createListing(payload);

  console.log('[Vinted Duplicator] New listing created successfully');

  // Hard reload the page to refresh the wardrobe
  window.location.reload();

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
