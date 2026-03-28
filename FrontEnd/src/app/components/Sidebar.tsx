import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from "@clerk/clerk-react";
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard,
  MapPin,
  Users,
  Scale,
  Package,
  Calendar,
  DollarSign,
  Scan,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  Leaf,
  ChevronLeft,
  Truck,
  Building2,
  User as UserIcon
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  roles?: ('owner' | 'clerk' | 'worker')[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard', roles: ['owner', 'clerk'] },
  { to: '/worker-dashboard', icon: LayoutDashboard, labelKey: 'dashboard', roles: ['worker'] },
  { to: '/plots', icon: MapPin, labelKey: 'plots', roles: ['owner'] },
  { to: '/workforce', icon: Users, labelKey: 'workforce', roles: ['owner'] },
  { to: '/harvest', icon: Scale, labelKey: 'harvest', roles: ['owner', 'clerk'] },
  { to: '/inventory', icon: Package, labelKey: 'inventory', roles: ['owner', 'clerk'] },
  { to: '/attendance', icon: Calendar, labelKey: 'attendance', roles: ['owner', 'clerk'] },
  { to: '/financial', icon: DollarSign, labelKey: 'financial', roles: ['owner', 'worker'] },
  { to: '/disease-scanner', icon: Scan, labelKey: 'disease-scanner', roles: ['owner', 'clerk'] },
  { to: '/ai-assistant', icon: MessageSquare, labelKey: 'ai-assistant', roles: ['owner', 'clerk'] },
  { to: '/tasks', icon: FileText, labelKey: 'tasks', roles: ['owner', 'clerk', 'worker'] },
  { to: '/deliveries', icon: Truck, labelKey: 'deliveries', roles: ['owner', 'clerk'] },
  { to: '/factories', icon: Building2, labelKey: 'factories', roles: ['owner'] },
  { to: '/reports', icon: FileText, labelKey: 'reports', roles: ['owner'] },
];

export function Sidebar() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const userRole = (user?.publicMetadata?.role as 'owner' | 'clerk' | 'worker') || 'worker';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole as any))
  );

  return (
    <div
      className={`${collapsed ? 'w-20' : 'w-64'
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}
    >
      {/* Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">TeaPlanter AI</span>
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
            <img src={user.imageUrl} className="w-10 h-10 rounded-full border border-gray-200" alt="Avatar" />
          ) : (
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold flex-shrink-0">
              <UserIcon className="w-6 h-6" />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress}
              </p>
              <p className="text-xs text-gray-500 capitalize">{userRole || 'Member'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredNavItems.map((item) => {
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
              title={collapsed ? t(item.labelKey) : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{t(item.labelKey)}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 space-y-1">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          title={collapsed ? t('settings') : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">{t('settings')}</span>}
        </NavLink>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center' : ''
            }`}
          title={collapsed ? t('logout') : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
}
