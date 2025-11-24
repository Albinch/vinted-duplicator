import { Save, CheckCircle2, FileText, ArrowRight } from 'lucide-react'
import { Button } from './ui/button'

function SaveTemplateButton({ isOnVinted, vintedContext, onClick }) {
  const getButtonState = () => {
    if (!isOnVinted) {
      return {
        text: 'Navigate to Vinted',
        disabled: true,
        icon: ArrowRight
      }
    }

    if (vintedContext === 'ITEM_PAGE') {
      return {
        text: 'Save Template',
        disabled: false,
        icon: Save
      }
    }

    if (vintedContext === 'CREATE_PAGE') {
      return {
        text: 'Select a template above',
        disabled: true,
        icon: CheckCircle2
      }
    }

    return {
      text: 'Open a listing to save',
      disabled: true,
      icon: FileText
    }
  }

  const { text, disabled, icon: Icon } = getButtonState()

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full"
      size="lg"
    >
      <Icon className="h-4 w-4" />
      {text}
    </Button>
  )
}

export default SaveTemplateButton
