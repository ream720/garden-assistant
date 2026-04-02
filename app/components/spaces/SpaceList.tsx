import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { SpaceCard } from './SpaceCard';
import { SpaceForm } from './SpaceForm';
import { useSpaceStore } from '../../stores/spaceStore';
import { useAuthStore } from '../../stores/authStore';
import { noteService } from '../../lib/services/noteService';
import type { GrowSpace } from '../../lib/types';

interface SpaceListProps {
  onSpaceSelect?: (space: GrowSpace) => void;
}

export function SpaceList({ onSpaceSelect }: SpaceListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [noteCountsBySpace, setNoteCountsBySpace] = useState<Record<string, number>>({});
  const { user } = useAuthStore();
  const {
    spaces,
    loading,
    error,
    loadSpaces,
    createSpace,
    updateSpace,
    deleteSpace,
    clearError
  } = useSpaceStore();

  useEffect(() => {
    if (user) {
      loadSpaces();
    }
  }, [user, loadSpaces]);

  useEffect(() => {
    if (!user) {
      setNoteCountsBySpace({});
      return;
    }

    const unsubscribe = noteService.subscribe(user.uid, (notes) => {
      const counts: Record<string, number> = {};
      notes.forEach((note) => {
        if (!note.spaceId) return;
        counts[note.spaceId] = (counts[note.spaceId] || 0) + 1;
      });
      setNoteCountsBySpace(counts);
    });

    return unsubscribe;
  }, [user]);

  const handleCreateSpace = async (data: { name: string; type: any; description?: string }) => {
    if (!user) return;

    try {
      await createSpace({
        ...data,
        userId: user.uid,
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create space:', error);
    }
  };

  const handleUpdateSpace = async (id: string, updates: Partial<GrowSpace>) => {
    try {
      await updateSpace(id, updates);
    } catch (error) {
      console.error('Failed to update space:', error);
    }
  };

  const handleDeleteSpace = async (id: string) => {
    try {
      await deleteSpace(id);
    } catch (error) {
      console.error('Failed to delete space:', error);
    }
  };

  const filteredSpaces = spaces.filter((space) =>
    space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (space.type && space.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && spaces.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading spaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => { clearError(); loadSpaces(); }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="e2e-spaces-list">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search spaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="e2e-spaces-search-input"
          />
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="e2e-spaces-add-button">
              <Plus className="mr-2 h-4 w-4" />
              New Space
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Space</DialogTitle>
              <DialogDescription>
                Add a new grow space to organize your plants.
              </DialogDescription>
            </DialogHeader>
            <SpaceForm
              onSubmit={handleCreateSpace}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={loading}
            />
          </DialogContent>
        </Dialog>
      </div>

      {filteredSpaces.length === 0 ? (
        <div className="text-center py-12">
          {searchTerm ? (
             <p className="text-muted-foreground">No spaces match your filters.</p>
          ) : (
            <div className="mx-auto max-w-sm">
              <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No spaces yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Get started by creating your first grow space.
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="e2e-spaces-add-button-empty">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Space
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Space</DialogTitle>
                  <DialogDescription>
                    Add a new grow space to organize your plants.
                  </DialogDescription>
                </DialogHeader>
                <SpaceForm
                  onSubmit={handleCreateSpace}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  isLoading={loading}
                />
              </DialogContent>
            </Dialog>
          </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="e2e-spaces-grid">
          {filteredSpaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              noteCount={noteCountsBySpace[space.id] || 0}
              onUpdate={handleUpdateSpace}
              onDelete={handleDeleteSpace}
              onClick={onSpaceSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
