import { useState } from 'react'
import { Trash2, Calendar, ChevronRight } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

function TemplateItem({ template, index, isClickable, onUse, onDelete }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const formattedDate = new Date(template.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const handleDelete = () => {
    setShowDeleteDialog(false)
    onDelete()
  }

  return (
    <>
      <Card
        className={`transition-all ${
          isClickable
            ? 'cursor-pointer hover:border-primary hover:shadow-md'
            : 'opacity-75'
        }`}
        onClick={isClickable ? onUse : undefined}
      >
        <CardContent className="flex items-center gap-3 p-4">
          {isClickable && (
            <div className="rounded-full bg-primary/10 p-2">
              <ChevronRight className="h-4 w-4 text-primary" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{template.name}</h4>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteDialog(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClose={() => setShowDeleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{template.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TemplateItem
