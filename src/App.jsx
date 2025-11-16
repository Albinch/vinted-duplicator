import { useState, useEffect } from 'react'
import EmptyState from './components/EmptyState'
import TemplateList from './components/TemplateList'
import SaveTemplateButton from './components/SaveTemplateButton'
import './App.css'

function App() {
  const [templates, setTemplates] = useState([])
  const [isOnVinted, setIsOnVinted] = useState(false)
  const [vintedContext, setVintedContext] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
    checkVintedContext()
  }, [])

  const loadTemplates = async () => {
    try {
      const result = await chrome.storage.local.get(['templates'])
      setTemplates(result.templates || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkVintedContext = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const url = tab.url || ''
      
      if (url.includes('vinted.')) {
        setIsOnVinted(true)
        
        if (url.match(/\/items\/\d+/)) {
          setVintedContext('ITEM_PAGE')
        } else if (url.includes('/items/new') || url.includes('/upload')) {
          setVintedContext('CREATE_PAGE')
        } else {
          setVintedContext('OTHER_VINTED')
        }
      }
    } catch (error) {
      console.error('Error checking context:', error)
    }
  }

  const handleSaveTemplate = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    chrome.tabs.sendMessage(
      tab.id, 
      { action: 'extractTemplateData' }, 
      async (response) => {
        if (response?.success) {
          const newTemplate = {
            id: Date.now(),
            name: response.data.title || 'Unnamed template',
            data: response.data,
            createdAt: new Date().toISOString()
          }
          
          const updatedTemplates = [...templates, newTemplate]
          await chrome.storage.local.set({ templates: updatedTemplates })
          setTemplates(updatedTemplates)
          alert('✅ Template saved !')
        } else {
          alert('❌ Erreur lors de l\'extraction des données')
        }
      }
    )
  }

  const handleUseTemplate = async (template) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    if (!tab.url.includes('/items/new') && !tab.url.includes('/upload')) {
      alert('⚠️ Allez sur la page "Créer une annonce" Vinted d\'abord')
      return
    }

    chrome.tabs.sendMessage(
      tab.id,
      { action: 'fillTemplate', data: template.data },
      (response) => {
        if (response?.success) {
          window.close()
        } else {
          alert('❌ Error on applying template')
        }
      }
    )
  }

  const handleDeleteTemplate = async (index) => {
    if (confirm('Delete this template ?')) {
      const updatedTemplates = templates.filter((_, i) => i !== index)
      await chrome.storage.local.set({ templates: updatedTemplates })
      setTemplates(updatedTemplates)
    }
  }

  if (loading) {
    return <div className="container">Chargement...</div>
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
          <p>Vinted post found !</p>
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
    </div>
  )
}

export default App