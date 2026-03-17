import { Sprout } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import type { Plant } from '../../lib/types';
import { formatPlantVariety } from '../../lib/utils/plantDisplay';

interface RecentPlantUpdatesProps {
    plants: Plant[];
    isLoading?: boolean;
}

export function RecentPlantUpdates({ plants, isLoading }: RecentPlantUpdatesProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Sprout className="mr-2 h-4 w-4" />
                    Recent Plant Updates
                </CardTitle>
                <CardDescription>
                    Plants with recent changes
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ) : plants.length > 0 ? (
                    <div className="space-y-2">
                        {plants.map((plant) => (
                            <div key={plant.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{plant.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatPlantVariety(plant.variety)}</p>
                                </div>
                                <Badge variant={
                                    plant.status === 'harvested' ? 'default' :
                                        plant.status === 'flowering' ? 'secondary' : 'outline'
                                }>
                                    {plant.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No recent plant updates</p>
                )}
            </CardContent>
        </Card>
    );
}
