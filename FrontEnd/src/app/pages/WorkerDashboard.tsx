import { useState, useEffect } from 'react';
import { StatCard } from '@/app/components/StatCard';
import { CheckCircle2, Clock, Scale, Calendar, Loader2, Building2 } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';

interface Plantation {
    id: number;
    name: string;
    location: string;
    workerId: number;
}

interface DashboardData {
    plantationId: number;
    plantationName: string;
    pendingTasks: number;
    completedTasks: number;
    totalHarvestWeight: number;
    monthlyEarnings: number;
    attendanceDays: number;
}

interface Task {
    id: number;
    title: string;
    priority: string;
    status: string;
    taskDate: string;
    description: string;
}

interface Harvest {
    id: number;
    harvestDate: string;
    netWeight: number;
    plot?: { blockId: string };
}

export function WorkerDashboard() {
    const { user } = useUser();
    const { getToken } = useAuth();

    const [plantations, setPlantations] = useState<Plantation[]>([]);
    const [selectedPlantation, setSelectedPlantation] = useState<number | null>(null);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [harvests, setHarvests] = useState<Harvest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdatingTask, setIsUpdatingTask] = useState(false);

    useEffect(() => {
        fetchPlantations();
    }, []);

    useEffect(() => {
        if (selectedPlantation) {
            fetchDashboardData();
        }
    }, [selectedPlantation]);

    const fetchPlantations = async () => {
        try {
            const token = await getToken();
            const clerkId = user?.id;
            if (!clerkId) {
                console.error('No Clerk ID found');
                return;
            }
            const data = await api.getWorkerPlantations(clerkId, token || undefined);
            setPlantations(data);
            if (data.length > 0) {
                setSelectedPlantation(data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch plantations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboardData = async () => {
        if (!selectedPlantation) return;

        setLoading(true);
        try {
            const token = await getToken();
            const clerkId = user?.id;
            if (!clerkId) {
                console.error('No Clerk ID found');
                return;
            }
            const currentMonth = new Date().toISOString().slice(0, 7);

            const [dashboard, tasksData, harvestsData] = await Promise.all([
                api.getWorkerDashboard(selectedPlantation, clerkId, token || undefined),
                api.getWorkerTasks(selectedPlantation, clerkId, token || undefined),
                api.getWorkerHarvests(selectedPlantation, clerkId, currentMonth, token || undefined),
            ]);

            setDashboardData(dashboard);
            setTasks(tasksData);
            setHarvests(harvestsData);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTask = async (taskId: number) => {
        setIsUpdatingTask(true);
        try {
            const token = await getToken();
            const clerkId = user?.id;
            if (!clerkId) {
                console.error('No Clerk ID found');
                return;
            }
            await api.updateWorkerTaskStatus(taskId, clerkId, 'COMPLETED', token || undefined);
            await fetchDashboardData();
        } catch (error) {
            console.error('Failed to update task:', error);
            alert('Failed to update task status');
        } finally {
            setIsUpdatingTask(false);
        }
    };

    if (loading && plantations.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header with Plantation Selector */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600 mt-1">Welcome back, {user?.firstName || 'Worker'}</p>
                </div>

                {plantations.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <select
                            value={selectedPlantation || ''}
                            onChange={(e) => setSelectedPlantation(Number(e.target.value))}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-medium"
                        >
                            {plantations.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            {dashboardData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Pending Tasks"
                        value={dashboardData.pendingTasks}
                        icon={Clock}
                        color="orange"
                    />
                    <StatCard
                        title="Completed Tasks"
                        value={dashboardData.completedTasks}
                        icon={CheckCircle2}
                        color="green"
                    />
                    <StatCard
                        title="Total Harvest (This Month)"
                        value={`${dashboardData.totalHarvestWeight.toFixed(1)} kg`}
                        icon={Scale}
                        color="blue"
                    />
                    <StatCard
                        title="Monthly Earnings"
                        value={`LKR ${dashboardData.monthlyEarnings.toLocaleString()}`}
                        icon={Calendar}
                        color="purple"
                    />
                </div>
            )}

            {/* My Tasks */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">My Tasks</h2>
                <div className="space-y-3">
                    {tasks.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No tasks assigned</p>
                    ) : (
                        tasks.slice(0, 5).map((task) => (
                            <div
                                key={task.id}
                                className={`p-4 rounded-lg border ${task.status === 'COMPLETED'
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-white border-gray-200'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'HIGH'
                                                    ? 'bg-red-100 text-red-700'
                                                    : task.priority === 'MEDIUM'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                    }`}
                                            >
                                                {task.priority}
                                            </span>
                                            {task.status === 'COMPLETED' && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                    Completed
                                                </span>
                                            )}
                                        </div>
                                        {task.description && (
                                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                        )}
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Date:</span> {new Date(task.taskDate).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {(task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') && (
                                        <button
                                            onClick={() => handleCompleteTask(task.id)}
                                            disabled={isUpdatingTask}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            {isUpdatingTask ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : (
                                                'Mark Complete'
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* My Harvest Records */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">My Harvest Records (This Month)</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Date</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Block</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Weight (kg)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {harvests.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-8 text-gray-500">
                                        No harvest records for this month
                                    </td>
                                </tr>
                            ) : (
                                harvests.slice(0, 10).map((harvest) => (
                                    <tr key={harvest.id} className="border-b border-gray-100">
                                        <td className="py-3 px-4 text-sm text-gray-900">
                                            {new Date(harvest.harvestDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-900">
                                            {harvest.plot?.blockId || 'General'}
                                        </td>
                                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                            {harvest.netWeight.toFixed(1)} kg
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
