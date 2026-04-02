import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { DashboardSidebar } from './DashboardSidebar';
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet';
import { Button } from '~/components/ui/button';
import { Menu, ArrowLeft } from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export function DashboardLayout({ children, title = 'Dashboard' }: DashboardLayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Show back button on all pages except main dashboard
    const isMainDashboard = location.pathname === '/dashboard';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-64 flex-shrink-0 z-30">
                <DashboardSidebar className="fixed inset-y-0 w-64" />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 z-20 sticky top-0">
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Mobile Menu Trigger */}
                        <div className="lg:hidden">
                            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="-ml-2"
                                        aria-label="Open menu"
                                        data-testid="e2e-nav-mobile-trigger"
                                    >
                                        <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-64 border-r-0">
                                    <DashboardSidebar onNavigate={() => setMobileMenuOpen(false)} />
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Back Button - shown on all pages except main dashboard */}
                        {!isMainDashboard && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(-1)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                title="Go back"
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

                {/* Main Scrollable Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8" data-testid="e2e-layout-main">
                    {children}
                </main>
            </div>
        </div>
    );
}
