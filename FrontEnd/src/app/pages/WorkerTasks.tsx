import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { Building2, Loader2, CheckCircle2, Clock, ClipboardList } from 'lucide-react';

interface Plantation {
    id: number;
    name: string;
    location: string;
    workerId: number;
}

interface Task {
    id: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    taskDate: string;
    taskCategory: string;
    paymentAmount: number;
}

export function WorkerTasks() {
    const { user } = useUser();
    const { getToken } = useAuth();

    const [plantations, setPlantations] = useState<Plantation[]>([]);
    const [selectedPlantation, setSelectedPlantation] = useState<number | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdatingTask, setIsUpdatingTask] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    useEffect(() => {
        fetchPlantations();
    }, []);

    useEffect(() => {
        if (selectedPlantation) {
            fetchTasks();
        }
    }, [selectedPlantation]);

    const fetchPlantations = async () => {
        try {
            const token = await getToken();
            const clerkId = user?.id;
            if (!clerkId) return;

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

    const fetchTasks = async () => {
        if (!selectedPlantation) return;

        setLoading(true);
        try {
            const token = await getToken();
            const clerkId = user?.id;
            if (!clerkId) return;

            const data = await api.getWorkerTasks(selectedPlantation, clerkId, token || undefined);
            setTasks(data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTask = async (taskId: number) => {
        setIsUpdatingTask(true);
        try {
            const token = await getToken();
            const clerkId = user?.id;
            if (!clerkId) return;

            await api.updateWorkerTaskStatus(taskId, clerkId, 'COMPLETED', token || undefined);
            await fetchTasks();
        } catch (error) {
            console.error('Failed to update task:', error);
            alert('Failed to update task status');
        } finally {
            setIsUpdatingTask(false);
        }
    };

    const filteredTasks = filterStatus === 'ALL'
        ? tasks
        : tasks.filter(t => t.status === filterStatus);

    const pendingTasks = tasks.filter(t => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                    <p className="text-gray-600 mt-1">Manage your assigned tasks</p>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Pending Tasks</h3>
                        <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{pendingTasks}</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Completed Tasks</h3>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Total Tasks</h3>
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                {['ALL', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === status
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Tasks List */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">My Tasks</h2>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <p className="text-center text-gray-500 py-12">No tasks found</p>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map((task) => (
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
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${task.status === 'COMPLETED'
                                                        ? 'bg-green-100 text-green-700'
                                                        : task.status === 'IN_PROGRESS'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                {task.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        {task.description && (
                                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <span>
                                                <span className="font-medium">Date:</span> {new Date(task.taskDate).toLocaleDateString()}
                                            </span>
                                            {task.taskCategory && (
                                                <span>
                                                    <span className="font-medium">Category:</span> {task.taskCategory}
                                                </span>
                                            )}
                                            {task.paymentAmount > 0 && (
                                                <span className="text-green-600 font-medium">
                                                    LKR {task.paymentAmount.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
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
                                                <>
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Mark Complete
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
