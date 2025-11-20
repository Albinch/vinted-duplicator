chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractTemplateData') {
      const data = extractVintedData();
      sendResponse({ success: true, data })
    } else if (request.action === 'fillTemplate') {
      fillVintedForm(request.data)
      sendResponse({ success: true })
    }
    return true
})
  
function extractVintedData() {
  return {
    title: document.querySelector('div[data-testid="item-page-summary-plugin"] h1')?.textContent || "",
    description: document.querySelector('div[itemprop="description"]')?.firstChild?.textContent || '',
    brand: document.querySelector('span[itemprop="name"]')?.textContent || '',
    size: document.querySelector('div[itemprop="size"] > span')?.textContent || '',
    category: extractCategory() || '',
    condition: extractCondition(),
    colors: document.querySelector('div[itemprop="color"]')?.textContent
  }
}

function extractCondition() {
  return document.querySelector('[data-testid="item-page-summary-plugin"] > div:nth-child(2) > span:nth-child(1)')?.textContent
    || document.querySelector('[data-testid="item-page-summary-plugin"] > div:nth-child(2) > span:nth-child(3)')?.textContent
    || document.querySelector('[data-testid="item-page-summary-plugin"] > div:nth-child(2) > span:nth-child(5)')?.textContent
}

function extractCategory() {
  const nodes = document.querySelectorAll('#content > section > div.web_ui__Cell__cell.web_ui__Cell__tight.web_ui__Cell__transparent > div.web_ui__Cell__content > div > div > ul > li');
  const lastNode = nodes[nodes.length - 1];
  return lastNode.querySelector('span[itemprop="title"]').textContent?.split(" ").slice(1).join(" ");
}
  
function fillVintedForm(data) {
  const fields = {
    '[name="title"]': data.title,
    'textarea[name="description"]': data.description
  }

  Object.entries(fields).forEach(([selector, value]) => {
    const input = document.querySelector(selector)

    if (input && value) {
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })

  fillCategory(data);
}

function fillCategory(data) {
  // search category
  simulateSearch(
    'input[name="category"]',
    'input#catalog-search-input',
    '[id^="catalog-search-"][id$="-result"]',
    data.category
  );

  setTimeout(() => {
    // search brand
    simulateSearch(
      'input[name="brand"]',
      'input[name="brand"]',
      '[id^="brand-"]',
      data.brand
    );

    selectSize(data.size);
    selectCondition(data.condition);
    selectColors(data.colors);
  }, 3000);
}

function simulateSearch(selector, searchInputSelector, searchResultSelector, query) {
  const input = document.querySelector(selector);
  if (!input) {
    return;
  }
  input.click();

  setTimeout(() => {
      const searchInput = document.querySelector(searchInputSelector);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(searchInput, query);

      searchInput.dispatchEvent(new InputEvent('input', { 
          bubbles: true,
          data: query,
          inputType: 'insertText'
      }));

      setTimeout(() => {
          const result = document.querySelector(searchResultSelector);
        
          
          if (result) {
            const title = result.querySelector('.web_ui__Cell__title')?.textContent;
            console.log('✅ Catégorie trouvée:', title);
            result.click();
            
            console.log('✅ Catégorie sélectionnée avec succès');
          } else {
            console.error('❌ Aucun résultat trouvé pour:', query);
          }
        }, 1500);
  }, 300);
}

function selectSize(size) {
  const sizeElement = document
    .querySelector('input[name="size"]'); 

  if (sizeElement) {
    sizeElement.click();
  } else {
    return;
  }

  setTimeout(() => {
    const liElements = sizeElement
      .nextElementSibling
      .querySelectorAll('ul > li');

    liElements.forEach(li => {
      const titleElement = li.querySelector('.web_ui__Cell__title');
      if (titleElement && titleElement.textContent.trim() === size) {
        li.firstChild.click();
        return;
      }
    });
  }, 500);
}

function selectCondition(condition) {
  const conditionElement = document
  .querySelector('input[name="condition"]');

  if (conditionElement) {
    conditionElement.click();
  } else {
    return;
  }

  console.log("Condition element found");

  setTimeout(() => {
    const liElements = conditionElement
      .nextElementSibling
      .querySelectorAll('ul > li');

    liElements.forEach(li => {
      const titleElement = li.querySelector('.web_ui__Cell__title');
      console.log(titleElement, condition);
      if (titleElement && titleElement.textContent.trim() === condition) {
        li.firstChild.click();
        return;
      }
    });
  }, 500);
}

function selectColors(colors) {
  if (!colors) {
    return;
  }
  const colorsArray = colors.replace(/\s+/g, "").split(",");

  const colorsElement = document
    .querySelector('input[name="color"]'); 

  if (colorsElement) {
    colorsElement.click();
  } else {
    return;
  }

  setTimeout(() => {
    const vintedColorsElement = colorsElement
      .nextElementSibling
      .querySelectorAll('div.web_ui__Cell__title > div > p');

    vintedColorsElement.forEach(colorElement => {
      if (colorElement && colorsArray.includes(colorElement.textContent.trim())) {
        setTimeout(() => {
          colorElement.click();
        }, 100);
      }
    });
  }, 500);
}
