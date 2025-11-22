if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectRelistButton);
} else {
    setTimeout(() => {
        injectRelistButton();
    }, 1000);
}

function injectRelistButton() {
    const footers = document.querySelectorAll('[data-testid*="product-item-id-"][data-testid$="--footer"]');

    if (footers.length === 0) {
        console.warn("[Vinted Duplicator] No posts found...");
        return;
    }

    footers.forEach((footer) => {
        if (footer.querySelector('.vd-relist-btn')) {
            return;
        }

        const productId = extractProductId(footer);

        const button = createRelistButton(productId);
        footer.appendChild(button);
    });
}

function extractProductId(footer) {
    const testId = footer.getAttribute('data-testid');

    if (!testId) return null;

    const match = testId.match(/product-item-id-(\d+)--footer/);

    return match ? match[1] : null;
}

function createRelistButton(productId) {
    const button = document.createElement('button');
    button.className = 'web_ui__Button__button web_ui__Button__outlined web_ui__Button__small web_ui__Button__primary web_ui__Button__truncated';
    button.style = "margin-top: 10px;"
    button.dataset.productId = productId;
    button.innerHTML = `
      <span class="web_ui__Button__content">
        <span class="web_ui__Button__label">Relist</span>
      </span>
    `;

    button.onclick = (e) => { handleRelistClick(e, productId) }

    return button;
}

async function fetchProductData(productId) {
    const apiUrl = `https://www.vinted.fr/api/v2/item_upload/items/${productId}`;

    console.log(`[Vinted Duplicator] Fetching product data: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            credentials: 'include' // Important : inclut les cookies (auth)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        console.log('[Vinted Duplicator] Product data fetched:', data);

        return data;

    } catch (error) {
        console.error('[Vinted Duplicator] Error fetching product data:', error);
        throw error;
    }
}

// ========================================
// CLICK HANDLER
// ========================================

async function handleRelistClick(e, productId) {
    e.preventDefault();
    e.stopPropagation();

    const button = e.currentTarget;
    const originalContent = button.innerHTML;

    // Disable button + loading state
    button.disabled = true;
    button.innerHTML = '<span class="loading">⏳ Fetching...</span>';

    try {
        // Fetch product data via API
        const productData = await fetchProductData(productId);

        // Extract what you need
        const item = productData.item || productData;

        console.log('Item data:', item);

        // TODO: Save as template
        // await saveAsRelistTemplate(item);

        // TODO: Open create listing page
        // await openCreateListingPage();

        // Success feedback
        button.innerHTML = '<span class="success">✅ Success!</span>';

        // Reset after 2 sec
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = originalContent;
        }, 2000);

    } catch (error) {
        console.error('[Vinted Duplicator] Re-list error:', error);

        // Error feedback
        button.innerHTML = '<span class="error">❌ Error</span>';

        // Reset after 2 sec
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = originalContent;
        }, 2000);
    }
}