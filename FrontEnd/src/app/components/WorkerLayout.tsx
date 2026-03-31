import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth, useUser } from "@clerk/clerk-react";
import {
    LayoutDashboard,
    DollarSign,
    ClipboardList,
    Settings,
    LogOut,
    Leaf,
    ChevronLeft,
    User as UserIcon,
    MessageSquare,
    Scan,
    FileText,
    Menu
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
    to: string;
    icon: React.ElementType;
    label: string;
}

const navItems: NavItem[] = [
    { to: '/worker-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/worker-financial', icon: DollarSign, label: 'Financial' },
    { to: '/worker-tasks', icon: ClipboardList, label: 'Tasks' },
    { to: '/worker-harvest', icon: Leaf, label: 'Harvest' },
    { to: '/disease-scanner', icon: Scan, label: 'Disease Scanner' },
    { to: '/ai-assistant', icon: MessageSquare, label: 'AI Assistant' },
    { to: '/worker-reports', icon: FileText, label: 'Reports' },
];

export function WorkerLayout() {
    const { signOut } = useAuth();
    const { user } = useUser();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50">
            {/* Mobile Header */}
            <div className="md:hidden w-full h-16 bg-white border-b border-gray-200 flex-shrink-0 flex items-center justify-between px-4 z-40 relative">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center p-0.5 border border-gray-100 shadow-sm">
                        <img src="/src/app/assets/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-gray-900">Tea Planter</span>
                </div>

                <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>

                {/* Mobile Dropdown Menu */}
                {showMobileMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowMobileMenu(false)}
                        />
                        <div className="absolute top-16 right-4 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 flex flex-col max-h-[80vh] overflow-y-auto">
                            <div className="px-4 py-3 border-b border-gray-100 mb-2 flex items-center gap-3">
                                {user?.imageUrl ? (
                                    <img
                                        src={user.imageUrl}
                                        className="w-10 h-10 rounded-full border border-gray-200"
                                        alt="Avatar"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold flex-shrink-0">
                                        <UserIcon className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress}
                                    </p>
                                    <p className="text-xs text-gray-500">Worker</p>
                                </div>
                            </div>

                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setShowMobileMenu(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-2.5 transition-colors ${
                                                isActive ? 'text-green-700 bg-green-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                                            }`
                                        }
                                    >
                                        <Icon className="w-5 h-5" />
                                        {item.label}
                                    </NavLink>
                                );
                            })}

                            <div className="h-px bg-gray-100 my-2" />

                            <NavLink
                                to="/settings"
                                onClick={() => setShowMobileMenu(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <Settings className="w-5 h-5" />
                                Settings
                            </NavLink>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                            >
                                <LogOut className="w-5 h-5" />
                                Logout
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Desktop Sidebar */}
            <div
                className={`hidden md:flex ${collapsed ? 'w-20' : 'w-64'
                    } bg-white border-r border-gray-200 flex-col transition-all duration-300 h-full`}
            >
                {/* Header */}
                <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center p-0.5 border border-gray-100 shadow-sm">
                                <img src="/src/app/assets/logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="font-bold text-gray-900">Tea Planter</span>
                        </div>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                        <ChevronLeft
                            className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>

                {/* User Info */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        {user?.imageUrl ? (
                            <img
                                src={user.imageUrl}
                                className="w-10 h-10 rounded-full border border-gray-200"
                                alt="Avatar"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold flex-shrink-0">
                                <UserIcon className="w-6 h-6" />
                            </div>
                        )}
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress}
                                </p>
                                <p className="text-xs text-gray-500">Worker</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                        ? 'bg-green-50 text-green-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    } ${collapsed ? 'justify-center' : ''}`
                                }
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {!collapsed && <span className="font-medium">{item.label}</span>}
                            </NavLink>
                        );
                    })}

                </nav>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 space-y-1">
                    <NavLink
                        to="/settings"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        title={collapsed ? 'Settings' : undefined}
                    >
                        <Settings className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="font-medium">Settings</span>}
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center' : ''
                            }`}
                        title={collapsed ? 'Logout' : undefined}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="font-medium">Logout</span>}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>
        </div>
    );
}
