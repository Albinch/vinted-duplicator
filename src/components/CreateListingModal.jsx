import { useState, useEffect } from 'react'
import { Upload, X, Loader2, Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { toast } from 'sonner'

/**
 * Modal for creating a Vinted listing from a template
 */
function CreateListingModal({ open, onOpenChange, template, onSuccess }) {
  console.log(template);

  const [formData, setFormData] = useState({
    title: template?.data?.title || '',
    description: template?.data?.description || '',
    brand: template?.data?.brand || '',
    brand_id: template?.data?.brand_id || null,
    size: template?.data?.size || '',
    size_id: template?.data?.size_id || null,
    category: template?.data?.category || '',
    catalog_id: template?.data?.catalog_id || null,
    condition: template?.data?.status || '',
    status_id: template?.data?.status_id || 2,
    colors: template?.data?.colors || '',
    color_ids: template?.data?.color_ids || [],
    price: template?.data?.price || '',
    package_size_id: template?.data?.package_size_id || 1,
    currency: template?.data?.currency || 'EUR',
    is_unisex: template?.data?.is_unisex || false,
    item_attributes: template?.data?.item_attributes || [],
  })

  const [photos, setPhotos] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  /**
   * Update form data when template changes
   */
  useEffect(() => {
    if (template?.data) {
      setFormData({
        title: template.data.title || '',
        description: template.data.description || '',
        brand: template.data.brand || '',
        brand_id: template.data.brand_id || null,
        size: template.data.size || '',
        size_id: template.data.size_id || null,
        category: template.data.category || '',
        catalog_id: template.data.catalog_id || null,
        condition: template.data.status || '',
        status_id: template.data.status_id || 2,
        colors: template.data.colors || '',
        color_ids: template.data.color_ids || [],
        price: template.data.price || '',
        package_size_id: template.data.package_size_id || 1,
        currency: template.data.currency || 'EUR',
        is_unisex: template.data.is_unisex || false,
        item_attributes: template.data.item_attributes || [],
      })
      // Reset photos when template changes
      setPhotos([])
      setPhotoPreviews([])
    }
  }, [template])

  /**
   * Handle file input change
   */
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)

    if (files.length === 0) return

    // Validate file types
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped (only images allowed)')
    }

    // Add to photos
    setPhotos(prev => [...prev, ...validFiles])

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result])
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * Remove a photo
   */
  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.title?.trim()) {
      toast.error('Title is required')
      return
    }

    if (photos.length === 0) {
      toast.error('At least one photo is required')
      return
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price')
      return
    }

    setIsSubmitting(true)
    setUploadProgress('Preparing...')

    try {
      // Find or open a Vinted tab
      const tabs = await chrome.tabs.query({})
      let vintedTab = tabs.find(tab => tab.url?.includes('vinted.'))

      // If no Vinted tab exists, open one
      if (!vintedTab) {
        setUploadProgress('Opening Vinted...')
        vintedTab = await chrome.tabs.create({
          url: 'https://www.vinted.fr',
          active: false
        })

        // Wait for tab to load
        await new Promise(resolve => {
          const listener = (tabId, changeInfo) => {
            if (tabId === vintedTab.id && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener)
              resolve()
            }
          }
          chrome.tabs.onUpdated.addListener(listener)
        })
      }

      // Convert photos to base64
      setUploadProgress('Processing photos...')
      const photoDataUrls = await Promise.all(
        photos.map(photo => {
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(photo)
          })
        })
      )

      // Send message to content script
      setUploadProgress('Creating listing...')
      const response = await chrome.tabs.sendMessage(vintedTab.id, {
        action: 'createListingFromTemplate',
        formData,
        photos: photoDataUrls
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to create listing')
      }

      toast.success('Listing created successfully!')

      // Close modal and notify parent
      onOpenChange(false)
      if (onSuccess) {
        onSuccess(response)
      }

    } catch (error) {
      console.error('Error creating listing:', error)
      toast.error(error.message || 'Failed to create listing')
    } finally {
      setIsSubmitting(false)
      setUploadProgress('')
    }
  }

  /**
   * Handle input changes
   */
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClose={() => !isSubmitting && onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Create Listing: {template?.name}
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-4">
            {/* Info message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Template from your wardrobe:</strong> All fields (category, brand, size, condition, colors) are pre-filled.
                Only photos are required - everything else is ready to go!
              </p>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Photos <span className="text-red-500">*</span>
              </label>

              {/* Photo previews */}
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {photos.length === 0 ? 'Upload photos' : 'Add more photos'}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Upload at least 1 photo (max 20)
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Item title"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px]"
                placeholder="Item description"
                disabled={isSubmitting}
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Price (EUR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="10.00"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Brand name"
                disabled={isSubmitting}
              />
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Size
              </label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => handleChange('size', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Size"
                disabled={isSubmitting}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Category"
                disabled={isSubmitting}
              />
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Condition
              </label>
              <input
                type="text"
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Condition"
                disabled={isSubmitting}
              />
            </div>

            {/* Colors */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Colors
              </label>
              <input
                type="text"
                value={formData.colors}
                onChange={(e) => handleChange('colors', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Colors"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter className="border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || photos.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadProgress}
                </>
              ) : (
                'Create Listing'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateListingModal
