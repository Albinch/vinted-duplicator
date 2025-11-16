function TemplateItem({ template, index, isClickable, onUse, onDelete }) {
    const formattedDate = new Date(template.createdAt).toLocaleDateString('fr-FR')
  
    return (
      <div 
        className={`template-item ${isClickable ? 'clickable' : ''}`}
        onClick={isClickable ? onUse : undefined}
      >
        <div className="template-content">
          {isClickable && <span className="arrow">▶️</span>}
          <div className="template-info">
            <div className="template-name">{template.name}</div>
            <div className="template-meta">
              Created {formattedDate}
            </div>
            {template.data.price && (
              <div className="template-price">{template.data.price}</div>
            )}
          </div>
        </div>
        <button 
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          🗑️
        </button>
      </div>
    )
  }
  
  export default TemplateItem