import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 bg-card border border-border rounded-lg shadow-lg p-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        title="Zoom In"
        className="hover:bg-accent"
      >
        <ZoomIn className="h-5 w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onReset}
        title="Reset Zoom"
        className="hover:bg-accent"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        title="Zoom Out"
        className="hover:bg-accent"
      >
        <ZoomOut className="h-5 w-5" />
      </Button>
      
      <div className="px-2 py-1 text-xs text-center text-muted-foreground border-t border-border mt-1">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
