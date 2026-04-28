import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { OwnerSubscriptionBanner } from './OwnerSubscriptionBanner';

export function DashboardLayout() {
  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <OwnerSubscriptionBanner />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
