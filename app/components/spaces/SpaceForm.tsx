import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import type { GrowSpace, SpaceType } from '../../lib/types';

const spaceFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Space name is required')
    .max(100, 'Name must be less than 100 characters'),
  type: z.enum(
    ['indoor-tent', 'outdoor-bed', 'greenhouse', 'hydroponic', 'container'] as const
  ),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

type SpaceFormData = z.infer<typeof spaceFormSchema>;

interface SpaceFormProps {
  space?: GrowSpace;
  onSubmit: (data: SpaceFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const spaceTypeOptions: { value: SpaceType; label: string }[] = [
  { value: 'indoor-tent', label: 'Indoor Tent' },
  { value: 'outdoor-bed', label: 'Outdoor Bed' },
  { value: 'greenhouse', label: 'Greenhouse' },
  { value: 'hydroponic', label: 'Hydroponic System' },
  { value: 'container', label: 'Container' },
];

export function SpaceForm({
  space,
  onSubmit,
  onCancel,
  isLoading = false,
}: SpaceFormProps) {
  const form = useForm<SpaceFormData>({
    resolver: zodResolver(spaceFormSchema),
    defaultValues: {
      name: space?.name || '',
      type: space?.type || 'indoor-tent',
      description: space?.description || '',
    },
  });

  const handleSubmit = async (data: SpaceFormData) => {
    try {
      await onSubmit(data);
      if (!space) {
        form.reset();
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        data-testid="e2e-spaces-form"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Space Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter space name"
                  {...field}
                  disabled={isLoading}
                  data-testid="e2e-spaces-form-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Space Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger data-testid="e2e-spaces-form-type">
                    <SelectValue placeholder="Select space type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {spaceTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter space description"
                  className="resize-none"
                  {...field}
                  disabled={isLoading}
                  data-testid="e2e-spaces-form-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="e2e-spaces-form-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            data-testid="e2e-spaces-form-submit"
          >
            {isLoading ? 'Saving...' : space ? 'Update Space' : 'Create Space'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
