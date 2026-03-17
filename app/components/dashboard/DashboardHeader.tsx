import { Menu, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet';
import { DashboardSidebar } from './DashboardSidebar';

interface DashboardHeaderProps {
    title: string;
    showBackButton?: boolean;
}

export function DashboardHeader({ title, showBackButton = true }: DashboardHeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();

    // Don't show back button on main dashboard
    const isMainDashboard = location.pathname === '/dashboard';
    const shouldShowBack = showBackButton && !isMainDashboard;

    return (
        <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 z-10 sticky top-0">
            <div className="flex items-center gap-2 md:gap-4">
                {/* Mobile Menu Trigger */}
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="-ml-2"
                                aria-label="Open menu"
                            >
                                <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-64">
                            <DashboardSidebar />
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Back Button */}
                {shouldShowBack && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}

                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {/* Notification and search features planned for post-MVP */}
            </div>
        </header>
    );
}
