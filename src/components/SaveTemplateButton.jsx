function SaveTemplateButton({ isOnVinted, vintedContext, onClick }) {
    const getButtonState = () => {
      if (!isOnVinted) {
        return { text: 'Go to Vinted', disabled: true }
      }
      
      if (vintedContext === 'ITEM_PAGE') {
        return { text: '💾 Save as a template', disabled: false }
      }
      
      if (vintedContext === 'CREATE_PAGE') {
        return { text: 'Select a template', disabled: true }
      }
      
      return { text: 'Select a post to save', disabled: true }
    }
  
    const { text, disabled } = getButtonState()
  
    return (
      <button 
        className="primary-btn"
        onClick={onClick}
        disabled={disabled}
      >
        {text}
      </button>
    )
  }
  
  export default SaveTemplateButton