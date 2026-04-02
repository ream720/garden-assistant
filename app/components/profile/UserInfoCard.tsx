import type { AuthUser } from '../../lib/types/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { User, Mail } from 'lucide-react';

interface UserInfoCardProps {
  user: AuthUser;
  className?: string;
}

export function UserInfoCard({ user, className }: UserInfoCardProps) {
  return (
    <Card className={className} data-testid="e2e-profile-user-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="mr-2 h-5 w-5" />
          Profile
        </CardTitle>
        <CardDescription>Your account information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display Name */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Display Name
          </label>
          <p className="text-base font-medium mt-1">
            {user.displayName || 'No name set'}
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-muted-foreground flex items-center">
            <Mail className="mr-1 h-3 w-3" />
            Email
          </label>
          <p className="text-base mt-1">
            {user.email}
          </p>
        </div>

        {/* User ID */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            User ID
          </label>
          <p className="text-xs font-mono mt-1 text-muted-foreground">
            {user.uid}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
