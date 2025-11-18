function simulateSearch(selector, searchInputSelector, searchResultSelector, query) {
    const input = document.querySelector(selector);
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
            const result = document.querySelector('[id^="catalog-search-"][id$="-result"]');
            
            if (result) {
              const title = result.querySelector('.web_ui__Cell__title')?.textContent;
              console.log('✅ Catégorie trouvée:', title);
              result.click();
              
              console.log('✅ Catégorie sélectionnée avec succès');
              resolve(true);
            } else {
              console.error('❌ Aucun résultat trouvé pour:', categoryName);
              resolve(false);
            }
          }, 1500);
    }, 300);
}