/**
 * Messaging utilities for Chrome extension communication
 */

/**
 * Send a message to a tab
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message object
 * @returns {Promise<any>}
 */
export function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Send a message to the background script
 * @param {Object} message - Message object
 * @returns {Promise<any>}
 */
export function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get the active tab
 * @returns {Promise<chrome.tabs.Tab>}
 */
export async function getActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab found');
    }
    return tab;
  } catch (error) {
    throw new Error(`Failed to get active tab: ${error.message}`);
  }
}

/**
 * Check if current tab is on Vinted
 * @param {chrome.tabs.Tab} tab - Tab object
 * @returns {boolean}
 */
export function isVintedTab(tab) {
  return tab?.url?.includes('vinted.') || false;
}

/**
 * Get Vinted page context from URL
 * @param {string} url
 * @returns {'ITEM_PAGE'|'CREATE_PAGE'|'OTHER_VINTED'|null}
 */
export function getVintedContext(url) {
  if (!url || !url.includes('vinted.')) {
    return null;
  }

  if (url.match(/\/items\/\d+/)) {
    return 'ITEM_PAGE';
  }

  if (url.includes('/items/new') || url.includes('/upload')) {
    return 'CREATE_PAGE';
  }

  return 'OTHER_VINTED';
}

/**
 * Message handler type definitions (for documentation)
 * @typedef {Object} MessageHandler
 * @property {string} action - Action name
 * @property {Function} handler - Handler function
 */

/**
 * Create a message listener with error handling
 * @param {Object.<string, Function>} handlers - Map of action names to handler functions
 * @returns {Function} Listener function
 */
export function createMessageListener(handlers) {
  return (request, sender, sendResponse) => {
    const handler = handlers[request.action];

    if (!handler) {
      console.warn(`No handler for action: ${request.action}`);
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
    }

    try {
      const result = handler(request, sender);

      // Handle async handlers
      if (result instanceof Promise) {
        result
          .then(data => sendResponse({ success: true, data }))
          .catch(error => {
            console.error(`Error in handler for ${request.action}:`, error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep channel open for async response
      }

      // Handle sync handlers
      sendResponse({ success: true, data: result });
      return false;
    } catch (error) {
      console.error(`Error in handler for ${request.action}:`, error);
      sendResponse({ success: false, error: error.message });
      return false;
    }
  };
}
