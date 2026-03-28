import { useState, useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Loader2, Clock, Plus, QrCode, Search, Filter, ArrowUpDown } from 'lucide-react';
import { api } from '@/lib/api';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import './AttendancePage.css';

interface AttendanceRecord {
  id: number;
  worker: { id: number; user?: { name: string } };
  checkIn: string;
  checkOut: string | null;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'HALF_DAY';
  remarks?: string;
}

export function AttendancePage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const plantationId = user?.publicMetadata?.plantationId as string | undefined;

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    workerId: '',
    checkIn: new Date().toISOString().slice(0, 16),
    checkOut: '',
    status: 'PRESENT',
    remarks: ''
  });
  const [showScanner, setShowScanner] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'time'; direction: 'asc' | 'desc' }>({ key: 'time', direction: 'desc' });
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScan = useRef(false);

  const startScanner = async () => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      toast.error("Camera access requires a secure (HTTPS) connection or localhost.");
      return;
    }

    setShowScanner(true);
    setCameraError(null);
    isProcessingScan.current = false;
    
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        // Prefer back camera on mobile
        await scanner.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanFailure
        );
      } catch (err: any) {
        console.error("Camera start error:", err);
        setCameraError(err.message || "Could not access camera. Please ensure you have granted permission.");
        toast.error("Camera access failed. Please check permissions.");
      }
    }, 300);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (error) {
        console.error("Failed to stop scanner: ", error);
      }
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    
    console.log("QR Scanned (Processing):", decodedText);
    
    // Stop scanner first to avoid more scans from hardware
    await stopScanner();
    
    const token = await getToken();
    const promise = api.scanQrAttendance(decodedText, plantationId!, token || undefined);
    
    toast.promise(promise, {
      loading: 'Marking attendance...',
      success: (data) => {
        console.log("Attendance API Success:", data);
        fetchData();
        isProcessingScan.current = false;
        return `Attendance marked: ${data.worker.user?.name || 'Worker'} (${data.checkOut ? 'Check-out' : 'Check-in'})`;
      },
      error: (err) => {
        console.error("Attendance API Error:", err);
        isProcessingScan.current = false;
        return `Failed: ${err.message}`;
      }
    });
  };

  const onScanFailure = (error: any) => {
    // Suppress
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(e => console.error(e));
      }
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      // Fetch attendance for the selected date if needed, or filter locally if backend returns all
      // For now, assuming backend returns all or current plantation attendance
      const [attendanceData, workerData] = await Promise.all([
        api.getAttendance(plantationId, token || undefined),
        api.getWorkers(plantationId, token || undefined)
      ]);
      setAttendance(attendanceData);
      setWorkers(workerData);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workerId || !formData.checkIn || !formData.status) {
      alert('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        workerId: parseInt(formData.workerId),
        checkOut: formData.checkOut || null,
        plantationId: plantationId ? parseInt(plantationId) : null
      };

      const token = await getToken();
      if (editingRecord) {
        await api.updateAttendance(editingRecord.id, payload, token || undefined);
      } else {
        await api.recordAttendance(payload, token || undefined);
      }

      setShowModal(false);
      setEditingRecord(null);
      setFormData({
        workerId: '',
        checkIn: new Date().toISOString().slice(0, 16),
        checkOut: '',
        status: 'PRESENT',
        remarks: ''
      });
      fetchData();
    } catch (error) {
      console.error('Failed to save attendance:', error);
      alert('Failed to save attendance record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setFormData({
      workerId: record.worker.id.toString(),
      checkIn: new Date(record.checkIn).toISOString().slice(0, 16),
      checkOut: record.checkOut ? new Date(record.checkOut).toISOString().slice(0, 16) : '',
      status: record.status,
      remarks: record.remarks || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      const token = await getToken();
      await api.deleteAttendance(id, token || undefined);
      fetchData();
    } catch (error) {
      console.error('Failed to delete attendance:', error);
      alert(`Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const dailyAttendance = attendance.filter(record => new Date(record.checkIn).toISOString().split('T')[0] === dateFilter);
  const presentCount = dailyAttendance.filter(a => a.status?.toUpperCase() === 'PRESENT').length;
  const leaveCount = dailyAttendance.filter(a => a.status?.toUpperCase() === 'ON_LEAVE').length;

  const filteredAttendance = attendance
    .filter(record => {
      const matchesSearch = (record.worker.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const recordDate = new Date(record.checkIn).toISOString().split('T')[0];
      const matchesDate = recordDate === dateFilter;
      
      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        const s = record.status?.toUpperCase();
        if (statusFilter === 'WORKING') matchesStatus = s === 'PRESENT' && !record.checkOut;
        else if (statusFilter === 'COMPLETED') matchesStatus = s === 'PRESENT' && !!record.checkOut;
        else if (statusFilter === 'HALF_DAY') matchesStatus = s === 'HALF_DAY' || s === 'PARTIAL';
        else matchesStatus = s === statusFilter;
      }
      
      return matchesSearch && matchesDate && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === 'name') {
        const nameA = (a.worker.user?.name || '').toLowerCase();
        const nameB = (b.worker.user?.name || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else {
        const timeA = new Date(a.checkIn).getTime();
        const timeB = new Date(b.checkIn).getTime();
        comparison = timeA - timeB;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

  const activeWorkersCount = workers.filter(w => w.status !== 'Inactive').length;
  const attendanceRate = activeWorkersCount > 0 ? ((presentCount / activeWorkersCount) * 100).toFixed(0) : 0;

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
          <h1 className="text-2xl font-bold text-gray-900">Attendance & HR Module</h1>
          <p className="text-gray-600 mt-1">Track daily attendance and manage leave</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={startScanner}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <QrCode className="w-5 h-5" />
            Scan QR
          </button>
          <button
            onClick={() => {
              setEditingRecord(null);
              setFormData({
                workerId: '',
                checkIn: new Date().toISOString().slice(0, 16),
                checkOut: '',
                status: 'PRESENT',
                remarks: ''
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Clock className="w-5 h-5" />
            Record Attendance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Today's Date</p>
          <p className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Present</p>
          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">On Leave</p>
          <p className="text-2xl font-bold text-orange-600">{leaveCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
          <p className="text-2xl font-bold text-gray-900">
            {attendanceRate}%
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search worker by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none text-gray-700"
              >
                <option value="ALL">All Status</option>
                <option value="WORKING">Working</option>
                <option value="COMPLETED">Completed</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setSortConfig({ ...sortConfig, key: 'name' })}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  sortConfig.key === 'name' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                By Name
              </button>
              <button
                onClick={() => setSortConfig({ ...sortConfig, key: 'time' })}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  sortConfig.key === 'time' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                By Time
              </button>
            </div>

            <button
               onClick={() => setSortConfig({
                 ...sortConfig,
                 direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
               })}
               title={sortConfig.direction === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
               className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
               <ArrowUpDown className={`w-4 h-4 transition-transform duration-200 ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        {(searchTerm || statusFilter !== 'ALL' || dateFilter !== new Date().toISOString().split('T')[0]) && (
          <div className="flex justify-end pt-2 border-t border-gray-50">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setDateFilter(new Date().toISOString().split('T')[0]);
              }}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Attendance Records for {new Date(dateFilter).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Worker Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Check In</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Check Out</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.length > 0 ? (
              filteredAttendance.map((record) => (
                <tr key={record.id} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{record.worker.user?.name || 'Unnamed Worker'}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{new Date(record.checkIn).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{record.checkOut ? new Date(record.checkOut).toLocaleString() : '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {record.status?.toUpperCase() === 'PRESENT' && (
                        <div className="flex items-center gap-2">
                          {!record.checkOut ? (
                            <>
                              <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                              </div>
                              <span className="text-sm font-semibold text-green-600">Working</span>
                            </>
                          ) : (
                            <>
                              <div className="flex -space-x-1">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <CheckCircle2 className="w-4 h-4 text-green-600 -ml-2" />
                              </div>
                              <span className="text-sm font-bold text-green-700">Completed</span>
                            </>
                          )}
                        </div>
                      )}
                      {(record.status?.toUpperCase() === 'HALF_DAY' || record.status?.toUpperCase() === 'PARTIAL') && (
                        <>
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">Half Day</span>
                        </>
                      )}
                      {record.status?.toUpperCase() === 'ABSENT' && (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Absent</span>
                        </>
                      )}
                      {record.status?.toUpperCase() === 'ON_LEAVE' && (
                        <>
                          <CalendarIcon className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-600">On Leave</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-500 italic bg-gray-50/30">
                  No attendance records found for the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-50">
              <h2 className="text-xl font-bold text-green-900 flex items-center gap-2">
                <QrCode className="w-6 h-6" />
                Scan Worker QR
              </h2>
              <button
                onClick={stopScanner}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="p-6">
              <div id="qr-reader" className="w-full rounded-xl overflow-hidden border-2 border-dashed border-green-200 bg-gray-50 aspect-square"></div>
              <p className="text-center text-sm text-gray-500 mt-4 font-medium">
                Position the worker's QR code within the frame to scan
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-center">
              <button
                onClick={stopScanner}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Attendance Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
              <h2 className="text-xl font-bold text-blue-900">
                {editingRecord ? 'Edit Attendance' : 'Record Attendance'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Worker *</label>
                <select
                  required
                  value={formData.workerId}
                  onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Worker</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>{w.user?.name || 'Unnamed Worker'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Check In *</label>
                <input
                  required
                  type="datetime-local"
                  value={formData.checkIn || ''}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Check Out</label>
                <input
                  type="datetime-local"
                  value={formData.checkOut || ''}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="PRESENT">Present</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                  placeholder="Additional notes..."
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
                  ) : editingRecord ? 'Update Record' : 'Record Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
