import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Loader2, Clock, Plus } from 'lucide-react';
import { api } from '@/lib/api';

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
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
      await api.deleteAttendance(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete attendance:', error);
      alert('Failed to delete record.');
    }
  };

  const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
  const leaveCount = attendance.filter(a => a.status === 'ON_LEAVE').length;

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
            {((presentCount / attendance.length) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Today's Attendance</h3>
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
            {attendance.map((record) => {
              return (
                <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{record.worker.user?.name || 'Unnamed Worker'}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{new Date(record.checkIn).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{record.checkOut ? new Date(record.checkOut).toLocaleString() : '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {record.status === 'PRESENT' && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Present</span>
                        </>
                      )}
                      {record.status === 'HALF_DAY' && (
                        <>
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">Half Day</span>
                        </>
                      )}
                      {record.status === 'ABSENT' && (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Absent</span>
                        </>
                      )}
                      {record.status === 'ON_LEAVE' && (
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
              );
            })}
          </tbody>
        </table>
      </div>
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
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Check Out</label>
                <input
                  type="datetime-local"
                  value={formData.checkOut}
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
                  ) : (
                    editingRecord ? 'Update Record' : 'Record Attendance'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
