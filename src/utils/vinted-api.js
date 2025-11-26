/**
 * Vinted API utilities for creating listings
 * Can be used from both content scripts and background
 */

/**
 * Vinted API endpoints
 */
export const VINTED_API = {
  createItem: 'https://www.vinted.fr/api/v2/item_upload/items',
  uploadPhoto: 'https://www.vinted.fr/api/v2/photos',
};

/**
 * Generate a UUID v4
 * @returns {string}
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Extract CSRF token from script tags in the current page
 * @returns {string|null}
 */
export function getCsrfToken() {
  try {
    const scripts = document.querySelectorAll('script');

    for (const script of scripts) {
      const content = script.textContent || script.innerHTML;

      // Look for CSRF_TOKEN in the script content
      let match = content.match(/\\"CSRF_TOKEN\\":\\"([a-f0-9-]+)\\"/);

      // Fallback to non-escaped format
      if (!match) {
        match = content.match(/"CSRF_TOKEN":"([a-f0-9-]+)"/);
      }

      if (match) {
        console.log('[Vinted API] CSRF token found');
        return match[1];
      }
    }

    console.warn('[Vinted API] CSRF token not found');
    return null;
  } catch (error) {
    console.error('[Vinted API] Error extracting CSRF token:', error);
    return null;
  }
}

/**
 * Get anon_id from background script (accesses cookies)
 * @returns {Promise<string|null>}
 */
export async function getAnonId() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getAnonId'
    });

    if (!response.success) {
      console.warn('[Vinted API] Failed to get anon_id:', response.error);
      return null;
    }

    return response.data.anonId;
  } catch (error) {
    console.error('[Vinted API] Error getting anon ID:', error);
    return null;
  }
}

/**
 * Upload a single photo to Vinted
 * @param {Blob|File} photoBlob - Photo file or blob
 * @param {string} tempUuid - Temporary UUID for the upload session
 * @param {string} csrfToken - CSRF token
 * @param {string} anonId - Anonymous ID
 * @returns {Promise<{id: number, orientation: number}>}
 */
export async function uploadPhoto(photoBlob, tempUuid, csrfToken, anonId) {
  try {
    const formData = new FormData();
    formData.append('photo[type]', 'item');
    formData.append('photo[file]', photoBlob, 'photo.jpg');
    formData.append('photo[temp_uuid]', tempUuid);

    console.log(`[Vinted API] Uploading photo (${photoBlob.size} bytes)...`);

    const headers = {};
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
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
      console.error('[Vinted API] Photo upload error:', errorData);
      throw new Error(`Failed to upload photo: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Vinted API] Photo uploaded successfully:', data);

    if (!data.id) {
      throw new Error('Invalid photo upload response');
    }

    return {
      id: data.id,
      orientation: data.orientation || 0
    };
  } catch (error) {
    console.error('[Vinted API] Error uploading photo:', error);
    throw error;
  }
}

/**
 * Upload multiple photos
 * @param {Array<Blob|File>} photos - Array of photo files/blobs
 * @param {string} tempUuid - Temporary UUID for the upload session
 * @param {string} csrfToken - CSRF token
 * @param {string} anonId - Anonymous ID
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<Array<{id: number, orientation: number}>>}
 */
export async function uploadPhotos(photos, tempUuid, csrfToken, anonId, onProgress) {
  if (!photos || photos.length === 0) {
    throw new Error('At least one photo is required');
  }

  const uploadedPhotos = [];
  const total = photos.length;

  for (let i = 0; i < total; i++) {
    const photo = photos[i];
    console.log(`[Vinted API] Processing photo ${i + 1}/${total}`);

    try {
      const uploaded = await uploadPhoto(photo, tempUuid, csrfToken, anonId);
      uploadedPhotos.push(uploaded);

      if (onProgress) {
        onProgress(i + 1, total);
      }

      console.log(`[Vinted API] Photo ${i + 1}/${total} uploaded (ID: ${uploaded.id})`);
    } catch (error) {
      console.error(`[Vinted API] Failed to upload photo ${i + 1}:`, error);
      throw new Error(`Failed to upload photo ${i + 1}: ${error.message}`);
    }
  }

  console.log(`[Vinted API] All photos uploaded: ${uploadedPhotos.length}/${total}`);
  return uploadedPhotos;
}

/**
 * Build payload for creating a Vinted listing
 * @param {Object} formData - Form data from user (with all IDs from template)
 * @param {Array} uploadedPhotos - Uploaded photo objects
 * @returns {Object}
 */
export function buildCreateItemPayload(formData, uploadedPhotos) {
  const uuid = generateUUID();

  const payload = {
    item: {
      id: null,
      currency: formData.currency || 'EUR',
      temp_uuid: uuid,
      title: formData.title || '',
      description: formData.description || '',
      brand_id: formData.brand_id || null,
      brand: formData.brand || '',
      size_id: formData.size_id || null,
      catalog_id: formData.catalog_id || null,
      // Book-specific fields
      isbn: formData.isbn || null,
      author: formData.author || null,
      book_title: formData.book_title || null,
      model: null,
      // Video game-specific fields
      video_game_rating_id: formData.video_game_rating_id || null,
      is_unisex: formData.is_unisex || false,
      status_id: formData.status_id || 2,
      price: parseFloat(formData.price) || 10,
      package_size_id: formData.package_size_id || 1,
      shipment_prices: {
        domestic: null,
        international: null
      },
      color_ids: formData.color_ids || [],
      assigned_photos: uploadedPhotos,
      item_attributes: formData.item_attributes || [],
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

  return payload;
}

/**
 * Create a listing via Vinted API
 * @param {Object} payload - Create item payload
 * @param {string} csrfToken - CSRF token
 * @param {string} anonId - Anonymous ID
 * @returns {Promise<Object>}
 */
export async function createListing(payload, csrfToken, anonId) {
  console.log('[Vinted API] Creating listing...');

  try {
    const headers = {
      'Accept': 'text/plain, */*, application/json',
      'Content-Type': 'application/json',
      'x-enable-multiple-size-groups': 'true',
      'x-upload-form': 'true'
    };

    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
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
      console.error('[Vinted API] Create listing error:', errorData);
      throw new Error(`Failed to create listing: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Vinted API] Listing created successfully:', data);

    return data;
  } catch (error) {
    console.error('[Vinted API] Error creating listing:', error);
    throw error;
  }
}
