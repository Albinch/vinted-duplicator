/**
 * Chrome storage utilities with error handling
 */

/**
 * Get data from chrome.storage.local
 * @param {string|string[]} keys - Key(s) to retrieve
 * @returns {Promise<Object>}
 */
export async function getFromStorage(keys) {
  try {
    const result = await chrome.storage.local.get(keys);
    return result;
  } catch (error) {
    console.error('Error reading from storage:', error);
    throw new Error(`Failed to read from storage: ${error.message}`);
  }
}

/**
 * Save data to chrome.storage.local
 * @param {Object} data - Data to save
 * @returns {Promise<void>}
 */
export async function saveToStorage(data) {
  try {
    await chrome.storage.local.set(data);
  } catch (error) {
    console.error('Error saving to storage:', error);
    throw new Error(`Failed to save to storage: ${error.message}`);
  }
}

/**
 * Remove data from chrome.storage.local
 * @param {string|string[]} keys - Key(s) to remove
 * @returns {Promise<void>}
 */
export async function removeFromStorage(keys) {
  try {
    await chrome.storage.local.remove(keys);
  } catch (error) {
    console.error('Error removing from storage:', error);
    throw new Error(`Failed to remove from storage: ${error.message}`);
  }
}

/**
 * Clear all data from chrome.storage.local
 * @returns {Promise<void>}
 */
export async function clearStorage() {
  try {
    await chrome.storage.local.clear();
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw new Error(`Failed to clear storage: ${error.message}`);
  }
}

/**
 * Get all templates from storage
 * @returns {Promise<Array>}
 */
export async function getTemplates() {
  try {
    const result = await getFromStorage(['templates']);
    return result.templates || [];
  } catch (error) {
    console.error('Error loading templates:', error);
    return [];
  }
}

/**
 * Save templates to storage
 * @param {Array} templates - Array of template objects
 * @returns {Promise<void>}
 */
export async function saveTemplates(templates) {
  if (!Array.isArray(templates)) {
    throw new Error('Templates must be an array');
  }
  await saveToStorage({ templates });
}

/**
 * Add a new template
 * @param {Object} templateData - Template data from Vinted page
 * @returns {Promise<Object>} Created template
 */
export async function addTemplate(templateData) {
  const templates = await getTemplates();

  const newTemplate = {
    id: Date.now(),
    name: templateData.title || 'Unnamed template',
    data: templateData,
    createdAt: new Date().toISOString()
  };

  templates.push(newTemplate);
  await saveTemplates(templates);

  return newTemplate;
}

/**
 * Delete a template by index
 * @param {number} index - Index of template to delete
 * @returns {Promise<void>}
 */
export async function deleteTemplate(index) {
  const templates = await getTemplates();

  if (index < 0 || index >= templates.length) {
    throw new Error('Invalid template index');
  }

  templates.splice(index, 1);
  await saveTemplates(templates);
}

/**
 * Update a template by index
 * @param {number} index - Index of template to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateTemplate(index, updates) {
  const templates = await getTemplates();

  if (index < 0 || index >= templates.length) {
    throw new Error('Invalid template index');
  }

  templates[index] = { ...templates[index], ...updates };
  await saveTemplates(templates);
}
