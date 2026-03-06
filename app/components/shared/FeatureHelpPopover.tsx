import { Info } from 'lucide-react';

import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';

interface FeatureHelpPopoverProps {
  label: string;
  title: string;
  description: string;
  items?: string[];
  className?: string;
}

export function FeatureHelpPopover({
  label,
  title,
  description,
  items = [],
  className,
}: FeatureHelpPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn('h-7 w-7 rounded-full text-muted-foreground', className)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {items.length > 0 && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
