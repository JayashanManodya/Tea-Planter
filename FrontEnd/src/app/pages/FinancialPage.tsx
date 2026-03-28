import { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Download, Loader2, Info, Activity, Plus, ChevronRight, Edit2, Trash2, AlertCircle, Package, CheckCircle, Search, Filter, ArrowUpDown, Calendar } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

interface PayrollRecord {
  id: number;
  worker: {
    id: number;
    user?: {
      name: string;
      bankName?: string;
      branchName?: string;
      accountNumber?: string;
      accountHolderName?: string;
    };
  };
  basicWage: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  status: string;
}

interface IncomeRecord {
  id: number;
  date: {
    month: number;
    year: number;
  };
  factory: FactoryRecord;
  totalWeight: number;
  pricePerKg: number;
  transportDeduction: number;
  otherDeductions: number;
  grossAmount: number;
  netAmount: number;
  description: string;
  receivedDate: string;
}

interface FactoryRecord {
  id: number;
  name: string;
  registerNo: string;
  pricePerKg: number;
  contactNumber?: string;
  lorrySupervisorName?: string;
  lorrySupervisorContact?: string;
}

interface DeliveryRecord {
  id: number;
  factory: FactoryRecord;
  weight: number;
  deliveryDate: string;
  priceAtDelivery: number;
  totalValue: number;
  status: string;
}

