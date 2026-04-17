import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StickyNote } from 'lucide-react';

import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { PhotoUpload } from './PhotoUpload';
import { FeatureHelpPopover } from '../shared/FeatureHelpPopover';
import { NOTE_CATEGORIES, type NoteCategory } from '../../lib/types/note';
import { useSpaceStore } from '../../stores/spaceStore';
import { usePlantStore } from '../../stores/plantStore';
import { formatPlantDisplayName } from '../../lib/utils/plantDisplay';

const noteFormSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000, 'Content must be less than 2000 characters'),
  category: z.enum([
    'observation',
    'feeding',
    'pruning',
    'issue',
    'milestone',
    'recurringTask',
    'general',
  ] as const),
  plantId: z.string().optional(),
  spaceId: z.string().optional(),
  timestamp: z.string().optional(),
}).refine(data => (data.plantId && data.plantId !== 'none') || (data.spaceId && data.spaceId !== 'none'), {
  message: 'Please select either a plant or space',
  path: ['plantId'],
});

type NoteFormData = z.infer<typeof noteFormSchema>;

interface NoteFormProps {
  onSubmit: (data: {
    content: string;
    category: NoteCategory;
    plantId?: string;
    spaceId?: string;
    timestamp?: Date;
    photos: File[];
  }) => Promise<void>;
  onCancel: () => void;
  initialPlantId?: string;
  initialSpaceId?: string;
  initialContent?: string;
  initialCategory?: NoteCategory;
  initialTimestamp?: Date;
  showPhotoUpload?: boolean;
  submitLabel?: string;
  loading?: boolean;
}

const noteCategoryDescriptions: Record<NoteCategory, string> = {
  observation: 'Use for everyday observations, growth changes, and context you may want to revisit later.',
  feeding: 'Use for watering, nutrients, pH, EC, or any feeding-related update you want in the record.',
  pruning: 'Use for pruning, trimming, training, defoliation, or other structure changes.',
  issue: 'Use for pests, disease, deficiencies, damage, or anything that needs troubleshooting history.',
  milestone: 'Use for major moments like germination, transplanting, flowering, or harvest progress.',
  recurringTask: 'Use when logging completion details from a recurring task occurrence.',
  general: 'Use when the update matters but does not fit neatly into the other categories.',
};

const formatDateTimeLocal = (date: Date): string => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

