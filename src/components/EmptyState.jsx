import { PackageOpen, MousePointerClick } from 'lucide-react'
import { Card, CardContent } from './ui/card'

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <PackageOpen className="h-10 w-10 text-muted-foreground" />
        </div>

        <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
        <p className="text-sm text-muted-foreground mb-2 max-w-sm">
          Create your first template to quickly duplicate Vinted listings
        </p>
        <p className="text-xs text-amber-600 mb-6 max-w-sm">
          Note: You can only save templates from items in your own wardrobe
        </p>

        <div className="w-full max-w-xs space-y-3 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
              <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                1
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Go to one of your items in your wardrobe
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
              <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                2
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Click <MousePointerClick className="inline h-3.5 w-3.5 mx-0.5" /> <strong>Save Template</strong> below
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default EmptyState
