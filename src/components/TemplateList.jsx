import { FileText } from 'lucide-react'
import { Badge } from './ui/badge'
import TemplateItem from './TemplateItem'

function TemplateList({ templates, vintedContext, onUseTemplate, onDeleteTemplate }) {
  const isCreatePage = vintedContext === 'CREATE_PAGE'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            My Templates
          </h2>
          <Badge variant="secondary" className="ml-1">
            {templates.length}
          </Badge>
        </div>
        {isCreatePage && (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            Select one
          </Badge>
        )}
      </div>

      <div className="space-y-2">
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