export function NoteForm({
  onSubmit,
  onCancel,
  initialPlantId,
  initialSpaceId,
  initialContent = '',
  initialCategory = 'observation',
  initialTimestamp,
  showPhotoUpload = true,
  submitLabel = 'Save Note',
  loading = false,
}: NoteFormProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const { spaces } = useSpaceStore();
  const { plants } = usePlantStore();

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      content: initialContent,
      category: initialCategory,
      plantId: initialPlantId || 'none',
      spaceId: initialSpaceId || 'none',
      timestamp: formatDateTimeLocal(initialTimestamp ?? new Date()),
    },
  });

  React.useEffect(() => {
    let effectiveSpaceId = initialSpaceId || 'none';
    const timestampValue = formatDateTimeLocal(initialTimestamp ?? new Date());

    if (initialPlantId && initialPlantId !== 'none' && plants.length > 0) {
      const plant = plants.find((p) => p.id === initialPlantId);

      if (plant && plant.spaceId && spaces.length > 0) {
        const spaceExists = spaces.find((s) => s.id === plant.spaceId);

        if (spaceExists) {
          effectiveSpaceId = plant.spaceId;
        }
      }
    }

    form.reset({
      content: initialContent,
      category: initialCategory,
      plantId: initialPlantId || 'none',
      spaceId: effectiveSpaceId,
      timestamp: timestampValue,
    });

    setTimeout(() => {
      if (effectiveSpaceId !== 'none') {
        form.setValue('spaceId', effectiveSpaceId);
      }
    }, 100);
  }, [
    initialPlantId,
    initialSpaceId,
    initialContent,
    initialCategory,
    initialTimestamp,
    plants,
    spaces,
    form,
  ]);

  const selectedPlantId = form.watch('plantId');
  const selectedSpaceId = form.watch('spaceId');
  const selectedCategory = form.watch('category');

  const availablePlants = selectedSpaceId && selectedSpaceId !== 'none'
    ? plants.filter((plant) => plant.spaceId === selectedSpaceId)
    : plants;

  const handleSubmit = async (data: NoteFormData) => {
    try {
      await onSubmit({
        content: data.content,
        category: data.category,
        plantId: data.plantId && data.plantId !== 'none' ? data.plantId : undefined,
        spaceId: data.spaceId && data.spaceId !== 'none' ? data.spaceId : undefined,
        timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
        photos,
      });
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  React.useEffect(() => {
    if (selectedSpaceId && selectedSpaceId !== 'none' && selectedPlantId && selectedPlantId !== 'none') {
      const plant = plants.find((p) => p.id === selectedPlantId);
      if (plant && plant.spaceId !== selectedSpaceId) {
        form.setValue('plantId', 'none');
      }
    }
  }, [selectedSpaceId, selectedPlantId, plants, form]);

  React.useEffect(() => {
    if (selectedPlantId && selectedPlantId !== 'none' && selectedPlantId !== initialPlantId) {
      const plant = plants.find((p) => p.id === selectedPlantId);
      if (plant && plant.spaceId) {
        form.setValue('spaceId', plant.spaceId);
      }
    }
  }, [selectedPlantId, plants, form, initialPlantId]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        data-testid="e2e-note-form"
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-amber-700" />
                <p className="text-sm font-semibold text-amber-950">Notes are for long-term context</p>
              </div>
              <p className="text-sm text-amber-900/80">
                Use a note for observations, photo updates, issues, milestones, and other details you may want to search later.
              </p>
              <p className="text-sm text-amber-900/80">
                If this is work that needs a due date or should repeat, create a task instead.
              </p>
            </div>
            <FeatureHelpPopover
              label="When to use notes"
              title="Use notes when you are recording context"
              description="Notes act as your searchable garden log. They are best for what happened, what you noticed, and what you want to remember."
              items={[
                'Add photos for visual progress, issues, or before-and-after tracking.',
                'Attach a note to a space or a specific plant.',
                'Backdate the entry so your timeline reflects when it really happened.',
                'Use a task instead when you need a due date, priority, or recurrence.',
              ]}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Note details</h3>
            <p className="text-xs text-muted-foreground">
              Capture what happened in clear language so it stays useful later.
            </p>
          </div>

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note Content</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Example: Noticed lower leaves yellowing after feeding. Added photos for comparison."
                    className="min-h-[120px] resize-none"
                    {...field}
                    data-testid="e2e-note-form-content"
                  />
                </FormControl>
                <p className="text-sm text-muted-foreground">
                  Keep it concise but useful. Good notes make future searching and troubleshooting easier.
                </p>
                <div className="text-right text-sm text-muted-foreground">
                  {field.value.length}/2000
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="e2e-note-form-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {NOTE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {noteCategoryDescriptions[selectedCategory]}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Context and timing</h3>
            <p className="text-xs text-muted-foreground">
              Link this note to the right space, plant, and date for better history.
            </p>
          </div>

          <FormField
            control={form.control}
            name="spaceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grow Space</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="e2e-note-form-space">
                      <SelectValue placeholder="Select a grow space" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No specific space</SelectItem>
                    {spaces.map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose a space when the note applies to the environment as a whole or multiple plants in the same area.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="plantId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plant (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="e2e-note-form-plant">
                      <SelectValue placeholder="Select a plant" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No specific plant</SelectItem>
                    {availablePlants.map((plant) => (
                      <SelectItem key={plant.id} value={plant.id}>
                        {formatPlantDisplayName(plant)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose a plant when the note is specific to that plant. Selecting a plant also keeps the space association aligned.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timestamp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date & Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <p className="text-sm text-muted-foreground">
                  Adjust this if you are logging something after the fact and want the timeline to reflect when it actually happened.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {showPhotoUpload && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Photos</label>
              <p className="text-sm text-muted-foreground">
                Notes can include photos for progress tracking, issue diagnosis, and visual history. Tasks do not support photos.
              </p>
              <PhotoUpload
                photos={photos}
                onPhotosChange={setPhotos}
                disabled={loading}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            data-testid="e2e-note-form-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            data-testid="e2e-note-form-submit"
          >
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
