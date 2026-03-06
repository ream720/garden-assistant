import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Search, Plus, Filter, StickyNote } from 'lucide-react';
import { NoteCard } from './NoteCard';
import { NoteForm } from './NoteForm';
import { FeatureHelpPopover } from '../shared/FeatureHelpPopover';
import { useNoteStore } from '../../stores/noteStore';
import { useSpaceStore } from '../../stores/spaceStore';
import { usePlantStore } from '../../stores/plantStore';
import { useAuthStore } from '../../stores/authStore';
import { NOTE_CATEGORIES, type Note, type NoteCategory } from '../../lib/types/note';
import { toast } from 'sonner';

interface NoteListProps {
  spaceId?: string;
  plantId?: string;
  showCreateButton?: boolean;
  title?: string;
  description?: string;
  showDescription?: boolean;
}

const defaultDescription = 'Use notes for observations, issues, milestones, photo updates, and other context you may want to find later. Use tasks for work that needs a due date or repeat schedule. When you complete a task, you can create a linked note so history stays in one timeline.';

export function NoteList({
  spaceId,
  plantId,
  showCreateButton = true,
  title = 'Notes & Observations',
  description = defaultDescription,
  showDescription = true,
}: NoteListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSpace, setSelectedSpace] = useState<string>('all');
  const [selectedPlant, setSelectedPlant] = useState<string>('all');
  const [formLoading, setFormLoading] = useState(false);

  const effectiveSpaceId = spaceId || searchParams.get('spaceId') || undefined;
  const effectivePlantId = plantId || searchParams.get('plantId') || undefined;

  useEffect(() => {
    if (searchParams.get('spaceId') && !spaceId) {
      setSelectedSpace(searchParams.get('spaceId') || 'all');
    }
    if (searchParams.get('plantId') && !plantId) {
      setSelectedPlant(searchParams.get('plantId') || 'all');
    }
  }, [searchParams, spaceId, plantId]);

  const { user } = useAuthStore();
  const {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    loadNotes,
    clearError,
  } = useNoteStore();
  const { spaces } = useSpaceStore();
  const { plants } = usePlantStore();

  const updateUrlParams = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams);

    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== 'all') {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    const newSearch = current.toString();
    if (newSearch !== searchParams.toString()) {
      setSearchParams(current);
    }
  };

  useEffect(() => {
    if (!user) return;

    const filters = {
      spaceId: effectiveSpaceId,
      plantId: effectivePlantId,
    };

    loadNotes(user.uid, filters);
  }, [user, effectiveSpaceId, effectivePlantId, loadNotes]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const filteredNotes = useMemo(() => {
    let filtered = notes;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((note) => note.content.toLowerCase().includes(term));
    }

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter((note) => note.category === selectedCategory);
    }

    if (effectiveSpaceId) {
      filtered = filtered.filter((note) => note.spaceId === effectiveSpaceId);
    } else if (selectedSpace && selectedSpace !== 'all') {
      filtered = filtered.filter((note) => note.spaceId === selectedSpace);
    }

    if (effectivePlantId) {
      filtered = filtered.filter((note) => note.plantId === effectivePlantId);
    } else if (selectedPlant && selectedPlant !== 'all') {
      filtered = filtered.filter((note) => note.plantId === selectedPlant);
    }

    return filtered;
  }, [notes, searchTerm, selectedCategory, selectedSpace, selectedPlant, effectiveSpaceId, effectivePlantId]);

  const handleCreateNote = async (data: {
    content: string;
    category: NoteCategory;
    plantId?: string;
    spaceId?: string;
    timestamp?: Date;
    photos: File[];
  }) => {
    if (!user) return;

    setFormLoading(true);
    try {
      await createNote({
        content: data.content,
        category: data.category,
        plantId: data.plantId,
        spaceId: data.spaceId,
        timestamp: data.timestamp,
        photos: data.photos,
      }, user.uid);

      setShowCreateDialog(false);
      toast.success('Note created successfully');
    } catch (error) {
      toast.error('Failed to create note');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateNote = async (data: {
    content: string;
    category: NoteCategory;
    plantId?: string;
    spaceId?: string;
    timestamp?: Date;
    photos: File[];
  }) => {
    if (!editingNote) return;

    setFormLoading(true);
    try {
      await updateNote(editingNote.id, {
        content: data.content,
        category: data.category,
        plantId: data.plantId ?? null,
        spaceId: data.spaceId ?? null,
        timestamp: data.timestamp,
      });

      setEditingNote(null);
      toast.success('Note updated successfully');
    } catch (error) {
      toast.error('Failed to update note');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success('Note deleted successfully');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const getSpaceName = (spaceId?: string) => {
    if (!spaceId) return undefined;
    return spaces.find((space) => space.id === spaceId)?.name;
  };

  const getPlantName = (plantId?: string) => {
    if (!plantId) return undefined;
    const plant = plants.find((item) => item.id === plantId);
    return plant ? `${plant.name} (${plant.variety})` : undefined;
  };

  const availablePlantsForFilter = (effectiveSpaceId || selectedSpace !== 'all')
    ? plants.filter((plant) => plant.spaceId === (effectiveSpaceId || selectedSpace))
    : plants;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className={showDescription ? 'space-y-2' : ''}>
          <div className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            <h2 className="text-xl font-semibold">{title}</h2>
            <Badge variant="secondary">{filteredNotes.length}</Badge>
            <FeatureHelpPopover
              label="Notes help"
              title="Use notes for searchable history"
              description="Notes are best when you want to capture what happened, what you saw, or what you want to remember over time."
              items={[
                'Store observations, issues, milestones, and quick context.',
                'Attach notes to a space or a plant.',
                'Add photos and backdate entries when needed.',
                'Use tasks instead for work that needs a due date, priority, or recurrence.',
              ]}
            />
          </div>
          {showDescription && (
            <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {showCreateButton && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>
                  Record an observation, issue, milestone, or photo update. If it needs a due date or repeat schedule, use a task instead.
                </DialogDescription>
              </DialogHeader>
              <NoteForm
                onSubmit={handleCreateNote}
                onCancel={() => setShowCreateDialog(false)}
                initialSpaceId={effectiveSpaceId}
                initialPlantId={effectivePlantId}
                loading={formLoading}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {(effectiveSpaceId || effectivePlantId) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground">Active filters:</span>

              {effectiveSpaceId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Space: {getSpaceName(effectiveSpaceId)}
                  <button
                    onClick={() => {
                      setSelectedSpace('all');
                      updateUrlParams({ spaceId: null });
                    }}
                    className="ml-1 hover:bg-muted rounded-full p-0.5 text-xs"
                    title="Remove space filter"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {effectivePlantId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Plant: {getPlantName(effectivePlantId)}
                  <button
                    onClick={() => {
                      setSelectedPlant('all');
                      updateUrlParams({ plantId: null });
                    }}
                    className="ml-1 hover:bg-muted rounded-full p-0.5 text-xs"
                    title="Remove plant filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedCategory} onValueChange={(value) => {
              setSelectedCategory(value);
              updateUrlParams({ category: value });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {NOTE_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={effectiveSpaceId || selectedSpace}
              onValueChange={(value) => {
                setSelectedSpace(value);
                setSelectedPlant('all');
                updateUrlParams({ spaceId: value, plantId: null });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All spaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All spaces</SelectItem>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={effectivePlantId || selectedPlant}
              onValueChange={(value) => {
                setSelectedPlant(value);
                updateUrlParams({ plantId: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All plants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plants</SelectItem>
                {availablePlantsForFilter.map((plant) => (
                  <SelectItem key={plant.id} value={plant.id}>
                    {plant.name} ({plant.variety})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || selectedCategory !== 'all' || selectedSpace !== 'all' || selectedPlant !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedSpace('all');
                setSelectedPlant('all');
                setSearchParams(new URLSearchParams());
              }}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && notes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <StickyNote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No notes found</h3>
            <p className="text-muted-foreground mb-4">
              {notes.length === 0
                ? 'Start documenting observations, issues, milestones, or photo progress here. Use tasks separately for work that needs scheduling.'
                : 'Try adjusting your search or filters to find what you\'re looking for.'
              }
            </p>
            {showCreateButton && notes.length === 0 && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Note
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              spaceName={getSpaceName(note.spaceId)}
              plantName={getPlantName(note.plantId)}
              onEdit={setEditingNote}
              onDelete={handleDeleteNote}
            />
          ))}
        </div>
      )}

      <Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update the note details, category, or date so your history stays accurate and easy to search.
            </DialogDescription>
          </DialogHeader>
          {editingNote && (
            <NoteForm
              onSubmit={handleUpdateNote}
              onCancel={() => setEditingNote(null)}
              initialPlantId={editingNote.plantId}
              initialSpaceId={editingNote.spaceId}
              initialContent={editingNote.content}
              initialCategory={editingNote.category}
              initialTimestamp={editingNote.timestamp}
              showPhotoUpload={false}
              submitLabel="Update Note"
              loading={formLoading}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



