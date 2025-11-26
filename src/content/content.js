/**
 * Content script for Vinted item and create pages
 * Handles template extraction and form filling
 */

import { createMessageListener } from '../utils/messaging.js';
import { fillVintedForm } from '../utils/vinted-form-filler.js';
import { extractVintedItemData } from '../utils/vinted-extractor.js';
import {
  getCsrfToken,
  getAnonId,
  uploadPhotos,
  buildCreateItemPayload,
  createListing,
  generateUUID
} from '../utils/vinted-api.js';

/**
 * Handle extractTemplateData action
 * Extracts data from current Vinted item page via API (only works for your own items)
 */
async function handleExtractTemplateData() {
  try {
    console.log('[Vinted Duplicator] Extracting template data...');

    // Extract item ID from URL
    const url = window.location.href;
    const match = url.match(/\/items\/(\d+)/);

    if (!match) {
      throw new Error('Could not extract item ID from URL');
    }

    const itemId = match[1];
    console.log('[Vinted Duplicator] Item ID:', itemId);

    // Fetch complete item data from API (only works for your own items)
    const apiUrl = `https://www.vinted.fr/api/v2/item_upload/items/${itemId}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        throw new Error('This item is not in your wardrobe. You can only save templates from your own items.');
      }
      throw new Error(`API error: ${response.status}`);
    }

    const apiData = await response.json();
    const item = apiData.item || apiData;

    // Also scrape DOM for fields not available in API (size and category names)
    console.log('[Vinted Duplicator] Scraping DOM for size and category names...');
    const domData = extractVintedItemData();

    // Build colors string from color1 and color2
    const colorsArray = [];
    if (item.color1) colorsArray.push(item.color1);
    if (item.color2) colorsArray.push(item.color2);
    const colorsText = colorsArray.join(', ');

    // Collect color IDs
    const colorIds = [item.color1_id, item.color2_id].filter(Boolean);

    // Transform API data to template format with all IDs
    // Combine API data (IDs) with DOM data (text names for size/category)
    const templateData = {
      title: item.title || '',
      description: item.description || '',
      brand: item.brand_dto?.title || '',
      brand_id: item.brand_id || null,
      size: domData.size || '', // Get size name from DOM
      size_id: item.size_id || null,
      category: domData.category || '', // Get category name from DOM
      catalog_id: item.catalog_id || null,
      condition: item.status?.title || '',
      status_id: item.status_id || 2,
      status: item.status || '',
      colors: colorsText,
      color_ids: colorIds,
      price: typeof item.price === 'object' ? item.price?.amount : (item.price || item.price_numeric || ''),
      package_size_id: item.package_size_id || 1,
      currency: item.currency || 'EUR',
      is_unisex: item.is_unisex || false,
      item_attributes: item.item_attributes || []
    };

    console.log('[Vinted Duplicator] Template data extracted successfully:', templateData);
    return templateData;
  } catch (error) {
    console.error('[Vinted Duplicator] Extraction error:', error);
    throw new Error(`Failed to extract template data: ${error.message}`);
  }
}

/**
 * Handle fillTemplate action
 * Fills Vinted create form with template data
 */
async function handleFillTemplate(request) {
  try {
    console.log('[Vinted Duplicator] Filling form with template...');

    if (!request.data) {
      throw new Error('No template data provided');
    }

    const results = await fillVintedForm(request.data);

    if (!results.success) {
      throw new Error('Form filling failed');
    }

    if (results.errors.length > 0) {
      console.warn('[Vinted Duplicator] Form filled with some errors:', results.errors);
      return {
        ...results,
        message: 'Template applied with some fields skipped'
      };
    }

    console.log('[Vinted Duplicator] Form filled successfully');
    return {
      ...results,
      message: 'Template applied successfully'
    };
  } catch (error) {
    console.error('[Vinted Duplicator] Fill error:', error);
    throw new Error(`Failed to fill template: ${error.message}`);
  }
}

/**
 * Handle createListingFromTemplate action
 * Creates a new listing via Vinted API from template data
 * @param {Object} request - { formData, photos (as base64 or blobs) }
 */
async function handleCreateListingFromTemplate(request) {
  try {
    console.log('[Vinted Duplicator] Creating listing from template...');

    if (!request.formData) {
      throw new Error('No form data provided');
    }

    if (!request.photos || request.photos.length === 0) {
      throw new Error('At least one photo is required');
    }

    // Get credentials
    const csrfToken = getCsrfToken();
    const anonId = await getAnonId();

    if (!csrfToken) {
      throw new Error('Could not retrieve CSRF token. Please refresh the page.');
    }

    // Generate UUID for upload session
    const uuid = generateUUID();

    // Convert photos from base64 to Blobs if needed
    const photoBlobs = await Promise.all(
      request.photos.map(async (photo) => {
        if (photo instanceof Blob) {
          return photo;
        }
        // Assume it's a base64 string
        const response = await fetch(photo);
        return response.blob();
      })
    );

    // Upload photos with progress tracking
    console.log(`[Vinted Duplicator] Uploading ${photoBlobs.length} photos...`);
    const uploadedPhotos = await uploadPhotos(
      photoBlobs,
      uuid,
      csrfToken,
      anonId,
      (current, total) => {
        console.log(`[Vinted Duplicator] Upload progress: ${current}/${total}`);
      }
    );

    // Build payload
    const payload = buildCreateItemPayload(request.formData, uploadedPhotos);

    // Create listing
    const result = await createListing(payload, csrfToken, anonId);

    console.log('[Vinted Duplicator] Listing created successfully:', result);

    return {
      success: true,
      data: result,
      itemId: result.item?.id,
      itemUrl: result.item?.url
    };
  } catch (error) {
    console.error('[Vinted Duplicator] Create listing error:', error);
    throw new Error(`Failed to create listing: ${error.message}`);
  }
}

/**
 * Initialize content script
 */
function init() {
  console.log('[Vinted Duplicator] Content script loaded');

  // Set up message listener with handlers
  chrome.runtime.onMessage.addListener(
    createMessageListener({
      extractTemplateData: handleExtractTemplateData,
      fillTemplate: handleFillTemplate,
      createListingFromTemplate: handleCreateListingFromTemplate
    })
  );
}

// Initialize when script loads
init();
