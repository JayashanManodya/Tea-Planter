import { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { Building2, Loader2, CheckCircle2, Clock, ClipboardList, Search, Filter, ArrowUpDown } from 'lucide-react';

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
    const [plots, setPlots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdatingTask, setIsUpdatingTask] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [blockFilter, setBlockFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('date-desc');

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

            const [taskData, plotData] = await Promise.all([
                api.getWorkerTasks(selectedPlantation, clerkId, token || undefined),
                api.getPlots(selectedPlantation, token || undefined).catch(() => [])
            ]);
            setTasks(taskData);
            setPlots(plotData);
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

    const filteredTasks = useMemo(() => {
        let result = tasks.filter((task) => {
            const matchesSearch =
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                task.description.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = filterStatus === 'ALL' || task.status === filterStatus;
            const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
            const matchesBlock = blockFilter === 'ALL' || (task as any).plotId === blockFilter;

            return matchesSearch && matchesStatus && matchesPriority && matchesBlock;
        });

        result.sort((a, b) => {
            if (sortBy === 'date-desc') return new Date(b.taskDate).getTime() - new Date(a.taskDate).getTime();
            if (sortBy === 'date-asc') return new Date(a.taskDate).getTime() - new Date(b.taskDate).getTime();
            if (sortBy === 'priority-high') {
                const pMap: any = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                return pMap[b.priority] - pMap[a.priority];
            }
            return 0;
        });

        return result;
    }, [tasks, searchTerm, filterStatus, priorityFilter, blockFilter, sortBy]);

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

            {/* Filters Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex flex-col md:flex-row shadow-sm gap-4">
                    <div className="flex-1 relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search my tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {['ALL', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${filterStatus === status
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                {status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="ALL">All Priorities</option>
                            <option value="HIGH">High Priority</option>
                            <option value="MEDIUM">Medium Priority</option>
                            <option value="LOW">Low Priority</option>
                        </select>
                    </div>
                    <select
                        value={blockFilter}
                        onChange={(e) => setBlockFilter(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                    >
                        <option value="ALL">All Blocks</option>
                        {plots.map(p => (
                            <option key={p.id} value={p.blockId}>{p.blockId}</option>
                        ))}
                    </select>
                    <div className="h-6 w-px bg-gray-200 hidden md:block mx-1" />
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                            <option value="priority-high">Priority High-Low</option>
                        </select>
                    </div>
                    {(searchTerm || filterStatus !== 'ALL' || priorityFilter !== 'ALL' || blockFilter !== 'ALL') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterStatus('ALL');
                                setPriorityFilter('ALL');
                                setBlockFilter('ALL');
                            }}
                            className="ml-auto text-xs font-medium text-red-600 hover:text-red-700"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
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
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <span>
                                                <span className="font-medium">Date:</span> {new Date(task.taskDate).toLocaleDateString()}
                                            </span>
                                            {task.taskCategory && (
                                                <span>
                                                    <span className="font-medium">Block:</span> {task.taskCategory}
                                                </span>
                                            )}
                                            {task.paymentAmount > 0 && (
                                                <span className="text-green-600 font-medium">
                                                    LKR {task.paymentAmount.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {task.description && (
                                            <div className="bg-gray-50 rounded-lg p-3 mt-4 border-l-4 border-green-500/20 text-left max-w-3xl">
                                                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed break-words">
                                                    {task.description}
                                                </p>
                                            </div>
                                        )}
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
