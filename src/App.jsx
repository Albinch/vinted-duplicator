import { useState, useEffect } from 'react'
import { Toaster, toast } from 'sonner'
import { Loader2, AlertCircle, Copy } from 'lucide-react'
import EmptyState from './components/EmptyState'
import TemplateList from './components/TemplateList'
import SaveTemplateButton from './components/SaveTemplateButton'
import { Button } from './components/ui/button'
import { getTemplates, deleteTemplate as deleteTemplateFromStorage, addTemplate } from './utils/storage'
import { getActiveTab, sendMessageToTab, getVintedContext } from './utils/messaging'
import './App.css'

function App() {
  const [templates, setTemplates] = useState([])
  const [isOnVinted, setIsOnVinted] = useState(false)
  const [vintedContext, setVintedContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    initialize()
  }, [])

  /**
   * Initialize app: load templates and check context
   */
  const initialize = async () => {
    try {
      setLoading(true)
      setError(null)

      await Promise.all([
        loadTemplates(),
        checkVintedContext()
      ])
    } catch (error) {
      console.error('Error initializing app:', error)
      setError('Failed to initialize extension')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load templates from storage
   */
  const loadTemplates = async () => {
    try {
      const loadedTemplates = await getTemplates()
      setTemplates(loadedTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
      throw new Error('Failed to load templates')
    }
  }

  /**
   * Check if we're on Vinted and determine page context
   */
  const checkVintedContext = async () => {
    try {
      const tab = await getActiveTab()
      const url = tab.url || ''

      if (url.includes('vinted.')) {
        setIsOnVinted(true)
        const context = getVintedContext(url)
        setVintedContext(context)
      } else {
        setIsOnVinted(false)
        setVintedContext(null)
      }
    } catch (error) {
      console.error('Error checking Vinted context:', error)
      setIsOnVinted(false)
    }
  }

  /**
   * Handle saving current page as template
   */
  const handleSaveTemplate = async () => {
    const toastId = toast.loading('Extracting template data...')

    try {
      const tab = await getActiveTab()

      // Send message to extract data
      const response = await sendMessageToTab(tab.id, {
        action: 'extractTemplateData'
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to extract template data')
      }

      // Save the template to storage
      await addTemplate(response.data)

      // Reload templates to update UI
      await loadTemplates()

      toast.success('Template saved successfully!', {
        id: toastId,
        duration: 3000,
      })
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error(error.message || 'Failed to save template', {
        id: toastId,
        duration: 4000,
      })
    }
  }

  /**
   * Handle using a template to fill the form
   */
  const handleUseTemplate = async (template) => {
    const toastId = toast.loading('Applying template...')

    try {
      const tab = await getActiveTab()

      // Verify we're on the create page
      if (!tab.url.includes('/items/new') && !tab.url.includes('/upload')) {
        throw new Error('Please navigate to the Vinted "Create listing" page first')
      }

      // Send message to fill form
      const response = await sendMessageToTab(tab.id, {
        action: 'fillTemplate',
        data: template.data
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to apply template')
      }

      // Show feedback if there were partial errors
      if (response.data?.errors && response.data.errors.length > 0) {
        console.warn('Template applied with some errors:', response.data.errors)
        toast.warning('Template applied with some fields skipped', {
          id: toastId,
          duration: 4000,
          description: `${response.data.filled.length} fields filled successfully`
        })
      } else {
        toast.success('Template applied successfully!', {
          id: toastId,
          duration: 2000,
        })
      }

      // Close popup on success
      setTimeout(() => {
        window.close()
      }, 500)
    } catch (error) {
      console.error('Error applying template:', error)
      toast.error(error.message, {
        id: toastId,
        duration: 4000,
      })
    }
  }

  /**
   * Handle deleting a template
   */
  const handleDeleteTemplate = async (index) => {
    try {
      await deleteTemplateFromStorage(index)
      await loadTemplates()
      toast.success('Template deleted', {
        duration: 2000,
      })
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template', {
        duration: 3000,
      })
    }
  }

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="container flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="container flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 py-20 px-6 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
          </div>
          <Button onClick={initialize} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      <div className="container flex flex-col p-4 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Vinted Duplicator</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {templates.length === 0 ? (
            vintedContext !== "ITEM_PAGE" ? (
              <EmptyState />
            ) : (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-muted-foreground">
                  Vinted listing detected! Click <strong>Save Template</strong> below to save it.
                </p>
              </div>
            )
          ) : (
            <TemplateList
              templates={templates}
              vintedContext={vintedContext}
              onUseTemplate={handleUseTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          )}
        </div>

        {/* Footer */}
        <div className="space-y-3 pt-3 border-t">
          <SaveTemplateButton
            isOnVinted={isOnVinted}
            vintedContext={vintedContext}
            onClick={handleSaveTemplate}
          />

          <div className="text-center">
            <a
              href="mailto:vintedduplicator@gmail.com?subject=Vinted Duplicator - Feedback"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact / Bug / Suggestion
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
