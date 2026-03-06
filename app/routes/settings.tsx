import { useState, useEffect } from 'react';
import {
  User,
  Settings as SettingsIcon,
  Bell,
  Shield,
  LogOut,
  Save,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import type { Route } from './+types/settings';
import { useAuthStore } from '~/stores/authStore';
import { useThemeStore } from '~/stores/themeStore';
import { ProtectedRoute } from '~/components/routing/ProtectedRoute';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '~/components/ui/card';
import { useToast } from '~/components/ui/use-toast';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { DashboardLayout } from '~/components/dashboard/DashboardLayout';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Settings - Grospace' },
    {
      name: 'description',
      content: 'Manage your Grospace account and preferences',
    },
  ];
}

function SettingsContent() {
  const { user, updateProfile, error, clearError } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    try {
      setIsSaving(true);
      await updateProfile({ displayName: displayName.trim() });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null;
  } // ProtectedRoute handles this, but TypeScript needs this check

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-3xl space-y-6">
        {/* Profile Section */}
        <Card>
          <form onSubmit={handleUpdateProfile}>
            <CardHeader>
              <CardTitle>Public Profile</CardTitle>
              <CardDescription>
                This information will be displayed to you across the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {' '}
                  Email updates are currently disabled.{' '}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
                <p className="text-xs text-muted-foreground mb-6">
                  This name will appear on your Profile.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6">
              <Button
                type="submit"
                disabled={isSaving || displayName === user.displayName}
              >
                {isSaving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setTheme('light')}
              >
                <Sun className="mr-2 h-4 w-4" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setTheme('dark')}
              >
                <Moon className="mr-2 h-4 w-4" /> Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setTheme('system')}
              >
                <Monitor className="mr-2 h-4 w-4" /> System
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>
              Current subscription and features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Early Adopter</p>
                <p className="text-sm text-muted-foreground opacity-75">
                  Thank you for being part of the Grospace beta.
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                Beta Access
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium text-destructive">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  {' '}
                  End your current session.{' '}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => useAuthStore.getState().signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function Settings() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
