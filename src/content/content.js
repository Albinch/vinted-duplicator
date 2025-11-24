/**
 * Content script for Vinted item and create pages
 * Handles template extraction and form filling
 */

import { createMessageListener } from '../utils/messaging.js';
import { extractVintedItemData, validateExtractedData } from '../utils/vinted-extractor.js';
import { fillVintedForm } from '../utils/vinted-form-filler.js';

/**
 * Handle extractTemplateData action
 * Extracts data from current Vinted item page
 */
async function handleExtractTemplateData() {
  try {
    console.log('[Vinted Duplicator] Extracting template data...');

    const data = extractVintedItemData();

    if (!validateExtractedData(data)) {
      throw new Error('Extracted data is invalid or incomplete');
    }

    console.log('[Vinted Duplicator] Data extracted successfully:', data);
    return data;
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
 * Initialize content script
 */
function init() {
  console.log('[Vinted Duplicator] Content script loaded');

  // Set up message listener with handlers
  chrome.runtime.onMessage.addListener(
    createMessageListener({
      extractTemplateData: handleExtractTemplateData,
      fillTemplate: handleFillTemplate
    })
  );
}

// Initialize when script loads
init();
