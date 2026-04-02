import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  BarChart3,
  Sprout,
  Building2,
  CheckCircle2,
  TrendingUp,
  Calendar
} from 'lucide-react';
import type { Plant } from '../../lib/types';
import type { GrowSpace } from '../../lib/types';
import { differenceInDays } from 'date-fns';

interface GardenStatsCardProps {
  plants: Plant[];
  spaces: GrowSpace[];
  className?: string;
}

export function GardenStatsCard({ plants, spaces, className }: GardenStatsCardProps) {
  const stats = useMemo(() => {
    const totalPlants = plants.length;
    const activePlants = plants.filter(p =>
      p.status !== 'harvested' && p.status !== 'removed'
    ).length;
    const harvestedPlants = plants.filter(p => p.status === 'harvested').length;
    const totalSpaces = spaces.length;

    // Calculate success rate (harvested / (harvested + removed))
    const removedPlants = plants.filter(p => p.status === 'removed').length;
    const completedPlants = harvestedPlants + removedPlants;
    const successRate = completedPlants > 0
      ? Math.round((harvestedPlants / completedPlants) * 100)
      : 0;

    // Calculate average days to harvest
    const harvestedWithDates = plants.filter(
      p => p.status === 'harvested' && p.actualHarvestDate
    );
    const avgDaysToHarvest = harvestedWithDates.length > 0
      ? Math.round(
          harvestedWithDates.reduce((sum, plant) => {
            const days = differenceInDays(
              plant.actualHarvestDate!,
              plant.plantedDate
            );
            return sum + days;
          }, 0) / harvestedWithDates.length
        )
      : 0;

    return {
      totalPlants,
      activePlants,
      harvestedPlants,
      totalSpaces,
      successRate,
      avgDaysToHarvest,
    };
  }, [plants, spaces]);

  const StatItem = ({
    icon: Icon,
    label,
    value,
    suffix = '',
    variant = 'default'
  }: {
    icon: any;
    label: string;
    value: number | string;
    suffix?: string;
    variant?: 'default' | 'success' | 'info';
  }) => {
    const iconColors = {
      default: 'text-muted-foreground',
      success: 'text-green-600',
      info: 'text-blue-600',
    };

    return (
      <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
        <div className={`flex-shrink-0 ${iconColors[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">
            {value}{suffix}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className={className} data-testid="e2e-profile-stats-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="mr-2 h-5 w-5" />
          Garden Statistics
        </CardTitle>
        <CardDescription>Overview of your garden's progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <StatItem
            icon={Sprout}
            label="Total Plants"
            value={stats.totalPlants}
            variant="default"
          />
          <StatItem
            icon={Building2}
            label="Grow Spaces"
            value={stats.totalSpaces}
            variant="default"
          />
          <StatItem
            icon={TrendingUp}
            label="Active Plants"
            value={stats.activePlants}
            variant="info"
          />
          <StatItem
            icon={CheckCircle2}
            label="Harvested"
            value={stats.harvestedPlants}
            variant="success"
          />
          <StatItem
            icon={BarChart3}
            label="Success Rate"
            value={stats.successRate}
            suffix="%"
            variant="success"
          />
          <StatItem
            icon={Calendar}
            label="Avg. Days to Harvest"
            value={stats.avgDaysToHarvest || 'N/A'}
            variant="info"
          />
        </div>

        {/* Additional context */}
        {stats.totalPlants === 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-center text-muted-foreground">
              Start adding plants to see your garden statistics!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