export function FinancialPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const plantationId = user?.publicMetadata?.plantationId as string | undefined;

  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [factories, setFactories] = useState<FactoryRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [inventoryExpenses, setInventoryExpenses] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showFactoryModal, setShowFactoryModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showEditPayrollModal, setShowEditPayrollModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [editingIncome, setEditingIncome] = useState<IncomeRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayrollForPayment, setSelectedPayrollForPayment] = useState<PayrollRecord | null>(null);
  const [payrollPreview, setPayrollPreview] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [formData, setFormData] = useState({
    workerId: '',
    month: new Date().toISOString().slice(0, 7) // YYYY-MM
  });
  const [incomeFormData, setIncomeFormData] = useState({
    factoryId: '',
    totalWeight: '',
    pricePerKg: '',
    transportDeduction: '0',
    otherDeductions: '0',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    description: ''
  });
  const [factoryFormData, setFactoryFormData] = useState({
    name: '',
    registerNo: '',
    pricePerKg: ''
  });
  const [deliveryFormData, setDeliveryFormData] = useState({
    factoryId: '',
    weight: '',
    deliveryDate: new Date().toISOString().split('T')[0]
  });

  // Search & Filter States
  const [incomeSearchTerm, setIncomeSearchTerm] = useState('');
  const [incomeSortBy, setIncomeSortBy] = useState<string>('date-desc');

  const [payrollSearchTerm, setPayrollSearchTerm] = useState('');
  const [payrollFilterStatus, setPayrollFilterStatus] = useState<string>('ALL');
  const [payrollSortBy, setPayrollSortBy] = useState<string>('name-asc');

  const fetchData = async () => {
    setLoading(true);

    const token = await getToken();
    // Fetch each independently to prevent one failure from blocking all data
    const fetchers = [
      { key: 'payroll', fn: () => api.getPayrolls(selectedMonth, plantationId, token || undefined), setter: setPayrolls },
      { key: 'workers', fn: () => api.getWorkers(plantationId, token || undefined), setter: setWorkers },
      { key: 'incomes', fn: () => api.getIncomes(selectedMonth, plantationId, token || undefined), setter: setIncomes },
      { key: 'factories', fn: () => api.getFactories(plantationId, token || undefined), setter: setFactories },
      { key: 'deliveries', fn: () => api.getDeliveries(selectedMonth, plantationId, token || undefined), setter: setDeliveries },
      { key: 'inventoryExpenses', fn: () => api.getInventoryExpenses(selectedMonth, plantationId, token || undefined), setter: setInventoryExpenses }
    ];

    await Promise.all(fetchers.map(async (f) => {
      try {
        const data = await f.fn();
        if (data && typeof data === 'object' && 'error' in data) {
          console.error(`Backend error for ${f.key}:`, data.message);
          f.setter([]);
        } else {
          f.setter(data || []);
        }
      } catch (error) {
        console.error(`Failed to fetch ${f.key}:`, error);
      }
    }));

    setLoading(false);
  };

  useEffect(() => {
    const fetchPreview = async () => {
      if (showModal && formData.workerId && formData.month) {
        setIsPreviewLoading(true);
        try {
          const token = await getToken();
          const preview = await api.getPayrollPreview(formData.workerId, formData.month, token || undefined);
          setPayrollPreview(preview);
        } catch (error) {
          console.error('Failed to fetch payroll preview:', error);
          setPayrollPreview(null);
        } finally {
          setIsPreviewLoading(false);
        }
      } else {
        setPayrollPreview(null);
      }
    };

    fetchPreview();
  }, [showModal, formData.workerId, formData.month]);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workerId || !formData.month) {
      alert('Please select a worker and month');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.generatePayroll({
        worker: { id: parseInt(formData.workerId) },
        month: `${formData.month}-01`
      }, token || undefined);
      setShowModal(false);
      fetchData();
      alert('Payroll generated successfully!');
    } catch (error) {
      console.error('Failed to generate payroll:', error);
      alert('Failed to generate payroll record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeFormData.factoryId || !incomeFormData.totalWeight || !incomeFormData.pricePerKg) {
      alert('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        factory: { id: parseInt(incomeFormData.factoryId) },
        totalWeight: parseFloat(incomeFormData.totalWeight),
        pricePerKg: parseFloat(incomeFormData.pricePerKg),
        transportDeduction: parseFloat(incomeFormData.transportDeduction) || 0,
        otherDeductions: parseFloat(incomeFormData.otherDeductions) || 0,
        date: {
          month: incomeFormData.month,
          year: incomeFormData.year
        },
        description: incomeFormData.description
      };

      const token = await getToken();
      if (editingIncome) {
        await api.updateIncome(editingIncome.id, data, token || undefined);
      } else {
        await api.createIncome(data, plantationId || '', token || undefined);
      }

      setShowIncomeModal(false);
      setEditingIncome(null);
      setIncomeFormData({
        factoryId: '',
        totalWeight: '',
        pricePerKg: '',
        transportDeduction: '0',
        otherDeductions: '0',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        description: ''
      });
      fetchData();
      alert('Monthly paysheet recorded successfully!');
    } catch (error) {
      console.error('Failed to record income:', error);
      alert('Failed to record monthly paysheet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditIncome = (income: IncomeRecord) => {
    setEditingIncome(income);
    setIncomeFormData({
      factoryId: income.factory.id.toString(),
      totalWeight: income.totalWeight.toString(),
      pricePerKg: income.pricePerKg.toString(),
      transportDeduction: income.transportDeduction.toString(),
      otherDeductions: income.otherDeductions.toString(),
      month: income.date.month,
      year: income.date.year,
      description: income.description || ''
    });
    setShowIncomeModal(true);
  };

  const handleDeleteIncome = async (id: number) => {
    if (!confirm('Are you sure you want to delete this factory paysheet?')) return;
    try {
      const token = await getToken();
      await api.deleteIncome(id, token || undefined);
      fetchData();
    } catch (error) {
      console.error('Failed to delete income:', error);
      alert(`Failed to delete income record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddFactory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factoryFormData.name) {
      alert('Factory name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.createFactory({
        ...factoryFormData,
        pricePerKg: parseFloat(factoryFormData.pricePerKg) || 0,
        plantationId: plantationId
      }, token || undefined);
      setShowFactoryModal(false);
      setFactoryFormData({ name: '', registerNo: '', pricePerKg: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to add factory:', error);
      alert('Failed to add factory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryFormData.factoryId || !deliveryFormData.weight) {
      alert('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.recordDelivery({
        factory: { id: parseInt(deliveryFormData.factoryId) },
        weight: parseFloat(deliveryFormData.weight),
        deliveryDate: deliveryFormData.deliveryDate,
        plantationId: plantationId
      }, token || undefined);
      setShowDeliveryModal(false);
      setDeliveryFormData({ factoryId: '', weight: '', deliveryDate: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error) {
      console.error('Failed to record delivery:', error);
      alert('Failed to record delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayroll) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.updatePayroll(editingPayroll.id, {
        bonuses: editingPayroll.bonuses,
        deductions: editingPayroll.deductions
      }, token || undefined);
      setShowEditPayrollModal(false);
      setEditingPayroll(null);
      fetchData();
      alert('Payroll updated successfully!');
    } catch (error) {
      console.error('Failed to update payroll:', error);
      alert(`Failed to update payroll: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayroll = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;

    try {
      const token = await getToken();
      await api.deletePayroll(id, token || undefined);
      fetchData();
      alert('Payroll record deleted.');
    } catch (error) {
      console.error('Failed to delete payroll:', error);
      alert(`Failed to delete payroll record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePay = async (payroll: PayrollRecord) => {
    if (!confirm(`Mark payroll for ${payroll.worker.user?.name || 'this worker'} as PAID?`)) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.updatePayrollStatus(payroll.id, 'PAID', token || undefined);
      setShowPaymentModal(false);
      setSelectedPayrollForPayment(null);
      fetchData();
      alert('Payroll marked as PAID successfully!');
    } catch (error) {
      console.error('Failed to update payroll status:', error);
      alert('Failed to mark payroll as PAID.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIncomes = useMemo(() => {
    let result = [...incomes];

    if (incomeSearchTerm) {
      const term = incomeSearchTerm.toLowerCase();
      result = result.filter(i =>
        i.factory?.name?.toLowerCase().includes(term) ||
        i.description?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      if (incomeSortBy === 'date-desc') return (b.date.year * 12 + b.date.month) - (a.date.year * 12 + a.date.month);
      if (incomeSortBy === 'amount-desc') return (b.netAmount || 0) - (a.netAmount || 0);
      if (incomeSortBy === 'amount-asc') return (a.netAmount || 0) - (b.netAmount || 0);
      return 0;
    });

    return result;
  }, [incomes, incomeSearchTerm, incomeSortBy]);

  const filteredPayrolls = useMemo(() => {
    let result = [...payrolls];

    if (payrollSearchTerm) {
      const term = payrollSearchTerm.toLowerCase();
      result = result.filter(p =>
        p.worker?.user?.name?.toLowerCase().includes(term)
      );
    }

    if (payrollFilterStatus !== 'ALL') {
      result = result.filter(p => p.status === payrollFilterStatus);
    }

    result.sort((a, b) => {
      if (payrollSortBy === 'name-asc') return (a.worker?.user?.name || '').localeCompare(b.worker?.user?.name || '');
      if (payrollSortBy === 'amount-desc') return (b.netPay || 0) - (a.netPay || 0);
      if (payrollSortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

    return result;
  }, [payrolls, payrollSearchTerm, payrollFilterStatus, payrollSortBy]);

  const totalPayroll = useMemo(() =>
    payrolls.reduce((sum, p) => sum + (p.netPay || 0), 0),
    [payrolls]);

  const totalRevenue = useMemo(() =>
    incomes.reduce((sum, i) => sum + (i.netAmount || 0), 0),
    [incomes]);

  const totalExpenses = useMemo(() => {
    const labor = totalPayroll;
    const inventory = typeof inventoryExpenses === 'number' ? inventoryExpenses : 0;
    return labor + inventory;
  }, [totalPayroll, inventoryExpenses]);

  const netProfit = useMemo(() => {
    return totalRevenue - totalExpenses;
  }, [totalRevenue, totalExpenses]);
  
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const token = await getToken();
      const blob = await api.downloadFinancialReport(plantationId!, selectedMonth, token || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Financial_Report_${selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export financial report.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial & Payroll Management</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">Period:</p>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2 py-0.5 border border-gray-300 rounded text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            Generate Payroll
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium outline-none disabled:opacity-50 transition-all"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="w-5 h-5 text-green-700" />
            </div>
            <p className="text-sm font-normal text-gray-600">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            LKR {totalRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Total from factory labels</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-100">
              <TrendingDown className="w-5 h-5 text-red-700" />
            </div>
            <p className="text-sm font-normal text-gray-600">Labor Expenses</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            LKR {totalPayroll.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Sum of all net payrolls</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Package className="w-5 h-5 text-orange-700" />
            </div>
            <p className="text-sm font-normal text-gray-600">Input Expenses</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            LKR {inventoryExpenses.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Fertilizer, chemicals & stock</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Activity className="w-5 h-5 text-blue-700" />
            </div>
            <p className="text-sm font-normal text-gray-600">Net Profit</p>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            LKR {netProfit.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Revenue minus all expenses</p>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Factory Paysheets (Monthly)</h3>
            <button
              onClick={() => setShowIncomeModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
            >
              + Record Paysheet
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search factory..."
                value={incomeSearchTerm}
                onChange={(e) => setIncomeSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={incomeSortBy}
                onChange={(e) => setIncomeSortBy(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="date-desc">Newest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {filteredIncomes.map((income) => (
              <div key={income.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{income.factory?.name}</p>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{new Date(0, (income.date?.month || 1) - 1).toLocaleString('default', { month: 'long' })} {income.date?.year}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="font-bold text-green-600 text-lg">LKR {income.netAmount?.toLocaleString()}</p>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => handleEditIncome(income)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteIncome(income.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full mt-1">Paysheet ID: #{income.id}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs border-t border-gray-200 pt-2 mt-2">
                  <div className="text-gray-500">Gross Weight:</div>
                  <div className="text-right font-medium">{income.totalWeight} kg</div>
                  <div className="text-gray-500">Price per Kg:</div>
                  <div className="text-right font-medium">LKR {income.pricePerKg}</div>
                  <div className="text-red-400">Transport:</div>
                  <div className="text-right font-medium text-red-500">-(LKR {income.transportDeduction})</div>
                  <div className="text-red-400">Other Cutouts:</div>
                  <div className="text-right font-medium text-red-500">-(LKR {income.otherDeductions})</div>
                </div>
              </div>
            ))}
            {filteredIncomes.length === 0 && (
              <p className="text-center py-4 text-gray-500 text-sm">No monthly paysheets found.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Profit Distribution</h3>
          </div>

          <div className="flex-1 h-[350px] min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Labor', value: totalPayroll },
                    { name: 'Inputs', value: inventoryExpenses },
                    { name: 'Profit', value: Math.max(0, netProfit) }
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#EF4444" />
                  <Cell fill="#F97316" />
                  <Cell fill="#22C55E" />
                </Pie>
                <RechartsTooltip
                  formatter={(value: number) => `LKR ${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="text-xl font-bold fill-gray-900">
                  LKR {totalRevenue.toLocaleString()}
                </text>
                <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-xs font-medium fill-gray-400 uppercase tracking-wider">
                  Total Revenue
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2 uppercase tracking-wider font-medium">
            Revenue Allocation Overview
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Payroll Records</h3>
          <div className="text-sm text-gray-500">
            Total payout: <span className="font-bold text-blue-600">LKR {totalPayroll.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by worker name..."
              value={payrollSearchTerm}
              onChange={(e) => setPayrollSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={payrollFilterStatus}
                onChange={(e) => setPayrollFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={payrollSortBy}
                onChange={(e) => setPayrollSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="amount-desc">Net Pay (High-Low)</option>
                <option value="status">Status</option>
              </select>
            </div>
            { (payrollSearchTerm || payrollFilterStatus !== 'ALL') && (
              <button 
                onClick={() => {
                  setPayrollSearchTerm('');
                  setPayrollFilterStatus('ALL');
                }}
                className="text-xs text-red-600 font-bold hover:text-red-700"
              >
                CLEAR FILTERS
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {filteredPayrolls.map((payroll) => (
            <div key={payroll.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-4">
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">{payroll.worker?.user?.name || 'Unknown Worker'}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Payroll ID: #{payroll.id}</span>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-8 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium uppercase">Base Wage</span>
                  <span className="text-gray-600">LKR {(payroll.basicWage || 0).toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-green-400 font-medium uppercase">Bonus</span>
                  <span className="text-green-600">LKR {(payroll.bonuses || 0).toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-red-400 font-medium uppercase">Deductions</span>
                  <span className="text-red-600">LKR {(payroll.deductions || 0).toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-blue-400 uppercase font-medium">Net Pay</span>
                  <span className="font-bold text-gray-900">LKR {(payroll.netPay || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${payroll.status === 'PAID' ? 'bg-green-100 text-green-700' :
                    payroll.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                    {payroll.status}
                  </span>
                  <div className="flex items-center gap-1 border-l border-gray-200 pl-4 ml-4">
                    <button
                      onClick={() => {
                        setEditingPayroll(payroll);
                        setShowEditPayrollModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Payroll"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePayroll(payroll.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Payroll"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {payroll.status !== 'PAID' && (
                      <button
                        onClick={() => {
                          setSelectedPayrollForPayment(payroll);
                          setShowPaymentModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm ml-2"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        PAY
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredPayrolls.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No payroll records found for the current filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
              <h2 className="text-xl font-bold text-blue-900">Generate Payroll</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setPayrollPreview(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Worker *</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Month *</label>
                <input
                  required
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {isPreviewLoading ? (
                <div className="py-4 flex flex-col items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-medium">Calculating earnings...</span>
                </div>
              ) : payrollPreview ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-500 font-medium uppercase tracking-wider mb-2">Earnings Summary</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-xs text-gray-600">Harvesting ({payrollPreview.harvestCount} records)</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">LKR {payrollPreview.harvestEarnings.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs text-gray-600">Tasks ({payrollPreview.taskCount} records)</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">LKR {payrollPreview.taskEarnings.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-blue-200 flex justify-between items-center">
                        <span className="text-xs font-medium text-blue-900">Total Calculated Base Wage</span>
                        <span className="text-lg font-black text-blue-600">LKR {payrollPreview.totalEarnings.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      Bonuses and deductions can be added after generating the initial payroll record.
                    </p>
                  </div>
                </div>
              ) : formData.workerId && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <p className="text-xs text-orange-700">No earnings found for this worker in the selected month.</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setPayrollPreview(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (payrollPreview && payrollPreview.totalEarnings === 0)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Payroll'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Factory Modal */}
      {showFactoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
              <h2 className="text-xl font-bold text-blue-900">Register Factory</h2>
              <button
                onClick={() => setShowFactoryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddFactory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Factory Name *</label>
                <input
                  required
                  type="text"
                  value={factoryFormData.name}
                  onChange={(e) => setFactoryFormData({ ...factoryFormData, name: e.target.value })}
                  placeholder="e.g. Bogawantalawa Tea Factory"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Registration No</label>
                <input
                  type="text"
                  value={factoryFormData.registerNo}
                  onChange={(e) => setFactoryFormData({ ...factoryFormData, registerNo: e.target.value })}
                  placeholder="e.g. TF-2024-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Current Price per Kg (LKR)</label>
                <input
                  type="number"
                  value={factoryFormData.pricePerKg}
                  onChange={(e) => setFactoryFormData({ ...factoryFormData, pricePerKg: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowFactoryModal(false)}
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
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-50">
              <h2 className="text-xl font-bold text-green-900">Record Tea Delivery</h2>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleRecordDelivery} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Factory *</label>
                <select
                  required
                  value={deliveryFormData.factoryId}
                  onChange={(e) => setDeliveryFormData({ ...deliveryFormData, factoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">Select Factory</option>
                  {factories.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (LKR {f.pricePerKg}/kg)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Weight (kg) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={deliveryFormData.weight}
                  onChange={(e) => setDeliveryFormData({ ...deliveryFormData, weight: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                <input
                  required
                  type="date"
                  value={deliveryFormData.deliveryDate}
                  onChange={(e) => setDeliveryFormData({ ...deliveryFormData, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg flex gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  The total value will be calculated automatically based on the factory's current price per kg.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
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
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Factory Paysheet Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
              <h2 className="text-xl font-bold text-blue-900">
                {editingIncome ? 'Edit Factory Paysheet' : 'Record Factory Paysheet'}
              </h2>
              <button
                onClick={() => {
                  setShowIncomeModal(false);
                  setEditingIncome(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddIncome} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Factory *</label>
                <select
                  required
                  value={incomeFormData.factoryId}
                  onChange={(e) => setIncomeFormData({ ...incomeFormData, factoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Factory</option>
                  {factories.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Gross Weight (kg) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={incomeFormData.totalWeight}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, totalWeight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rate per Kg (LKR) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={incomeFormData.pricePerKg}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, pricePerKg: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 text-red-500">Transport Cut (LKR)</label>
                  <input
                    type="number"
                    value={incomeFormData.transportDeduction}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, transportDeduction: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 text-red-500">Other Cutouts (LKR)</label>
                  <input
                    type="number"
                    value={incomeFormData.otherDeductions}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, otherDeductions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Month</label>
                  <select
                    value={incomeFormData.month}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={incomeFormData.year}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg flex gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Gross amount and net amount will be calculated automatically based on the values above.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
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
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingIncome ? 'Save Changes' : 'Record Paysheet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Payroll Modal */}
      {showEditPayrollModal && editingPayroll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50">
              <h2 className="text-xl font-bold text-orange-900">Edit Payroll: {editingPayroll.worker.user?.name || 'Unnamed Worker'}</h2>
              <button
                onClick={() => setShowEditPayrollModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleUpdatePayroll} className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg flex flex-col gap-1 border border-gray-100">
                <span className="text-xs text-gray-400 uppercase font-medium">Base Wage</span>
                <span className="text-lg font-bold text-gray-700">LKR {editingPayroll.basicWage?.toLocaleString()}</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bonuses (LKR)</label>
                <input
                  type="number"
                  value={editingPayroll.bonuses}
                  onChange={(e) => setEditingPayroll({ ...editingPayroll, bonuses: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Deductions (LKR)</label>
                <input
                  type="number"
                  value={editingPayroll.deductions}
                  onChange={(e) => setEditingPayroll({ ...editingPayroll, deductions: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                <div className="flex justify-between items-center text-orange-800">
                  <span className="text-sm font-semibold uppercase tracking-wider">Calculated Net Pay</span>
                  <span className="text-xl font-black">
                    LKR {((editingPayroll.basicWage || 0) + (editingPayroll.bonuses || 0) - (editingPayroll.deductions || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditPayrollModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPayrollForPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-50">
              <h2 className="text-xl font-bold text-green-900">Payment Details</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayrollForPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xl">
                  {(selectedPayrollForPayment.worker.user?.name || 'W').charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{selectedPayrollForPayment.worker.user?.name || 'Unnamed Worker'}</p>
                  <p className="text-xs text-gray-500 font-medium">Payroll ID: #{selectedPayrollForPayment.id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Bank Information
                  </h3>
                  <p className="text-xs text-blue-700 space-y-1">
                    <div><span className="font-normal text-blue-400 uppercase mr-2">Bank:</span> {selectedPayrollForPayment.worker.user?.bankName || 'N/A'}</div>
                    <div><span className="font-normal text-blue-400 uppercase mr-2">Branch:</span> {selectedPayrollForPayment.worker.user?.branchName || 'N/A'}</div>
                    <div><span className="font-normal text-blue-400 uppercase mr-2">A/C No:</span> <span className="font-mono text-blue-900">{selectedPayrollForPayment.worker.user?.accountNumber || 'N/A'}</span></div>
                    <div><span className="font-normal text-blue-400 uppercase mr-2">Holder:</span> {selectedPayrollForPayment.worker.user?.accountHolderName || 'N/A'}</div>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-400 font-normal uppercase mb-1">Total Payout</p>
                    <p className="text-lg font-black text-gray-900">LKR {selectedPayrollForPayment.netPay.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-400 font-normal uppercase mb-1">Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${selectedPayrollForPayment.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                      {selectedPayrollForPayment.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayrollForPayment(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {selectedPayrollForPayment.status !== 'PAID' && (
                  <button
                    onClick={() => handlePay(selectedPayrollForPayment)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Mark as Paid
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  // END
}

