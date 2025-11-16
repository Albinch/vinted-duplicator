import TemplateItem from './TemplateItem'

function TemplateList({ templates, vintedContext, onUseTemplate, onDeleteTemplate }) {
  const isCreatePage = vintedContext === 'CREATE_PAGE'

  return (
    <div className="templates-section">
      <h2>
        My templates ({templates.length})
        {isCreatePage && <span className="badge">Select one</span>}
      </h2>
      <div className="templates-list">
        {templates.map((template, index) => (
          <TemplateItem
            key={template.id}
            template={template}
            index={index}
            isClickable={isCreatePage}
            onUse={() => onUseTemplate(template)}
            onDelete={() => onDeleteTemplate(index)}
          />
        ))}
      </div>
    </div>
  )
}

export default TemplateList