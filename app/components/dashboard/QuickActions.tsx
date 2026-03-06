import { Link } from 'react-router';
import { Building2, Sprout, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { FeatureHelpPopover } from '../shared/FeatureHelpPopover';

export function QuickActions() {
  const actions = [
    {
      label: 'Add Plant',
      description: 'Track lifecycle',
      icon: Sprout,
      to: '/plants/new',
      variant: 'default' as const,
    },
    {
      label: 'Manage Spaces',
      description: 'Organize grow areas',
      icon: Building2,
      to: '/spaces',
      variant: 'outline' as const,
    },
    {
      label: 'All Plants',
      description: 'Review plant status',
      icon: Sprout,
      to: '/plants',
      variant: 'outline' as const,
    },
    {
      label: 'Events',
      description: 'Notes and tasks hub',
      icon: CalendarDays,
      to: '/events',
      variant: 'outline' as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Quick Actions</CardTitle>
          <FeatureHelpPopover
            label="Quick action help"
            title="Events combines notes and tasks"
            description="Open Events to switch between logging context and scheduling work."
            items={[
              'Notes include photos and searchable context.',
              'Tasks include due dates, priority, and recurrence.',
              'Task completion can also create a linked note entry.',
            ]}
          />
        </div>
        <CardDescription>Jump to common workflows</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {actions.map((action) => (
          <Link key={action.label} to={action.to}>
            <Button variant={action.variant} className="h-auto w-full justify-start gap-3 py-3">
              <action.icon className="h-4 w-4" />
              <div className="text-left">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
