import { Link } from 'react-router';
import { format } from 'date-fns';
import { StickyNote } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import type { Note } from '../../lib/types/note';

interface RecentNotesProps {
    notes: Note[];
    isLoading?: boolean;
}

export function RecentNotes({ notes, isLoading }: RecentNotesProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <StickyNote className="mr-2 h-4 w-4" />
                    Recent Notes
                </CardTitle>
                <CardDescription>
                    Latest observations and updates
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ) : notes.length > 0 ? (
                    <div className="space-y-3">
                        {notes.map((note) => (
                            <div key={note.id} className="p-2 border rounded">
                                <p className="text-sm font-medium line-clamp-2">{note.content}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <Badge variant="outline" className="text-xs">
                                        {note.category}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(note.timestamp), 'MMM d')}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <Link to="/events?type=notes">
                            <Button variant="ghost" size="sm" className="w-full">
                                View all notes
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No recent notes</p>
                )}
            </CardContent>
        </Card>
    );
}

