import { Link, useLocation } from 'react-router';
import { useState } from 'react';
import {
  Menu,
  Home,
  Building2,
  Sprout,
  CalendarDays,
  Settings,
  User,
  ChevronDown,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';
import { useAuthStore } from '~/stores/authStore';
import type { LucideIcon } from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  children?: {
    name: string;
    href: string;
    icon: LucideIcon;
  }[];
}

export function Navbar() {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicNavigation: NavigationItem[] = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'About', href: '/about', icon: Home },
    { name: 'Login', href: '/login', icon: Home },
  ];

  const authenticatedNavigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      children: [
        { name: 'Spaces', href: '/spaces', icon: Building2 },
        { name: 'Plants', href: '/plants', icon: Sprout },
        { name: 'Events', href: '/events', icon: CalendarDays },
      ],
    },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const navigation = user ? authenticatedNavigation : publicNavigation;

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold">
              Grospace
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.href ||
                  item.children?.some((child) => location.pathname.startsWith(child.href));

                if (item.children) {
                  return (
                    <DropdownMenu key={item.name}>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors outline-none',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <Link to={item.href}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Icon className="mr-2 h-4 w-4" />
                            <span>Overview</span>
                          </DropdownMenuItem>
                        </Link>
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <Link key={child.name} to={child.href}>
                              <DropdownMenuItem className="cursor-pointer">
                                <ChildIcon className="mr-2 h-4 w-4" />
                                <span>{child.name}</span>
                              </DropdownMenuItem>
                            </Link>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              {user && (
                <Button variant="outline" size="sm" onClick={handleLogout} className="ml-2">
                  Log Out
                </Button>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center space-x-2">
            {user && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log Out
              </Button>
            )}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Navigation</h2>
                  </div>
                  <nav className="flex flex-col space-y-2">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        location.pathname === item.href ||
                        item.children?.some((child) => location.pathname.startsWith(child.href));

                      return (
                        <div key={item.name} className="flex flex-col space-y-1">
                          <Link
                            to={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.name}</span>
                          </Link>
                          {item.children && (
                            <div className="ml-4 flex flex-col space-y-1 border-l pl-4">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;
                                const isChildActive = location.pathname.startsWith(child.href);
                                return (
                                  <Link
                                    key={child.name}
                                    to={child.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                      'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                      isChildActive
                                        ? 'bg-accent/50 text-accent-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                    )}
                                  >
                                    <ChildIcon className="h-4 w-4" />
                                    <span>{child.name}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
