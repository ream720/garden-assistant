import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Sprout,
  CalendarDays,
  User,
  Settings,
  LogOut,
  Building2,
  Leaf,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { useAuthStore } from '~/stores/authStore';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '~/components/ui/button';

interface DashboardSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function DashboardSidebar({ className, onNavigate }: DashboardSidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuthStore();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      testId: 'e2e-nav-link-dashboard',
    },
    {
      name: 'Spaces',
      href: '/spaces',
      icon: Building2,
      testId: 'e2e-nav-link-spaces',
    },
    {
      name: 'Plants',
      href: '/plants',
      icon: Sprout,
      testId: 'e2e-nav-link-plants',
    },
    {
      name: 'Events',
      href: '/events',
      icon: CalendarDays,
      testId: 'e2e-nav-link-events',
    },
  ];

  const accountItems = [
    { name: 'Profile', href: '/profile', icon: User, testId: 'e2e-nav-link-profile' },
    { name: 'Settings', href: '/settings', icon: Settings, testId: 'e2e-nav-link-settings' },
  ];

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900',
        className
      )}
    >
      <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
        <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl" onClick={onNavigate}>
          <Leaf className="h-6 w-6" />
          <span>Grospace</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto" data-testid="e2e-nav-sidebar">
        <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">My Garden</div>

        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              data-testid={item.testId}
              className={cn(
                'flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors group',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5',
                  active
                    ? 'text-primary'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                )}
              />
              {item.name}
            </Link>
          );
        })}

        <div className="mt-8 px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</div>

        {accountItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              data-testid={item.testId}
              className={cn(
                'flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors group',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5',
                  active
                    ? 'text-primary'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <Link
          to="/profile"
          onClick={onNavigate}
          className="flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user?.displayName || 'User'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">View Profile</p>
          </div>
        </Link>
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
          onClick={() => signOut()}
          data-testid="e2e-nav-logout-button"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Log Out
        </Button>
      </div>
    </aside>
  );
}
