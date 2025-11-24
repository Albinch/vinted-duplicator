console.log('Vinted Duplicator background loaded')

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed')
})

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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