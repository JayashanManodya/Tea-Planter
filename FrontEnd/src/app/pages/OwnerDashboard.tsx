import { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '@/app/components/StatCard';
import {
    MapPin,
    Users,
    Scale,
    Package,
    TrendingUp,
    AlertTriangle,
    Activity,
    DollarSign,
    Loader2,
    Calendar,
    FileText,
    Leaf,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '@/lib/api';

export function OwnerDashboard() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const plantationId = user?.publicMetadata?.plantationId as string | undefined;

    const [stats, setStats] = useState({
        plots: 0,
        workers: 0,
        harvest: 0,
        revenue: 0,
    });
    const [harvests, setHarvests] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = await getToken();
                const [plots, workers, fetchedHarvests, fetchedIncomes, fetchedInventory] = await Promise.all([
                    api.getPlots(plantationId, token || undefined),
                    api.getWorkers(plantationId, token || undefined),
                    api.getHarvests(selectedMonth, plantationId, token || undefined).catch(() => []),
                    api.getIncomes(selectedMonth, plantationId, token || undefined).catch(() => []),
                    api.getInventoryItems(plantationId || '', token || undefined).catch(() => []),
                ]);
                setHarvests(fetchedHarvests);
                setInventory(fetchedInventory);
                setStats({
                    plots: plots.length,
                    workers: workers.filter((w: any) => w.status === 'Active').length,
                    harvest: fetchedHarvests.reduce((sum: number, h: any) => sum + (h.netWeight || 0), 0),
                    revenue: (fetchedIncomes || []).reduce((sum: number, i: any) => sum + (i.netAmount || i.amount || 0), 0),
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedMonth, plantationId, getToken]);

    const yieldTrendData = useMemo(() => {
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            return d.toLocaleString('en-US', { month: 'short' });
        });

        const monthMap = last6Months.reduce((acc, month) => {
            acc[month] = 0;
            return acc;
        }, {} as Record<string, number>);

        harvests.forEach(h => {
            const month = new Date(h.harvestDate).toLocaleString('en-US', { month: 'short' });
            if (monthMap[month] !== undefined) {
                monthMap[month] += h.netWeight;
            }
        });

        return last6Months.map(month => ({
            month,
            yield: monthMap[month]
        }));
    }, [harvests]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="text-gray-600 mt-1">Welcome back, {user?.fullName || (userRole === 'clerk' ? 'Clerk' : 'Owner')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-600">Period:</p>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Plots"
                    value={stats.plots.toString()}
                    icon={MapPin}
                    color="green"
                />
                <StatCard
                    title="Active Workers"
                    value={stats.workers.toString()}
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title="Total Yield"
                    value={`${stats.harvest.toFixed(1)} kg`}
                    icon={Leaf}
                    color="orange"
                />
                <StatCard
                    title="Revenue"
                    value={`LKR ${stats.revenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="blue"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6">
                {/* Yield Trend */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Monthly Yield Trend (Real Data)</h3>
                        <span className="text-xs text-gray-400">Past 6 months</span>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={yieldTrendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="yield" stroke="#16a34a" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    </div>
                    <div className="space-y-3">
                        {[
                            { action: 'Harvest completed', plot: 'Block A', time: '2 hours ago', type: 'success' },
                            { action: 'New task assigned', worker: 'Sunil Perera', time: '4 hours ago', type: 'info' },
                            { action: 'Fertilizer applied', plot: 'Block C', time: '6 hours ago', type: 'success' },
                            { action: 'Attendance marked', count: '45 workers', time: 'Today, 8:00 AM', type: 'info' },
                        ].map((activity, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className={`w-2 h-2 rounded-full mt-2 ${activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                                    }`} />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {activity.plot || activity.worker || activity.count} • {activity.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Alerts & Recommendations */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Alerts & Recommendations</h3>
                    </div>
                    <div className="space-y-3">
                        {[
                            ...inventory
                                .filter(item => item.currentStock <= (item.reorderLevel || 0))
                                .map(item => ({
                                    title: 'Low Inventory',
                                    message: `${item.name} is running low (${item.currentStock} ${item.unit} remaining)`,
                                    severity: 'error' as const,
                                })),
                        ].map((alert, i) => (
                            <div
                                key={i}
                                className={`p-3 rounded-lg border ${alert.severity === 'error'
                                    ? 'bg-red-50 border-red-200'
                                    : alert.severity === 'warning'
                                        ? 'bg-orange-50 border-orange-200'
                                        : alert.severity === 'success'
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-blue-50 border-blue-200'
                                    }`}
                            >
                                <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                                <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Mark Attendance', icon: Calendar, color: 'bg-blue-600', to: '/attendance' },
                        { label: 'Record Harvest', icon: Leaf, color: 'bg-green-600', to: '/harvest' },
                        { label: 'Manage Tasks', icon: FileText, color: 'bg-orange-600', to: '/tasks' },
                        { label: 'Financials', icon: DollarSign, color: 'bg-purple-600', to: '/financial' },
                    ].map((action, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(action.to)}
                            className={`${action.color} hover:opacity-90 text-white p-4 rounded-lg transition-all shadow-sm flex flex-col items-center justify-center gap-2 group`}
                        >
                            <action.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
