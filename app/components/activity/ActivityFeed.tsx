import { useState } from 'react';
import { Activity, StickyNote, CheckCircle2, Sprout, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { Activity as ActivityType, ActivityType as ActivityTypeEnum } from '../../lib/types/activity';
import { ActivityItem } from './ActivityItem';

// Define filter options
type FilterOption = 'all' | 'notes' | 'tasks' | 'plants' | 'spaces';

const FILTER_OPTIONS: { value: FilterOption; label: string; icon: React.ElementType; types: ActivityTypeEnum[] }[] = [
  { value: 'all', label: 'All', icon: Activity, types: [] },
  { value: 'notes', label: 'Notes', icon: StickyNote, types: ['note_created'] },
  { value: 'tasks', label: 'Tasks', icon: CheckCircle2, types: ['task_completed'] },
  { value: 'plants', label: 'Plants', icon: Sprout, types: ['plant_added', 'plant_harvested', 'plant_status_changed'] },
  { value: 'spaces', label: 'Spaces', icon: Building2, types: ['space_created'] },
];

interface ActivityFeedProps {
  activities: ActivityType[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  className?: string;
  showFilters?: boolean;
  defaultFilter?: FilterOption;
  onFilterChange?: (filter: FilterOption, types: ActivityTypeEnum[]) => void;
  dataTestId?: string;
}

export function ActivityFeed({
  activities,
  isLoading = false,
  title = 'Recent Activity',
  description = 'Your latest garden activities',
  emptyMessage = 'No recent activity',
  className,
  showFilters = false,
  defaultFilter = 'all',
  onFilterChange,
  dataTestId,
}: ActivityFeedProps) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>(defaultFilter);

  const handleFilterChange = (filter: FilterOption) => {
    setActiveFilter(filter);
    const option = FILTER_OPTIONS.find(o => o.value === filter);
    if (onFilterChange && option) {
      onFilterChange(filter, option.types);
    }
  };

  // Filter activities locally if no external handler
  const filteredActivities = !onFilterChange && activeFilter !== 'all'
    ? activities.filter(activity => {
        const option = FILTER_OPTIONS.find(o => o.value === activeFilter);
        return option?.types.includes(activity.type);
      })
    : activities;

  return (
    <Card className={className} data-testid={dataTestId}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="mr-2 h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>

        {/* Filter Pills */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-3">
            {FILTER_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = activeFilter === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange(option.value)}
                  className={cn(
                    "gap-1.5 h-8 text-xs",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length > 0 ? (
          <div className="divide-y">
            {filteredActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {activeFilter !== 'all'
                ? `No ${activeFilter} activity found`
                : emptyMessage
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
