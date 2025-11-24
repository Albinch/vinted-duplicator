import { useState, useEffect } from 'react'
import EmptyState from './components/EmptyState'
import TemplateList from './components/TemplateList'
import SaveTemplateButton from './components/SaveTemplateButton'
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
      // Don't throw - this is not critical
      setIsOnVinted(false)
    }
  }

  /**
   * Handle saving current page as template
   */
  const handleSaveTemplate = async () => {
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

      // Success feedback (TODO: replace with toast)
      alert('✅ Template saved successfully!')
    } catch (error) {
      console.error('Error saving template:', error)
      // Error feedback (TODO: replace with toast)
      alert(`❌ Error saving template: ${error.message}`)
    }
  }

  /**
   * Handle using a template to fill the form
   */
  const handleUseTemplate = async (template) => {
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
        // TODO: Show toast with warning
      }

      // Close popup on success
      window.close()
    } catch (error) {
      console.error('Error applying template:', error)
      // Error feedback (TODO: replace with toast)
      alert(`❌ ${error.message}`)
    }
  }

  /**
   * Handle deleting a template
   */
  const handleDeleteTemplate = async (index) => {
    try {
      // Confirm deletion
      if (!confirm('Delete this template?')) {
        return
      }

      await deleteTemplateFromStorage(index)
      await loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      // Error feedback (TODO: replace with toast)
      alert(`❌ Error deleting template: ${error.message}`)
    }
  }

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">Loading...</div>
      </div>
    )
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="container">
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={initialize}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <h1>Vinted Duplicator</h1>
      </header>

      {templates.length === 0 ? (
        vintedContext !== "ITEM_PAGE" ? (
          <EmptyState />
        ) : (
          <p>Vinted listing detected! Click "Save Template" below to save it.</p>
        )
      ) : (
        <TemplateList
          templates={templates}
          vintedContext={vintedContext}
          onUseTemplate={handleUseTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      )}

      <SaveTemplateButton
        isOnVinted={isOnVinted}
        vintedContext={vintedContext}
        onClick={handleSaveTemplate}
      />

      <div className="footer">
        <a
          href="mailto:vintedduplicator@gmail.com?subject=Vinted Duplicator - Feedback"
          className="contact-link"
        >
          💬 Contact / Bug / Suggestion
        </a>
      </div>
    </div>
  )
}

export default App
