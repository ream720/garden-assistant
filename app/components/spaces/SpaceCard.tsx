import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MoreHorizontal, Edit, Trash2, Sprout, StickyNote } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { SpaceForm } from './SpaceForm';
import type { GrowSpace } from '../../lib/types';
import { useAuthStore } from '../../stores/authStore';
import { noteService } from '../../lib/services/noteService';
import { Badge } from '../ui/badge';

interface SpaceCardProps {
  space: GrowSpace;
  noteCount?: number;
  onUpdate: (id: string, updates: Partial<GrowSpace>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClick?: (space: GrowSpace) => void;
}

const spaceTypeLabels: Record<string, string> = {
  'indoor-tent': 'Indoor Tent',
  'outdoor-bed': 'Outdoor Bed',
  'greenhouse': 'Greenhouse',
  'hydroponic': 'Hydroponic System',
  'container': 'Container',
};

export function SpaceCard({ space, noteCount, onUpdate, onDelete, onClick }: SpaceCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fallbackNoteCount, setFallbackNoteCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Backward-compatible fallback when noteCount is not provided by parent.
  useEffect(() => {
    if (noteCount !== undefined || !user) return;
    
    const loadSpaceNotes = async () => {
      try {
        const notes = await noteService.list(user.uid, { spaceId: space.id });
        setFallbackNoteCount(notes.length);
      } catch (error) {
        console.error('Failed to load space notes:', error);
      }
    };

    loadSpaceNotes();
  }, [noteCount, user, space.id]);

  const resolvedNoteCount = noteCount ?? fallbackNoteCount;

  const handleUpdate = async (data: { name: string; type: any; description?: string }) => {
    setIsUpdating(true);
    try {
      await onUpdate(space.id, data);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update space:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(space.id);
    } catch (error) {
      console.error('Failed to delete space:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(space);
    } else {
      navigate(`/spaces/${space.id}`);
    }
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      data-testid={`e2e-spaces-card-${space.id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1" onClick={handleCardClick}>
          <CardTitle className="text-lg flex items-center gap-2">
            {space.name}
            {resolvedNoteCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                {resolvedNoteCount}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{spaceTypeLabels[space.type]}</CardDescription>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              data-testid={`e2e-spaces-card-menu-${space.id}`}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/events?type=notes&spaceId=${space.id}`)}>
              <StickyNote className="mr-2 h-4 w-4" />
              View Events ({resolvedNoteCount})
            </DropdownMenuItem>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Space</DialogTitle>
                  <DialogDescription>
                    Make changes to your grow space here.
                  </DialogDescription>
                </DialogHeader>
                <SpaceForm
                  space={space}
                  onSubmit={handleUpdate}
                  onCancel={() => setIsEditDialogOpen(false)}
                  isLoading={isUpdating}
                />
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive"
                  data-testid={`e2e-spaces-card-delete-${space.id}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the space
                    "{space.name}" and all associated data.
                    {space.plantCount > 0 && (
                      <span className="block mt-2 font-medium text-destructive">
                        Warning: This space contains {space.plantCount} plant(s).
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid={`e2e-spaces-card-delete-confirm-${space.id}`}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent onClick={handleCardClick}>
        {space.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {space.description}
          </p>
        )}
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Sprout className="mr-1 h-4 w-4" />
          <span>{space.plantCount} plant{space.plantCount !== 1 ? 's' : ''}</span>
        </div>
      </CardContent>
    </Card>
  );
}
