function EmptyState() {
    return (
      <div className="empty-state">
        <div className="empty-icon">📦</div>
        <h2>No available template</h2>
        <p className="hint">
          To create your first template :
        </p>
        <ol className="steps">
          <li>Go to an existing Vinted Post</li>
          <li>Click on "Save as template"</li>
        </ol>
      </div>
    )
  }
  
  export default EmptyState