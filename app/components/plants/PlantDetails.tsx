import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Edit, Move, Calendar, ArrowLeft } from 'lucide-react';
import { toDate, formatDateSafe } from '../../lib/utils/dateUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { PlantForm } from './PlantForm';
import { MoveDialog } from './MoveDialog';
import { HarvestDialog } from './HarvestDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type { Plant, GrowSpace } from '../../lib/types';
import { formatPlantVariety } from '../../lib/utils/plantDisplay';

interface PlantDetailsProps {
  plant: Plant;
  spaces: GrowSpace[];
  onBack?: () => void;
  onUpdate?: () => void;
}

const statusColors = {
  seedling: 'bg-green-100 text-green-800 hover:bg-green-200',
  vegetative: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  flowering: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  harvested: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  removed: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
};

const statusLabels = {
  seedling: 'Seedling',
  vegetative: 'Vegetative',
  flowering: 'Flowering',
  harvested: 'Harvested',
  removed: 'Removed',
};

export function PlantDetails({ plant, spaces, onBack, onUpdate }: PlantDetailsProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showHarvestDialog, setShowHarvestDialog] = useState(false);

  const currentSpace = spaces.find(space => space.id === plant.spaceId);
  const plantedDate = toDate(plant.plantedDate);
  const daysSincePlanted = formatDateSafe(
    plant.plantedDate,
    (date) => formatDistanceToNow(date, { addSuffix: false }),
    'Unknown'
  );
  const canHarvest = plant.status !== 'harvested' && plant.status !== 'removed';

  const handleSuccess = () => {
    setShowEditDialog(false);
    setShowMoveDialog(false);
    setShowHarvestDialog(false);
    onUpdate?.();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{plant.name}</h1>
            <p className="text-muted-foreground">{formatPlantVariety(plant.variety)}</p>
          </div>
        </div>
        <Badge className={statusColors[plant.status]}>
          {statusLabels[plant.status]}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowEditDialog(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Plant
        </Button>
        <Button variant="outline" onClick={() => setShowMoveDialog(true)}>
          <Move className="mr-2 h-4 w-4" />
          Move to Space
        </Button>
        {canHarvest && (
          <Button variant="outline" onClick={() => setShowHarvestDialog(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Record Harvest
          </Button>
        )}
      </div>

      {/* Plant Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Plant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{plant.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Variety</p>
                <p className="text-sm">{formatPlantVariety(plant.variety)}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={statusColors[plant.status]} variant="secondary">
                  {statusLabels[plant.status]}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Space</p>
                <p className="text-sm">{currentSpace?.name || 'Unknown'}</p>
              </div>
            </div>

            {plant.seedSource && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Seed Source</p>
                  <p className="text-sm">{plant.seedSource}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline Information */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Planted Date</p>
              <p className="text-sm">{formatDateSafe(plant.plantedDate, (date) => format(date, 'EEEE, MMMM d, yyyy'))}</p>
              <p className="text-xs text-muted-foreground">{daysSincePlanted} ago</p>
            </div>

            {plant.expectedHarvestDate && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expected Harvest</p>
                  <p className="text-sm">{formatDateSafe(plant.expectedHarvestDate, (date) => format(date, 'EEEE, MMMM d, yyyy'))}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateSafe(
                      plant.expectedHarvestDate,
                      (date) => date > new Date() 
                        ? `In ${formatDistanceToNow(date)}`
                        : `${formatDistanceToNow(date)} ago`,
                      ''
                    )}
                  </p>
                </div>
              </>
            )}

            {plant.actualHarvestDate && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Actual Harvest</p>
                  <p className="text-sm">{formatDateSafe(plant.actualHarvestDate, (date) => format(date, 'EEEE, MMMM d, yyyy'))}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateSafe(plant.actualHarvestDate, (date) => `${formatDistanceToNow(date)} ago`, '')}
                  </p>
                </div>
              </>
            )}

            <Separator />
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-sm">{formatDateSafe(plant.createdAt, (date) => format(date, 'EEEE, MMMM d, yyyy'))}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-sm">{formatDateSafe(plant.updatedAt, (date) => format(date, 'EEEE, MMMM d, yyyy'))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plant Notes Field */}
      {plant.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Plant Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{plant.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Plant Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plant</DialogTitle>
          </DialogHeader>
          <PlantForm
            plant={plant}
            spaces={spaces}
            onSuccess={handleSuccess}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Move Plant Dialog */}
      {showMoveDialog && (
        <MoveDialog
          plant={plant}
          spaces={spaces}
          onSuccess={handleSuccess}
          onCancel={() => setShowMoveDialog(false)}
        />
      )}

      {/* Harvest Plant Dialog */}
      {showHarvestDialog && (
        <HarvestDialog
          plant={plant}
          onSuccess={handleSuccess}
          onCancel={() => setShowHarvestDialog(false)}
        />
      )}
    </div>
  );
}
