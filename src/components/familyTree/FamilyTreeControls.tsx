import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCcw, 
  Plus,
  Users,
  Filter,
  Download,
  Share
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface FamilyTreeControlsProps {
  onAddMember: () => void;
  onExport: () => void;
  onShare: () => void;
  familyMemberCount: number;
  generationCount: number;
}

const FamilyTreeControls: React.FC<FamilyTreeControlsProps> = ({
  onAddMember,
  onExport,
  onShare,
  familyMemberCount,
  generationCount
}) => {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();

  const handleFitView = () => {
    fitView({ duration: 800, padding: 0.1 });
  };

  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
  };

  const handleReset = () => {
    setCenter(0, 0, { zoom: 1, duration: 800 });
  };

  return (
    <div className="absolute top-4 left-4 z-10 space-y-4">
      {/* Stats Card */}
      <Card className="bg-background/90 backdrop-blur-sm border">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-medium">{familyMemberCount}</div>
                <div className="text-xs text-muted-foreground">Members</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {generationCount} Generations
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zoom Controls */}
      <Card className="bg-background/90 backdrop-blur-sm border">
        <CardContent className="p-2">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFitView}
              className="h-8 w-8 p-0"
            >
              <Maximize className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Controls */}
      <Card className="bg-background/90 backdrop-blur-sm border">
        <CardContent className="p-2">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddMember}
              className="h-8 w-8 p-0"
              title="Add Family Member"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="h-8 w-8 p-0"
              title="Export Tree"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="h-8 w-8 p-0"
              title="Share Tree"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyTreeControls;