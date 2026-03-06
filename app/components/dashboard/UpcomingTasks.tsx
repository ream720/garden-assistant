import { Link } from 'react-router';
import { format } from 'date-fns';
import { Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import type { Task } from '../../lib/types';

interface UpcomingTasksProps {
    upcomingTasks: Task[];
    overdueTasks: Task[];
    isLoading?: boolean;
}

export function UpcomingTasks({ upcomingTasks, overdueTasks, isLoading }: UpcomingTasksProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        Upcoming Tasks
                    </CardTitle>
                    <CardDescription>
                        Tasks due in the next 7 days
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : upcomingTasks.length > 0 ? (
                        <div className="space-y-3">
                            {upcomingTasks.slice(0, 3).map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        <p className="text-sm font-medium truncate">{task.title}</p>
                                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                                            <Calendar className="mr-1 h-3 w-3" />
                                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                    <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                                        {task.priority}
                                    </Badge>
                                </div>
                            ))}
                            {upcomingTasks.length > 3 && (
                                <Link to="/events?type=tasks">
                                    <Button variant="ghost" size="sm" className="w-full mt-2">
                                        View all {upcomingTasks.length} upcoming tasks
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No upcoming tasks</p>
                            <Button variant="link" size="sm" asChild>
                                <Link to="/events?type=tasks">Create a task</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {overdueTasks.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-destructive">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Overdue Tasks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {overdueTasks.slice(0, 3).map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-2 border border-destructive/20 rounded">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{task.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Due: {format(new Date(task.dueDate), 'MMM d')}
                                        </p>
                                    </div>
                                    <Badge variant="destructive">Overdue</Badge>
                                </div>
                            ))}
                            {overdueTasks.length > 3 && (
                                <Link to="/events?type=tasks">
                                    <Button variant="ghost" size="sm" className="w-full">
                                        View all {overdueTasks.length} overdue tasks
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

