console.log('Vinted Duplicator background loaded')

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed')
})

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadPhoto') {
    handlePhotoDownload(message.url)
      .then(sendResponse)
      .catch(error => {
        console.error('[Background] Error downloading photo:', error)
        sendResponse({
          success: false,
          error: error.message
        })
      })
    return true // Keep the message channel open for async response
  }

  if (message.action === 'getAnonId') {
    getAnonIdFromCookies(sender.tab.url)
      .then(sendResponse)
      .catch(error => {
        console.error('[Background] Error getting anon ID:', error)
        sendResponse({
          success: false,
          error: error.message
        })
      })
    return true // Keep the message channel open for async response
  }
})

/**
 * Download a photo from URL (bypasses CORS restrictions)
 * @param {string} url - Photo URL
 * @returns {Promise<Object>} Response with arrayBuffer and contentType
 */
async function handlePhotoDownload(url) {
  try {
    console.log(`[Background] Downloading photo: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to download photo: ${response.status}`)
    }

    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    console.log(`[Background] Photo downloaded: ${arrayBuffer.byteLength} bytes, type: ${contentType}`)

    return {
      success: true,
      data: {
        arrayBuffer: Array.from(new Uint8Array(arrayBuffer)),
        contentType: contentType,
        size: arrayBuffer.byteLength
      }
    }
  } catch (error) {
    console.error('[Background] Error downloading photo:', error)
    throw error
  }
}

/**
 * Get anon_id cookie from Chrome cookies API (domain-agnostic)
 * @param {string} url - Current page URL
 * @returns {Promise<Object>} Response with anon_id value
 */
async function getAnonIdFromCookies(url) {
  try {
    console.log(`[Background] Getting anon_id cookie for URL: ${url}`)

    const cookie = await chrome.cookies.get({
      url: url,
      name: 'anon_id'
    })

    if (!cookie) {
      console.warn('[Background] anon_id cookie not found')
      return {
        success: false,
        error: 'anon_id cookie not found'
      }
    }

    console.log('[Background] anon_id cookie found')
    return {
      success: true,
      data: {
        anonId: cookie.value
      }
    }
  } catch (error) {
    console.error('[Background] Error getting anon_id cookie:', error)
    throw error
  }
}