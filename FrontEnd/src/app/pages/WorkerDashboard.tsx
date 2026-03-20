import { useState, useEffect } from 'react';
import { StatCard } from '@/app/components/StatCard';
import { CheckCircle2, Clock, Scale, Calendar, Loader2, Building2, QrCode, X } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

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
    qrCode?: string;
    workerId?: number;
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
    const [showQrModal, setShowQrModal] = useState(false);
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);

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

                <button
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg font-bold transition-colors"
                >
                    <QrCode className="w-5 h-5" />
                    My QR Code
                </button>
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
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Date:</span> {new Date(task.taskDate).toLocaleDateString()}
                                        </p>

                                        {task.description && (
                                            <div className="bg-gray-50 rounded-lg p-3 mt-4 border-l-4 border-green-500/20 text-left">
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

            {/* QR Code Modal */}
            {showQrModal && dashboardData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50">
                            <h2 className="text-xl font-bold text-orange-900 flex items-center gap-2">
                                <QrCode className="w-6 h-6" />
                                My Attendance QR
                            </h2>
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 flex flex-col items-center gap-6">
                            {dashboardData.qrCode ? (
                                <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-100">
                                    <QRCodeSVG
                                        id="worker-qr"
                                        value={dashboardData.qrCode}
                                        size={200}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                        <QrCode className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <p className="text-gray-600 text-sm">You don't have a QR code assigned yet.</p>
                                    <button
                                        onClick={async () => {
                                            if (!dashboardData.workerId) return;
                                            setIsGeneratingQr(true);
                                            try {
                                                const token = await getToken();
                                                const updatedWorker = await api.generateWorkerQr(dashboardData.workerId, token || undefined);
                                                setDashboardData({ ...dashboardData, qrCode: updatedWorker.qrCode });
                                                toast.success('QR Code generated successfully!');
                                            } catch (error) {
                                                toast.error('Failed to generate QR code');
                                            } finally {
                                                setIsGeneratingQr(false);
                                            }
                                        }}
                                        disabled={isGeneratingQr}
                                        className="px-6 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
                                    >
                                        {isGeneratingQr ? 'Generating...' : 'Generate My QR Code'}
                                    </button>
                                </div>
                            )}
                            {dashboardData.qrCode && (
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 mb-4">Show this QR code to marked attendance</p>
                                    <button
                                        onClick={() => {
                                            const svg = document.getElementById('worker-qr');
                                            if (!svg) {
                                                toast.error("Could not find QR code element");
                                                return;
                                            }

                                            const canvas = document.createElement("canvas");
                                            const ctx = canvas.getContext("2d");
                                            if (!ctx) return;

                                            const svgData = new XMLSerializer().serializeToString(svg);
                                            const img = new Image();
                                            const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
                                            const url = URL.createObjectURL(svgBlob);

                                            img.onload = () => {
                                                // High resolution scaling
                                                const scale = 4;
                                                // QRCodeSVG uses width/height attributes if provided
                                                const baseWidth = (svg as any).width?.baseVal?.value || 200;
                                                const baseHeight = (svg as any).height?.baseVal?.value || 200;
                                                
                                                canvas.width = baseWidth * scale;
                                                canvas.height = baseHeight * scale;
                                                
                                                ctx.fillStyle = "white"; // White background for reliability
                                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                                
                                                const pngUrl = canvas.toDataURL("image/png");
                                                const downloadLink = document.createElement("a");
                                                downloadLink.href = pngUrl;
                                                downloadLink.download = `QR-${user?.firstName || 'Worker'}.png`;
                                                document.body.appendChild(downloadLink);
                                                downloadLink.click();
                                                document.body.removeChild(downloadLink);
                                                URL.revokeObjectURL(url);
                                                toast.success("QR Code downloaded as PNG");
                                            };
                                            
                                            img.onerror = () => {
                                                toast.error("Failed to convert QR code to PNG");
                                                URL.revokeObjectURL(url);
                                            };
                                            
                                            img.src = url;
                                        }}
                                        className="text-orange-600 font-bold hover:underline"
                                    >
                                        Download QR (PNG)
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="px-8 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
