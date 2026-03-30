import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Clock, Plus, Calendar, User, MapPin, Edit2, Trash2, Settings2, Filter, ArrowUpDown } from 'lucide-react';
import { useAuth, useUser } from "@clerk/clerk-react";
import { api } from '@/lib/api';

interface Task {
    id: number;
    title: string;
    description: string;
    status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    createdAt: string;
    assignedWorker: {
        id: number;
        user?: { name: string };
    } | null;
    plotId: string;
    taskCategory: string;
    paymentAmount?: number;
    taskDate: string;
}

export function TasksPage() {
    const { user } = useUser();
    const { isLoaded, getToken } = useAuth();

    const userRole = user?.publicMetadata?.role as 'owner' | 'clerk' | 'worker' | undefined;
    const plantationId = user?.publicMetadata?.plantationId as string | undefined;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [blockFilter, setBlockFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('date-desc');

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [workers, setWorkers] = useState<any[]>([]);
    const [plots, setPlots] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [assignFormData, setAssignFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        workerId: '',
        plotId: '',
        taskCategory: '',
        taskDate: new Date().toISOString().split('T')[0]
    });

    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Dynamic Task Rates State
    const [taskRates, setTaskRates] = useState<any[]>([]);
    const [showRateModal, setShowRateModal] = useState(false);
    const [editingRate, setEditingRate] = useState<any | null>(null);
    const [rateFormData, setRateFormData] = useState({
        category: '',
        rate: '',
        unit: 'PER_PROCESS',
        description: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const [taskData, workerData, plotData, rateData] = await Promise.all([
                api.getTasks(selectedMonth, plantationId, token || undefined),
                api.getWorkers(plantationId, token || undefined),
                api.getPlots(plantationId, token || undefined).catch(() => []),
                api.getTaskRates(token || undefined)
            ]);
            setTasks(taskData);
            setWorkers(workerData);
            setPlots(plotData);
            setTaskRates(rateData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isLoaded) {
            fetchData();
        }
    }, [selectedMonth, isLoaded]);

    const handleAssignTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!e.currentTarget.reportValidity()) return;
        
        if (!assignFormData.workerId || !assignFormData.taskCategory) {
            alert('Please select a worker and a task category');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await getToken();
            if (editingTask) {
                await api.updateTask(editingTask.id, {
                    ...assignFormData,
                    workerId: parseInt(assignFormData.workerId)
                }, token || undefined);
                alert('Task updated successfully!');
            } else {
                await api.createTask({
                    ...assignFormData,
                    workerId: parseInt(assignFormData.workerId),
                    plantationId: plantationId ? parseInt(plantationId) : null
                }, token || undefined);
                alert('Task assigned successfully!');
            }
            setShowAssignModal(false);
            setEditingTask(null);
            setAssignFormData({
                title: '',
                description: '',
                priority: 'MEDIUM',
                workerId: '',
                plotId: '',
                taskCategory: '',
                taskDate: new Date().toISOString().split('T')[0]
            });
            fetchData();
        } catch (error: any) {
            console.error('Failed to save task:', error);
            const errorMessage = error.message || (typeof error === 'string' ? error : 'Unknown error');
            alert(`Failed to save task: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            const token = await getToken();
            await api.deleteTask(taskId, token || undefined);
            fetchData();
        } catch (error) {
            console.error('Failed to delete task:', error);
            alert(error instanceof Error ? error.message : 'Failed to delete task');
        }
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setAssignFormData({
            title: task.title,
            description: task.description,
            priority: task.priority,
            workerId: task.assignedWorker?.id.toString() || '',
            plotId: task.plotId || '',
            taskCategory: task.taskCategory || '',
            taskDate: task.taskDate || new Date().toISOString().split('T')[0]
        });
        setShowAssignModal(true);
    };

    const handleUpdateStatus = async (taskId: number, newStatus: string) => {
        try {
            const token = await getToken();
            await api.updateTaskStatus(taskId, newStatus, token || undefined);
            fetchData();
        } catch (error) {
            console.error('Failed to update task status:', error);
            alert('Failed to update status');
        }
    };

    const filteredTasks = useMemo(() => {
        let result = tasks.filter((task) => {
            const matchesSearch =
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.assignedWorker?.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
            const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
            const matchesBlock = blockFilter === 'ALL' || task.plotId === blockFilter;

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
    }, [tasks, searchTerm, statusFilter, priorityFilter, blockFilter, sortBy]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'CANCELLED':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'HIGH':
                return 'text-red-600 bg-red-50';
            case 'MEDIUM':
                return 'text-orange-600 bg-orange-50';
            default:
                return 'text-blue-600 bg-blue-50';
        }
    };

    const handleSaveRate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!e.currentTarget.reportValidity()) return;

        setIsSubmitting(true);
        try {
            const token = await getToken();
            const payload = {
                ...rateFormData,
                rate: parseFloat(rateFormData.rate)
            };

            if (editingRate) {
                await api.updateTaskRate(editingRate.id, payload, token || undefined);
            } else {
                await api.createTaskRate(payload, token || undefined);
            }

            setShowRateModal(false);
            setEditingRate(null);
            setRateFormData({
                category: '',
                rate: '',
                unit: 'PER_PROCESS',
                description: ''
            });
            fetchData();
        } catch (error) {
            console.error('Failed to save rate:', error);
            alert('Failed to save task type');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRate = async (id: number) => {
        if (!confirm('Are you sure you want to delete this task type? This might affect existing task records.')) return;
        try {
            const token = await getToken();
            await api.deleteTaskRate(id, token || undefined);
            fetchData();
        } catch (error) {
            console.error('Failed to delete rate:', error);
            alert('Failed to delete task type');
        }
    };

    if (loading || !isLoaded) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 text-left">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium text-gray-600">Period:</p>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-2 py-0.5 border border-gray-300 rounded text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                </div>
                {(userRole === 'owner' || userRole === 'clerk') && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setEditingRate(null);
                                setRateFormData({
                                    category: '',
                                    rate: '',
                                    unit: 'PER_PROCESS',
                                    description: ''
                                });
                                setShowRateModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <Settings2 className="w-5 h-5" />
                            Manage Task Types
                        </button>
                        <button
                            onClick={() => setShowAssignModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Assign Task
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search tasks, descriptions or workers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ASSIGNED">Assigned</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="ALL">All Priorities</option>
                            <option value="HIGH">High Priority</option>
                            <option value="MEDIUM">Medium Priority</option>
                            <option value="LOW">Low Priority</option>
                        </select>
                        <select
                            value={blockFilter}
                            onChange={(e) => setBlockFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="ALL">All Blocks</option>
                            {plots.map(p => (
                                <option key={p.id} value={p.blockId}>{p.blockId}</option>
                            ))}
                        </select>
                        <div className="h-8 w-px bg-gray-200 hidden md:block" />
                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="w-4 h-4 text-gray-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                <option value="date-desc">Newest First</option>
                                <option value="date-asc">Oldest First</option>
                                <option value="priority-high">Priority High-Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                {(searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || blockFilter !== 'ALL') && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <p className="text-xs text-gray-500">
                            Found <span className="font-bold text-green-600">{filteredTasks.length}</span> results
                        </p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('ALL');
                                setPriorityFilter('ALL');
                                setBlockFilter('ALL');
                            }}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredTasks.map((task) => (
                    <div key={task.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                        <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(task.status)}`}>
                                    {task.status.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${getPriorityStyle(task.priority)}`}>
                                    {task.priority} PRIORITY
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-2">{task.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="font-semibold">{new Date(task.taskDate).toLocaleDateString()}</span>
                            </div>

                            <div className="space-y-2 mt-auto">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <User className="w-3.5 h-3.5" />
                                    <span className="font-medium text-gray-700">
                                        {task.assignedWorker?.user?.name || 'Unassigned'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="font-medium text-gray-700">
                                        {task.plotId || 'General'}
                                    </span>
                                </div>
                                {task.taskCategory && (
                                    <div className="flex items-center gap-2 text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">
                                        {task.taskCategory}
                                        {task.paymentAmount && (
                                            <span className="ml-auto text-green-700">LKR {task.paymentAmount.toLocaleString()}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 mt-4 border-l-4 border-green-500/20 text-left">
                                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed break-words">
                                    {task.description || "No description provided."}
                                </p>
                            </div>
                        </div>

                        <div className="px-5 py-2 flex justify-end gap-2 border-t border-gray-50">
                            {userRole !== 'worker' && (
                                <button
                                    onClick={() => openEditModal(task)}
                                    className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    EDIT
                                </button>
                            )}
                            {(task.status === 'ASSIGNED' || userRole === 'owner' || userRole === 'clerk') && (
                                <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1 px-2 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    DELETE
                                </button>
                            )}
                        </div>

                        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between gap-2">
                            <select
                                className="text-xs font-semibold bg-white border border-gray-200 rounded px-2 py-1 outline-none"
                                value={task.status}
                                onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                            >
                                <option value="ASSIGNED">Assigned</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <button
                                onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                                disabled={task.status === 'COMPLETED'}
                                className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 px-3 py-1 rounded transition-colors"
                            >
                                Mark Done
                            </button>
                        </div>
                    </div>
                ))}

                {filteredTasks.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No tasks found matching your filters.</p>
                    </div>
                )}
            </div>

            {/* Assign Task Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 text-left">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-50">
                            <h2 className="text-xl font-bold text-green-900">{editingTask ? 'Edit Task' : 'Assign New Task'}</h2>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setEditingTask(null);
                                    setAssignFormData({
                                        title: '',
                                        description: '',
                                        priority: 'MEDIUM',
                                        workerId: '',
                                        plotId: '',
                                        taskCategory: '',
                                        taskDate: new Date().toISOString().split('T')[0]
                                    });
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                disabled={isSubmitting}
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleAssignTask} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">Worker *</label>
                                <select
                                    required
                                    value={assignFormData.workerId}
                                    onChange={(e) => setAssignFormData({ ...assignFormData, workerId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                >
                                    <option value="">Select Worker</option>
                                    {workers.filter(w => {
                                        const functions = w.workerFunctions || '';
                                        const FIXED_SALARY_ROLES = ['Clerk', 'Supervisor', 'Driver', 'Maintenance', 'Security', 'Other'];
                                        return !FIXED_SALARY_ROLES.some(role => functions.includes(role));
                                    }).map(w => (
                                        <option key={w.id} value={w.id}>{w.user?.name || 'Unnamed Worker'}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">Task Title *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Pruning Block A"
                                    maxLength={50}
                                    pattern="^[A-Za-z0-9 \-]+$"
                                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Title can only contain letters, numbers, and hyphens.')}
                                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                                    value={assignFormData.title}
                                    onChange={(e) => setAssignFormData({ ...assignFormData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">Task Category *</label>
                                <select
                                    required
                                    value={assignFormData.taskCategory}
                                    onChange={(e) => setAssignFormData({ ...assignFormData, taskCategory: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                >
                                    <option value="">Select Category</option>
                                    {taskRates.map(rate => (
                                        <option key={rate.id} value={rate.category}>{rate.category} (LKR {rate.rate})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">Task Date *</label>
                                <input
                                    required
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={assignFormData.taskDate}
                                    onChange={(e) => setAssignFormData({ ...assignFormData, taskDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">Description</label>
                                <textarea
                                    maxLength={200}
                                    value={assignFormData.description}
                                    onChange={(e) => setAssignFormData({ ...assignFormData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none h-32 resize-none"
                                    placeholder="Add detailed instructions for the worker..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">Priority</label>
                                    <select
                                        value={assignFormData.priority}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, priority: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">Plot / Block *</label>
                                    <select
                                        required
                                        value={assignFormData.plotId}
                                        onChange={(e) => setAssignFormData({ ...assignFormData, plotId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    >
                                        <option value="">Select Plot / Block</option>
                                        {plots.map(plot => (
                                            <option key={plot.id} value={plot.blockId}>{plot.blockId}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {editingTask ? 'Updating...' : 'Assigning...'}
                                        </>
                                    ) : (
                                        editingTask ? 'Update Task' : 'Assign Task'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Task Types Modal */}
            {showRateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
                            <h2 className="text-xl font-bold text-blue-900">Manage Task Types & Rates</h2>
                            <button
                                onClick={() => setShowRateModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Form Side */}
                            <form onSubmit={handleSaveRate} className="space-y-4">
                                <h3 className="font-bold text-gray-900 text-sm text-left">{editingRate ? 'Edit Task Type' : 'Add New Task Type'}</h3>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 text-left">Task Name (Category) *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. PRUNING"
                                        maxLength={20}
                                        pattern="^[A-Za-z0-9 ]+$"
                                        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Task Name can only contain letters and numbers, max length 20.')}
                                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                                        value={rateFormData.category}
                                        onChange={(e) => setRateFormData({ ...rateFormData, category: e.target.value.toUpperCase() })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1 text-left">Rate (LKR) *</label>
                                        <input
                                            required
                                            type="number"
                                            placeholder="e.g. 50"
                                            min="0"
                                            onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Rate must be a positive number.')}
                                            onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                                            value={rateFormData.rate}
                                            onChange={(e) => setRateFormData({ ...rateFormData, rate: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1 text-left">Unit</label>
                                        <select
                                            value={rateFormData.unit}
                                            onChange={(e) => setRateFormData({ ...rateFormData, unit: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="PER_KG">Per KG</option>
                                            <option value="PER_PROCESS">Per Process</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 text-left">Details (Description)</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Add task details..."
                                        maxLength={100}
                                        value={rateFormData.description}
                                        onChange={(e) => setRateFormData({ ...rateFormData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                                    >
                                        {isSubmitting ? 'Saving...' : (editingRate ? 'Update Type' : 'Create Type')}
                                    </button>
                                    {editingRate && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingRate(null);
                                                setRateFormData({ category: '', rate: '', unit: 'PER_PROCESS', description: '' });
                                            }}
                                            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>

                            {/* List Side */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 text-sm text-left">Existing Task Types</h3>
                                <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-[300px]">
                                    {taskRates.map(rate => (
                                        <div key={rate.id} className="p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
                                            <div className="flex justify-between items-start">
                                                <div className="text-left">
                                                    <p className="font-bold text-sm text-gray-900">{rate.category}</p>
                                                    <p className="text-xs text-green-700 font-bold">LKR {rate.rate} / {rate.unit.replace('PER_', '')}</p>
                                                    {rate.description && <p className="text-[10px] text-gray-500 mt-1">{rate.description}</p>}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingRate(rate);
                                                            setRateFormData({
                                                                category: rate.category,
                                                                rate: rate.rate.toString(),
                                                                unit: rate.unit,
                                                                description: rate.description || ''
                                                            });
                                                        }}
                                                        className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded text-[10px] font-bold"
                                                    >
                                                        EDIT
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRate(rate.id)}
                                                        className="p-1 px-2 text-red-600 hover:bg-red-50 rounded text-[10px] font-bold"
                                                    >
                                                        DELETE
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {taskRates.length === 0 && (
                                        <div className="p-8 text-center text-gray-400 text-sm">
                                            No task types defined yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
