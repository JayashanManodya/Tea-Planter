import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Users, Mail, Phone, Calendar, Loader2, QrCode, Download } from 'lucide-react';
import { useUser, useAuth } from "@clerk/clerk-react";
import { api } from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface Worker {
  id: number;
  workerFunctions: string; // Comma-separated: Harvester, Pruner, etc.
  qrCode?: string;
  joinDate: string;
  assignedBlock: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  monthlyHarvest: number;
  user?: {
    id?: number;
    name: string;
    email: string;
    phone?: string;
    gender?: string;
    birthday?: string;
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    emergencyContact?: string;
    profileImageUrl?: string;
  };
}

export function WorkforcePage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    roles: [] as string[],
    assignedBlock: '',
    status: 'Active' as const,
    joinDate: new Date().toISOString().split('T')[0],
    workerPin: ''
  });

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterBlock, setFilterBlock] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('name');

  const [plots, setPlots] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'attendance' | 'harvest'>('info');
  const [history, setHistory] = useState({
    tasks: [] as any[],
    attendance: [] as any[],
    harvests: [] as any[],
    leaves: [] as any[]
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [modalRefreshing, setModalRefreshing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedWorkerForQr, setSelectedWorkerForQr] = useState<Worker | null>(null);

  const handleViewQr = async (worker: Worker) => {
    setSelectedWorkerForQr(worker);
    setShowQrModal(true);
    
    // If worker doesn't have a QR code, generate it
    if (!worker.qrCode) {
      try {
        const token = await getToken();
        const updatedWorker = await api.generateWorkerQr(worker.id, token || undefined);
        setSelectedWorkerForQr(updatedWorker);
        // Update the worker in the main list too
        setWorkers(prev => prev.map(w => w.id === updatedWorker.id ? updatedWorker : w));
      } catch (error) {
        console.error('Failed to generate QR code:', error);
        toast.error('Failed to generate QR code');
      }
    }
  };

  const downloadQr = () => {
    const svg = document.getElementById('worker-qr');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${selectedWorkerForQr?.user?.name || 'worker'}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const { user } = useUser();
  const { getToken } = useAuth();
  const plantationId = user?.publicMetadata?.plantationId as string | undefined;

  const fetchWorkers = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setModalRefreshing(true);
    setSyncError(null);
    try {
      const token = await getToken();
      const [workerData, userData, plotData] = await Promise.all([
        api.getWorkers(plantationId, token || undefined),
        api.getAvailableUsers(token || undefined),
        api.getPlots(plantationId, token || undefined).catch(() => [])
      ]);

      console.log('DEBUG: Workforce data fetched', { workers: workerData, availableUsers: userData });
      setWorkers(workerData);
      setAvailableUsers(userData);
      setPlots(plotData);
    } catch (error: any) {
      console.error('CRITICAL: Workforce fetch failed!', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error) || 'Unknown connection error';
      setSyncError(`Sync Error: ${errorMessage}`);
    } finally {
      if (isInitial) setLoading(false);
      setModalRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkers(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (editingWorker) {
        // Build a lean payload to avoid accidental relationship overwriting (fixes Unnamed Worker issue)
        const submissionData = {
          workerFunctions: formData.roles.join(', '),
          assignedBlock: formData.assignedBlock,
          status: formData.status,
          joinDate: formData.joinDate
        };
        await api.updateWorker(editingWorker.id, submissionData, token || undefined);
      } else {
        // Find if this is a registration for an existing user
        if (formData.userId) {
          // If userId exists, it means we are assigning from registered users
          await api.assignWorker(
            parseInt(formData.userId),
            formData.roles.join(', ') || 'Worker',
            plantationId ? parseInt(plantationId) : 1,
            formData.workerPin,
            formData.assignedBlock,
            token || undefined
          );
        } else {
          // Fallback to old behavior or handle direct add
          console.warn('Direct Add Worker not fully implemented with Auth yet');
        }
      }
      fetchWorkers();
      setShowModal(false);
      setUserSearchTerm('');
      fetchWorkers();
    } catch (error: any) {
      console.error('Failed to save worker:', error);

      // Show specific error messages
      const errorMessage = error?.message || 'Failed to save worker.';

      if (errorMessage.includes('security PIN')) {
        alert('❌ Worker Assignment Failed\n\n' +
          'The selected worker has not set their security PIN yet.\n\n' +
          '📝 Next Steps:\n' +
          '1. Ask the worker to log in to their account\n' +
          '2. Go to Settings page\n' +
          '3. Set a 6-digit security PIN\n' +
          '4. Try assigning them again');
      } else if (errorMessage.includes('already assigned')) {
        alert('❌ Worker Assignment Failed\n\n' +
          'This worker is already assigned to this plantation.');
      } else if (errorMessage.includes('PIN')) {
        alert('❌ Worker Assignment Failed\n\n' +
          'Invalid PIN. Please check the PIN and try again.');
      } else {
        alert('❌ Failed to save worker\n\n' + errorMessage);
      }
    } finally {
      setIsSubmitting(false);

    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      userId: worker.user?.id?.toString() || '',
      roles: worker.workerFunctions ? worker.workerFunctions.split(', ') : [],
      assignedBlock: worker.assignedBlock || '',
      status: worker.status,
      joinDate: worker.joinDate,
      workerPin: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this worker record?')) return;
    try {
      const token = await getToken();
      await api.deleteWorker(id, token || undefined);
      fetchWorkers();
    } catch (error) {
      console.error('Failed to delete worker:', error);
      alert('Failed to delete worker.');
    }
  };

  const handleViewDetails = async (worker: Worker) => {
    setSelectedWorker(worker);
    setShowDetailsModal(true);
    setLoadingHistory(true);
    setActiveTab('info');
    try {
      const token = await getToken();
      const [tasks, attendance, harvests, leaves] = await Promise.all([
        api.getTasksByWorker(worker.id, token || undefined).catch(() => []),
        api.getAttendanceByWorker(worker.id, token || undefined).catch(() => []),
        api.getHarvestsByWorker(worker.id, token || undefined).catch(() => []),
        api.getLeavesByWorker(worker.id, token || undefined).catch(() => [])
      ]);
      setHistory({ tasks, attendance, harvests, leaves });
    } catch (error) {
      console.error('Failed to fetch worker history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredWorkers = useMemo(() => {
    let result = workers.filter((worker) => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch =
        (worker.user?.name || '').toLowerCase().includes(searchStr) ||
        (worker.user?.email || '').toLowerCase().includes(searchStr) ||
        (worker.workerFunctions || '').toLowerCase().includes(searchStr) ||
        (worker.assignedBlock || '').toLowerCase().includes(searchStr);

      const matchesStatus = filterStatus === 'ALL' || worker.status === filterStatus;
      
      // Robust Role Filtering (case-insensitive and handles multiple roles)
      const workerRoles = (worker.workerFunctions || '').toLowerCase();
      const targetRole = filterRole.toLowerCase();
      const matchesRole = filterRole === 'ALL' || workerRoles.includes(targetRole);
      
      const matchesBlock = filterBlock === 'ALL' || worker.assignedBlock === filterBlock;

      return matchesSearch && matchesStatus && matchesRole && matchesBlock;
    });

    // Apply Sorting
    return [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return (a.user?.name || '').localeCompare(b.user?.name || '');
      }
      if (sortBy === 'joinDate') {
        return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
      }
      if (sortBy === 'yield') {
        return (b.monthlyHarvest || 0) - (a.monthlyHarvest || 0);
      }
      return 0;
    });
  }, [workers, searchTerm, filterStatus, filterRole, filterBlock, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workforce Management</h1>
          <p className="text-gray-600 mt-1">Manage workers and task assignments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchWorkers();
              setUserSearchTerm('');
              setShowUserSearchModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
          >
            <Search className="w-5 h-5" />
            Search Registered Users
          </button>
          <button
            onClick={() => {
              setEditingWorker(null);
              setFormData({
                userId: '',
                roles: [] as string[],
                assignedBlock: '',
                status: 'Active',
                joinDate: new Date().toISOString().split('T')[0],
                workerPin: ''
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Worker
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Roles</option>
              {['Harvester', 'Pruner', 'Supervisor', 'Driver', 'Maintenance', 'Field Worker', 'Security'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              value={filterBlock}
              onChange={(e) => setFilterBlock(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Blocks</option>
              {Array.from(new Set(workers.map(w => w.assignedBlock).filter(Boolean))).map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 border-l pl-2 ml-2 border-gray-200">
              <span className="text-sm text-gray-500 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="name">Name (A-Z)</option>
                <option value="joinDate">Join Date (Newest)</option>
                <option value="yield">Monthly Yield</option>
              </select>
            </div>
          </div>
        </div>
        {(searchTerm || filterStatus !== 'ALL' || filterRole !== 'ALL' || filterBlock !== 'ALL') && (
          <div className="flex justify-end pt-2 border-t border-gray-50">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
                setFilterRole('ALL');
                setFilterBlock('ALL');
              }}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Workers</p>
          <p className="text-2xl font-bold text-gray-900">{workers.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{workers.filter(w => w.status === 'Active').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">On Leave</p>
          <p className="text-2xl font-bold text-orange-600">{workers.filter(w => w.status === 'On Leave').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Avg Monthly Harvest</p>
          <p className="text-2xl font-bold text-gray-900">
            {workers.filter(w => w.monthlyHarvest > 0).length > 0
              ? (workers.reduce((s, w) => s + w.monthlyHarvest, 0) / workers.filter(w => w.monthlyHarvest > 0).length).toFixed(0)
              : 0} kg
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Worker</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Contact</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Role</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Assigned Block</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Monthly Harvest</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkers.map((worker) => (
              <tr key={worker.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleViewDetails(worker)}
                      className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold hover:bg-blue-200 transition-all overflow-hidden border-2 border-white shadow-md flex-shrink-0"
                    >
                      {worker.user?.profileImageUrl ? (
                        <img 
                          src={worker.user.profileImageUrl} 
                          alt={worker.user.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">{(worker.user?.name || 'W').charAt(0)}</span>
                      )}
                    </button>
                    <div>
                      <button
                        onClick={() => handleViewDetails(worker)}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                      >
                        {worker.user?.name || 'Unnamed Worker'}
                      </button>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {worker.joinDate}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {worker.user?.email || 'No email'}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {worker.user?.phone || 'No phone'}
                    </p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {worker.workerFunctions ? worker.workerFunctions.split(', ').map(r => (
                      <span key={r} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium border border-blue-100">
                        {r}
                      </span>
                    )) : '-'}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900">{worker.assignedBlock}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${worker.status === 'Active' ? 'bg-green-100 text-green-700' :
                    worker.status === 'On Leave' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                    {worker.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  {worker.monthlyHarvest > 0 ? `${worker.monthlyHarvest} kg` : '-'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewQr(worker)}
                      className="text-orange-600 hover:text-orange-700 text-sm font-medium mr-2 flex items-center gap-1"
                    >
                      <QrCode className="w-4 h-4" />
                      QR Code
                    </button>
                    <button
                      onClick={() => handleEdit(worker)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(worker.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium ml-2"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* User Search Modal */}
      {showUserSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
              <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Find Registered Members
              </h2>
              <div className="flex items-center gap-3">
                {modalRefreshing && (
                  <div className="flex items-center gap-2 text-blue-600 animate-pulse text-xs font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing from Clerk...
                  </div>
                )}
                <button
                  onClick={() => setShowUserSearchModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {syncError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center justify-between">
                  <span>{syncError}</span>
                  <button
                    onClick={() => fetchWorkers()}
                    className="underline font-semibold hover:text-red-800"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => fetchWorkers()}
                  disabled={modalRefreshing}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-colors"
                  title="Force Sync from Clerk"
                >
                  <Loader2 className={`w-4 h-4 ${modalRefreshing ? 'animate-spin' : ''}`} />
                  Sync
                </button>
              </div>

              <div className="max-h-[40vh] overflow-y-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-900 border-b">Member</th>
                      <th className="text-left p-3 font-semibold text-gray-900 border-b">Email</th>
                      <th className="text-right p-3 font-semibold text-gray-900 border-b">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableUsers
                      .filter(u =>
                        (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                      )
                      .map(u => (
                        <tr key={u.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-3 border-b font-medium text-gray-900">{u.name}</td>
                          <td className="p-3 border-b text-gray-600">{u.email}</td>
                          <td className="p-3 border-b text-right">
                            <button
                              onClick={() => {
                                setFormData({
                                  userId: u.id.toString(),
                                  roles: [] as string[],
                                  assignedBlock: '',
                                  status: 'Active',
                                  joinDate: new Date().toISOString().split('T')[0],
                                  workerPin: ''
                                });
                                setShowUserSearchModal(false);
                                setShowModal(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
                            >
                              Assign
                            </button>
                          </td>
                        </tr>
                      ))
                    }
                    {availableUsers.length === 0 && !modalRefreshing && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-gray-500">
                          {syncError ? 'Unable to load users.' : 'No registered members found. They must login to the app first.'}
                        </td>
                      </tr>
                    )}
                    {modalRefreshing && availableUsers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <p className="text-sm">Fetching users from your Clerk Dashboard...</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && selectedWorkerForQr && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50">
              <h2 className="text-xl font-bold text-orange-900 flex items-center gap-2">
                <QrCode className="w-6 h-6" />
                Worker QR Code
              </h2>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center gap-6">
              <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-100">
                {selectedWorkerForQr.qrCode ? (
                  <QRCodeSVG
                    id="worker-qr"
                    value={selectedWorkerForQr.qrCode}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900">{selectedWorkerForQr.user?.name}</h3>
                <p className="text-sm text-gray-500 font-mono mt-1">{selectedWorkerForQr.qrCode || 'Generating...'}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowQrModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={downloadQr}
                disabled={!selectedWorkerForQr.qrCode}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {
        showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
                <h2 className="text-xl font-bold text-blue-900">
                  {editingWorker ? 'Edit Worker Profile' : 'Register New Worker'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isSubmitting}
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {!editingWorker && (
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">Select Registered Member *</label>

                    {/* User Search Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search member by name or email..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <select
                      required
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select a member...</option>
                      {availableUsers
                        .filter(u =>
                          (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                        )
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-500">Only members who have logged in and are not yet assigned will appear here.</p>
                  </div>
                )}

                {/* PIN Field for Assignment */}
                {!editingWorker && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Target Worker's 6-Digit Security PIN *
                    </label>
                    <input
                      required={!editingWorker}
                      type="text"
                      maxLength={6}
                      placeholder="Enter the worker's security PIN"
                      value={formData.workerPin}
                      onChange={(e) => setFormData({ ...formData, workerPin: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      The worker must have set this PIN in their own Settings page and shared it with you.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Roles (Can select multiple) *</label>
                  <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {['Clerk', 'Harvester', 'Pruner', 'Supervisor', 'Driver', 'Maintenance', 'Field Worker', 'Security'].map(role => (
                      <label key={role} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.roles.includes(role)}
                          onChange={(e) => {
                            const newRoles = e.target.checked
                              ? [...formData.roles, role]
                              : formData.roles.filter(r => r !== role);
                            setFormData({ ...formData, roles: newRoles });
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-blue-700 transition-colors">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Assigned Block</label>
                    <select
                      value={formData.assignedBlock}
                      onChange={(e) => setFormData({ ...formData, assignedBlock: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Not Assigned</option>
                      {plots.map((plot) => (
                        <option key={plot.id} value={plot.blockId}>
                          {plot.blockId} ({plot.acreage} Acres)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Join Date</label>
                  <input
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingWorker ? 'Update Profile' : 'Register Worker'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
      )}

      {/* Worker Details Modal */}
      {
        showDetailsModal && selectedWorker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                    {selectedWorker.user?.profileImageUrl ? (
                      <img src={selectedWorker.user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-12 h-12 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-blue-900">{selectedWorker.user?.name}</h2>
                    <p className="text-xs text-blue-600 font-medium">{selectedWorker.workerFunctions}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-white/50 rounded-full transition-colors text-blue-400 hover:text-blue-600"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex border-b border-gray-100 bg-gray-50">
                {(['info', 'tasks', 'attendance', 'harvest'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 text-sm font-semibold transition-colors relative ${activeTab === tab
                      ? 'text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {activeTab === 'info' && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Contact Details</h3>
                      <div className="space-y-2">
                        <p className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {selectedWorker.user?.email || 'No email'}</p>
                        <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> {selectedWorker.user?.phone || 'No phone set'}</p>
                      </div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider pt-2">Personal Info</h3>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700"><span className="text-gray-500">Gender:</span> {selectedWorker.user?.gender || 'Not specified'}</p>
                        <p className="text-sm text-gray-700"><span className="text-gray-500">Birthday:</span> {selectedWorker.user?.birthday || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Employment</h3>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700"><span className="text-gray-500">Status:</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedWorker.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>{selectedWorker.status}</span>
                        </p>
                        <p className="text-sm text-gray-700"><span className="text-gray-500">Assigned Block:</span> {selectedWorker.assignedBlock || 'General'}</p>
                        <p className="text-sm text-gray-700"><span className="text-gray-500">Join Date:</span> {selectedWorker.joinDate}</p>
                      </div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider pt-2">Emergency Contact</h3>
                      <p className="text-sm text-gray-700">{selectedWorker.user?.emergencyContact || 'None provided'}</p>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider pt-2">Bank Info</h3>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2">
                        <p className="text-xs text-gray-700">
                          <span className="font-bold text-gray-400 uppercase tracking-tighter mr-2">Bank:</span>
                          {selectedWorker.user?.bankName || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-700">
                          <span className="font-bold text-gray-400 uppercase tracking-tighter mr-2">Branch:</span>
                          {selectedWorker.user?.branchName || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-700">
                          <span className="font-bold text-gray-400 uppercase tracking-tighter mr-2">A/C No:</span>
                          <span className="font-mono text-blue-700">{selectedWorker.user?.accountNumber || 'N/A'}</span>
                        </p>
                        <p className="text-xs text-gray-700">
                          <span className="font-bold text-gray-400 uppercase tracking-tighter mr-2">Holder:</span>
                          {selectedWorker.user?.accountHolderName || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'tasks' && (
                  <div className="space-y-3">
                    {loadingHistory ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                    ) : history.tasks.length > 0 ? (
                      history.tasks.map((task: any) => (
                        <div key={task.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-900">{task.title}</p>
                            <p className="text-xs text-gray-500">{task.description}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>{task.status}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-sm text-gray-500">No task history found.</p>
                    )}
                  </div>
                )}

                {activeTab === 'attendance' && (
                  <div className="space-y-3">
                    {loadingHistory ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                    ) : history.attendance.length > 0 ? (
                      history.attendance.map((record: any) => (
                        <div key={record.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(record.checkIn).toLocaleDateString()}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {new Date(record.checkIn).toLocaleTimeString()} - {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'Current'}
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold">{record.status}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-sm text-gray-500">No attendance records found.</p>
                    )}
                  </div>
                )}

                {activeTab === 'harvest' && (
                  <div className="space-y-3">
                    {loadingHistory ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                    ) : history.harvests.length > 0 ? (
                      history.harvests.map((h: any) => (
                        <div key={h.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{new Date(h.harvestDate).toLocaleDateString()}</p>
                            <p className="text-[10px] text-gray-500">Plot: {h.plot?.blockId || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 text-sm">{h.netWeight} kg</p>
                            <p className="text-[10px] text-gray-500">Net Weight</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-sm text-gray-500">No harvest records found.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
