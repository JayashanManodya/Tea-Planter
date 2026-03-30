import { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Download, Loader2, Info, Activity, Plus, ChevronRight, Edit2, Trash2, AlertCircle, Package, CheckCircle, Search, Filter, ArrowUpDown, Calendar, Landmark, QrCode, Sparkles } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

interface PayrollRecord {
  id: number;
  worker: {
    id: number;
    qrCode?: string;
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
  paymentMode?: string;
  paidDate?: string;
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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PAYROLL' | 'INCOMES' | 'BANK_TRANSFERS' | 'FACTORIES'>('OVERVIEW');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedPayrollForPayment, setSelectedPayrollForPayment] = useState<PayrollRecord | null>(null);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

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

  // Auto-calculate Gross Weight and Price from Deliveries for Paysheet
  useEffect(() => {
    const calculateWeight = async () => {
      if (!showIncomeModal || editingIncome || !incomeFormData.factoryId) return;

      const targetMonth = `${incomeFormData.year}-${String(incomeFormData.month).padStart(2, '0')}`;
      let targetDeliveries = [...deliveries];

      // If requested month differs from page filter, fetch deliveries for that month
      if (targetMonth !== selectedMonth) {
        try {
          const token = await getToken();
          const fetched = await api.getDeliveries(targetMonth, plantationId, token || undefined);
          targetDeliveries = fetched || [];
        } catch (error) {
          console.error('Failed to fetch deliveries for auto-calc:', error);
          return;
        }
      }

      // Filter and sum weight
      const total = targetDeliveries
        .filter(d => d.factory.id.toString() === incomeFormData.factoryId)
        .reduce((sum, d) => sum + (d.weight || 0), 0);

      // Find factory rate
      const factory = factories.find(f => f.id.toString() === incomeFormData.factoryId);
      const rate = factory?.pricePerKg?.toString() || '';

      setIncomeFormData(prev => ({
        ...prev,
        totalWeight: total > 0 ? total.toFixed(2) : prev.totalWeight,
        pricePerKg: rate || prev.pricePerKg
      }));
    };

    calculateWeight();
  }, [showIncomeModal, incomeFormData.factoryId, incomeFormData.month, incomeFormData.year, deliveries, selectedMonth, factories]);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workerId || !formData.month) return;
    
    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.generatePayroll({
        worker: { id: parseInt(formData.workerId) },
        month: `${formData.month}-01`
      }, token || undefined);
      setShowModal(false);
      setPayrollPreview(null);
      fetchData();
      alert('Payroll generated successfully!');
    } catch (error) {
      console.error('Failed to generate payroll:', error);
      alert('Failed to generate payroll record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkGeneratePayroll = async () => {
    if (!plantationId) return;
    if (!confirm(`Generate payroll records for ALL workers for ${selectedMonth}? Existing records for this month will be skipped.`)) return;
    
    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.bulkGeneratePayroll(selectedMonth, plantationId, token || undefined);
      fetchData();
      alert('Bulk payroll generation successful!');
    } catch (error) {
      console.error('Bulk generation failed:', error);
      alert('Failed to generate bulk payroll.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPayroll = (payroll: PayrollRecord) => {
    setEditingPayroll({ ...payroll });
    setShowEditPayrollModal(true);
  };

  const handleEditIncome = (income: IncomeRecord) => {
    setEditingIncome(income);
    setIncomeFormData({
      factoryId: income.factory?.id.toString() || '',
      totalWeight: income.totalWeight?.toString() || '',
      pricePerKg: income.pricePerKg?.toString() || '',
      transportDeduction: income.transportDeduction?.toString() || '0',
      otherDeductions: income.otherDeductions?.toString() || '0',
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
      alert('Income record deleted.');
    } catch (error) {
      console.error('Failed to delete income:', error);
      alert('Failed to delete income record.');
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const payload = {
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

      if (editingIncome) {
        await api.updateIncome(editingIncome.id, payload, token || undefined);
        alert('Paysheet updated successfully!');
      } else {
        await api.createIncome(payload, plantationId || undefined, token || undefined);
        alert('Paysheet recorded successfully!');
      }
      
      setShowIncomeModal(false);
      setEditingIncome(null);
      fetchData();
    } catch (error) {
      console.error('Failed to save income:', error);
      alert('Failed to save paysheet record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFactory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!factoryFormData.name) return;
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
      alert('Factory added successfully!');
    } catch (error) {
      console.error('Failed to add factory:', error);
      alert('Failed to add factory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordDelivery = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!deliveryFormData.factoryId || !deliveryFormData.weight) return;
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
      setDeliveryFormData({ 
        factoryId: '', 
        weight: '', 
        deliveryDate: new Date().toISOString().split('T')[0] 
      });
      fetchData();
      alert('Delivery recorded successfully!');
    } catch (error) {
      console.error('Failed to record delivery:', error);
      alert('Failed to record delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePayroll = async (e: React.FormEvent<HTMLFormElement>) => {
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
      alert('Failed to update payroll.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePayroll = async (id: number) => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.updatePayrollStatus(id, 'APPROVED', undefined, token || undefined);
      fetchData();
    } catch (error) {
      console.error('Failed to approve payroll:', error);
      alert('Failed to approve payroll.');
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
      alert('Failed to delete payroll record.');
    }
  };

  const handlePay = (payroll: PayrollRecord) => {
    setSelectedPayrollForPayment(payroll);
    setShowPaymentModal(true);
  };

  const handleSelectBankTransfer = async () => {
    if (!selectedPayrollForPayment) return;
    
    setIsSubmitting(true);
    try {
      const token = await getToken();
      // Only set the paymentMode to BANK and ensure it remains APPROVED
      await api.updatePayrollStatus(selectedPayrollForPayment.id, 'APPROVED', 'BANK', token || undefined);
      setShowPaymentModal(false);
      setSelectedPayrollForPayment(null);
      fetchData();
      alert('Payroll moved to Bank Transfer list for processing.');
    } catch (error) {
      console.error('Failed to select bank transfer:', error);
      alert('Failed to update payment mode.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPayment = async (mode: 'BANK' | 'CASH') => {
    if (!selectedPayrollForPayment) return;

    if (mode === 'CASH') {
      setShowQRScanner(true);
      setShowPaymentModal(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      // Mark as PAID
      await api.updatePayrollStatus(selectedPayrollForPayment.id, 'PAID', mode, token || undefined);
      setShowPaymentModal(false);
      setSelectedPayrollForPayment(null);
      fetchData();
      alert('Payroll marked as PAID via Bank Transfer!');
    } catch (error) {
      console.error('Failed to update payroll status:', error);
      alert('Failed to mark payroll as PAID.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAllAsPaid = async (payrollIds: number[]) => {
    if (!confirm(`Mark ${payrollIds.length} records as PAID via Bank Transfer?`)) return;
    
    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.bulkUpdatePayrollStatus(payrollIds, 'PAID', 'BANK', token || undefined);
      fetchData();
      alert('All selected records marked as PAID!');
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('Failed to update records. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQRScanSuccess = async (decodedText: string) => {
    if (!selectedPayrollForPayment) return;

    const scanned = decodedText.trim();
    const expected = selectedPayrollForPayment.worker.qrCode?.trim() || "";
    
    console.log("QR Scan Verification:", { 
      scanned, 
      expected, 
      worker: selectedPayrollForPayment.worker.user?.name 
    });

    if (scanned === expected && expected !== "") {
      setIsSubmitting(true);
      setQrError(null);
      try {
        const token = await getToken();
        await api.updatePayrollStatus(selectedPayrollForPayment.id, 'PAID', 'CASH', token || undefined);
        setShowQRScanner(false);
        setSelectedPayrollForPayment(null);
        fetchData();
        alert(`Payment verified! Cash handed over to ${selectedPayrollForPayment.worker.user?.name}.`);
      } catch (error) {
        console.error('QR Payment failed:', error);
        setQrError('Failed to process payment. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!expected) {
        setQrError('Error: This worker has no QR code assigned in their profile.');
      } else {
        setQrError('QR Code mismatch! This QR belongs to a different worker.');
      }
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
    // Exclude records that are already designated for Bank Transfers (but not yet paid) 
    // to simulate the "move" behavior.
    let result = payrolls.filter(p => !(p.status === 'APPROVED' && p.paymentMode === 'BANK'));

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

  const handleUpdateBaseSalary = async (workerId: number, baseSalary: number) => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.updateWorker(workerId, { baseSalary }, token || undefined);
      await fetchData();
      alert('Salary updated successfully!');
    } catch (error) {
      console.error('Failed to update salary:', error);
      alert('Failed to update salary.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fixedSalaryWorkers = useMemo(() => {
    const FIXED_SALARY_ROLES = ['Clerk', 'Supervisor', 'Driver', 'Maintenance', 'Security', 'Other'];
    return workers.filter(w => {
      const functions = w.workerFunctions || '';
      return FIXED_SALARY_ROLES.some(role => functions.includes(role));
    });
  }, [workers]);

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
        <div className="flex gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
           Plantation Financials
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {[
          { id: 'OVERVIEW', label: 'Financial Overview', icon: Activity },
          { id: 'PAYROLL', label: 'Payroll & Wages', icon: DollarSign },
          { id: 'BANK_TRANSFERS', label: 'Bank Transfers', icon: Landmark },
          { id: 'FACTORIES', label: 'Factory Management', icon: Package }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Financial Performance</h3>
              <p className="text-sm text-gray-500">Overview of revenue, expenses and net profit</p>
            </div>
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? 'Exporting...' : 'Export Financial Report'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="w-5 h-5 text-green-700" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Total Revenue</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                LKR {totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">Total from factory labels</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <TrendingDown className="w-5 h-5 text-red-700" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Labor Expenses</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                LKR {totalPayroll.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">Sum of all net payrolls</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Package className="w-5 h-5 text-orange-700" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Input Expenses</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                LKR {inventoryExpenses.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">Fertilizer, chemicals & stock</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Activity className="w-5 h-5 text-blue-700" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Net Profit</p>
              </div>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                LKR {netProfit.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">Revenue minus all expenses</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profit Distribution Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col h-full lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Profit Distribution</h3>
              </div>

              <div className="flex-1 h-[300px] min-h-[300px]">
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
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#EF4444" />
                      <Cell fill="#F97316" />
                      <Cell fill="#22C55E" />
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => `LKR ${value.toLocaleString()}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="text-xl font-black fill-gray-900">
                      LKR {totalRevenue.toLocaleString()}
                    </text>
                    <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-black fill-gray-400 uppercase tracking-widest">
                      Total Revenue
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Short Factory List */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-1">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Recent Factory Incomes</h3>
                <button
                  onClick={() => setActiveTab('FACTORIES')}
                  className="text-sm text-blue-600 hover:underline font-semibold"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {filteredIncomes.slice(0, 5).map(income => (
                  <div key={income.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-bold text-gray-900">{income.factory?.name}</p>
                      <p className="text-xs text-gray-500">{income.description || 'Monthly delivery'}</p>
                    </div>
                    <p className="font-bold text-green-600">LKR {income.netAmount?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payroll Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-1">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Payroll Status</h3>
                <button
                  onClick={() => setActiveTab('PAYROLL')}
                  className="text-sm text-blue-600 hover:underline font-semibold"
                >
                  Manage Wages
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-xs font-bold text-orange-600 uppercase mb-1">Pending</p>
                  <p className="text-xl font-bold text-orange-900">{payrolls.filter(p => p.status === 'PENDING').length} records</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-600 uppercase mb-1">Approved</p>
                  <p className="text-xl font-bold text-blue-900">{payrolls.filter(p => p.status === 'APPROVED').length} records</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs font-bold text-green-600 uppercase mb-1">Paid</p>
                  <p className="text-xl font-bold text-green-900">{payrolls.filter(p => p.status === 'PAID').length} records</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Total</p>
                  <p className="text-xl font-bold text-gray-900">{payrolls.length} records</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'PAYROLL' && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-in slide-in-from-right-4 duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-xl font-bold text-gray-900">Worker Payroll Management</h3>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search worker name..."
                  value={payrollSearchTerm}
                  onChange={(e) => setPayrollSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Generate Individual
                </button>
                <button
                  onClick={() => setShowSalaryModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95"
                >
                  <Activity className="w-4 h-4" />
                  Manage Salaries
                </button>
                <button
                  onClick={handleBulkGeneratePayroll}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate All
                </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Worker</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Base Wage</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Bonuses</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Deductions</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Net Pay</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-bold text-gray-900">{payroll.worker.user?.name}</p>
                      <p className="text-xs text-gray-500">ID: #{payroll.worker.id}</p>
                    </td>
                    <td className="px-4 py-4 text-right font-medium">LKR {payroll.basicWage?.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right text-green-600 font-medium">+{payroll.bonuses?.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right text-red-600 font-medium">-{payroll.deductions?.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-bold text-blue-700 bg-blue-50/30">LKR {payroll.netPay?.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        payroll.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        payroll.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                        payroll.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center items-center gap-2">
                        {payroll.status === 'PENDING' && (
                          <button
                            onClick={() => handleApprovePayroll(payroll.id)}
                            disabled={isSubmitting}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 text-xs font-bold border border-blue-200 disabled:opacity-50"
                            title="Approve"
                          >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Approve
                          </button>
                        )}
                        {payroll.status === 'APPROVED' && (
                          <button
                            onClick={() => handlePay(payroll)}
                            className="p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-1 text-xs font-bold shadow-sm"
                            title="Pay Now"
                          >
                            <DollarSign className="w-4 h-4" /> Pay
                          </button>
                        )}
                        {payroll.status === 'PAID' && (
                          <div className="flex flex-col items-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-[10px] text-gray-400 font-medium">{payroll.paymentMode || 'N/A'}</span>
                          </div>
                        )}
                        {payroll.status !== 'PAID' && (
                          <div className="flex gap-1 border-l border-gray-200 pl-2 ml-1">
                            <button
                              onClick={() => handleEditPayroll(payroll)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Adjustments"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePayroll(payroll.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'BANK_TRANSFERS' && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-in slide-in-from-right-4 duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Bank Transfer List</h3>
              <p className="text-sm text-gray-500">Manage digital payments and export for processing</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const pending = payrolls.filter(p => p.status === 'APPROVED' && p.paymentMode === 'BANK');
                  if (pending.length === 0) return alert('No pending bank transfers to export.');
                  
                  const headers = ["Worker Name", "Bank Name", "Branch", "Account Number", "Account Holder", "Net Pay (LKR)"];
                  const rows = pending.map(p => [
                    p.worker.user?.name || '',
                    p.worker.user?.bankName || '',
                    p.worker.user?.branchName || '',
                    p.worker.user?.accountNumber || '',
                    p.worker.user?.accountHolderName || '',
                    p.netPay.toString()
                  ]);

                  const csvContent = "data:text/csv;charset=utf-8," 
                    + headers.join(",") + "\n"
                    + rows.map(e => e.join(",")).join("\n");

                  const link = document.createElement("a");
                  link.setAttribute("href", encodeURI(csvContent));
                  link.setAttribute("download", `Bank_Transfer_List_${selectedMonth}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-bold text-sm border border-green-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => {
                  const ids = payrolls.filter(p => p.status === 'APPROVED' && p.paymentMode === 'BANK').map(p => p.id);
                  if (ids.length === 0) return alert('No pending bank transfers found.');
                  markAllAsPaid(ids);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                Mark All as Paid
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Worker & Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Bank Details</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Amount</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payrolls.filter(p => (p.status === 'APPROVED' && p.paymentMode === 'BANK') || (p.status === 'PAID' && p.paymentMode === 'BANK')).map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-bold text-gray-900">{payroll.worker.user?.name}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        payroll.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="p-3 bg-gray-50/50 rounded-lg border border-gray-100 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <Landmark className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-sm font-bold text-gray-800">{payroll.worker.user?.bankName || 'No Bank Set'}</p>
                        </div>
                        <p className="text-xs text-gray-500 ml-5">{payroll.worker.user?.branchName || 'No Branch'}</p>
                        <div className="mt-2 text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block w-fit">
                           {payroll.worker.user?.accountNumber || 'MISSING ACCOUNT'}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Holder: {payroll.worker.user?.accountHolderName || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-lg font-bold text-gray-900">LKR {payroll.netPay?.toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                       {payroll.status === 'APPROVED' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedPayrollForPayment(payroll);
                              handleConfirmPayment('BANK');
                            }}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs border border-blue-200 transition-all"
                          >
                            Mark Paid
                          </button>
                          <div className="flex gap-1 border-l border-gray-200 pl-2">
                            <button
                               onClick={() => handleEditPayroll(payroll)}
                               className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                               title="Edit"
                            >
                               <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                               onClick={() => handleDeletePayroll(payroll.id)}
                               className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                               title="Delete"
                            >
                               <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                           <CheckCircle className="w-5 h-5 text-green-600" />
                           <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(payroll.paidDate || Date.now()).toLocaleDateString()}</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {payrolls.filter(p => (p.status === 'APPROVED' && p.paymentMode === 'BANK') || (p.status === 'PAID' && p.paymentMode === 'BANK')).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-400 font-medium">
                        No bank transfer records for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'FACTORIES' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Factory Incomes & Management</h3>
              <p className="text-sm text-gray-500">Manage monthly paysheets and factory registrations</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFactoryModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg font-bold text-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Register Factory
              </button>
              <button
                onClick={() => {
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
                  setShowIncomeModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-sm shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                Record Paysheet
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Monthly Paysheets</h3>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search factory..."
                    value={incomeSearchTerm}
                    onChange={(e) => setIncomeSearchTerm(e.target.value)}
                    className="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredIncomes.map((income) => (
                  <div key={income.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-black text-gray-900 text-lg uppercase tracking-tight">{income.factory?.name || 'Unnamed Factory'}</p>
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">{new Date(0, (income.date?.month || 1) - 1).toLocaleString('default', { month: 'long' })} {income.date?.year}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-green-600 text-xl leading-none">LKR {income.netAmount?.toLocaleString()}</p>
                        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditIncome(income)}
                            className="p-1 px-2 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold transition-colors border border-blue-200"
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDeleteIncome(income.id)}
                            className="p-1 px-2 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition-colors border border-red-200"
                          >
                            DEL
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs border-t border-gray-200 pt-3 mt-1">
                      <div className="flex justify-between col-span-2 mb-2">
                        <span className="text-gray-400 font-medium uppercase">Description:</span>
                        <span className="text-gray-700 font-bold">{income.description || 'Monthly delivery'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium uppercase">Gross Weight:</span>
                        <span className="text-gray-900 font-bold">{income.totalWeight} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium uppercase">Rate:</span>
                        <span className="text-gray-900 font-bold">LKR {income.pricePerKg}/kg</span>
                      </div>
                      <div className="flex justify-between text-red-500">
                        <span className="font-medium uppercase">Transport:</span>
                        <span className="font-bold">-(LKR {income.transportDeduction})</span>
                      </div>
                      <div className="flex justify-between text-red-500">
                        <span className="font-medium uppercase">Deductions:</span>
                        <span className="font-bold">-(LKR {income.otherDeductions})</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredIncomes.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold uppercase tracking-wider">No paysheets recorded</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}


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
                  maxLength={50}
                  pattern="^[A-Za-z0-9 ]+$"
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Factory Name can only contain letters, numbers, and spaces.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
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
                  maxLength={20}
                  pattern="^[A-Za-z0-9\-]+$"
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Registration No can only contain letters, numbers, and hyphens.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
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
                  step="0.01"
                  min="0"
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Price must be a positive value.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
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

      {/* Staff Salary Management Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Staff Salary Management</h3>
                <p className="text-sm text-gray-500">Define fixed monthly salaries for administrative and support staff</p>
              </div>
              <button 
                onClick={() => setShowSalaryModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                title="Close Modal"
              >
                <Plus className="w-6 h-6 rotate-45 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {fixedSalaryWorkers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No staff members found with fixed salary roles.</p>
                  <p className="text-xs text-gray-400 mt-1">Add workers as Supervisor, Driver, Security, etc. in Workforce section first.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="pb-3 font-bold text-gray-700">Staff Member</th>
                        <th className="pb-3 font-bold text-gray-700">Roles</th>
                        <th className="pb-3 font-bold text-gray-700">Monthly Base Salary (LKR)</th>
                        <th className="pb-3 font-bold text-gray-700 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fixedSalaryWorkers.map(w => (
                        <tr key={w.id} className="group hover:bg-gray-50 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                                {w.user?.name?.charAt(0) || 'W'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{w.user?.name || 'Unnamed'}</p>
                                <p className="text-xs text-gray-500">{w.user?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-wrap gap-1">
                              {(w.workerFunctions || '').split(',').map((f: string) => (
                                <span key={f} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                  {f.trim()}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 w-48">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">LKR</span>
                              <input
                                type="number"
                                defaultValue={w.baseSalary || 0}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (val !== w.baseSalary) {
                                    handleUpdateBaseSalary(w.id, val);
                                  }
                                }}
                                className="w-full pl-11 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                              />
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <p className="text-[10px] text-gray-400 italic">Auto-saves on blur</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowSalaryModal(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-all active:scale-95"
              >
                Done
              </button>
            </div>
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
                  min="0.01"
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Weight must be a positive value greater than zero.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    value={deliveryFormData.weight ?? ''}
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
                    min="0"
                    readOnly
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Gross weight must be a non-negative value.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    value={incomeFormData.totalWeight ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed outline-none text-gray-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rate per Kg (LKR) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Rate must be a non-negative value.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    value={incomeFormData.pricePerKg ?? ''}
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
                    min="0"
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Transport deduction cannot be negative.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    value={incomeFormData.transportDeduction ?? ''}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, transportDeduction: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 text-red-500">Other Cutouts (LKR)</label>
                   <input
                    type="number"
                    min="0"
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Other deductions cannot be negative.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    value={incomeFormData.otherDeductions ?? ''}
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
                    min="2000"
                    max="2100"
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Please enter a valid year.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
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
                  min="0"
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Bonus cannot be negative.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  value={editingPayroll.bonuses ?? ''}
                  onChange={(e) => setEditingPayroll({ ...editingPayroll, bonuses: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Deductions (LKR)</label>
                <input
                  type="number"
                  min="0"
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Deduction cannot be negative.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  value={editingPayroll.deductions ?? ''}
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


      {/* Payment Selection Modal */}
      {showPaymentModal && selectedPayrollForPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 text-center border-b border-gray-100 bg-blue-50">
              <h2 className="text-xl font-bold text-blue-900 mb-1">Select Payment Method</h2>
              <p className="text-sm text-blue-700">Payment for {selectedPayrollForPayment.worker.user?.name}</p>
            </div>
            
            <div className="p-6 space-y-3">
              <button
                onClick={() => handleSelectBankTransfer()}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-white border-2 border-transparent hover:border-blue-600 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Bank Transfer</p>
                    <p className="text-xs text-gray-500">Add to Processing List</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600" />
              </button>

              <button
                onClick={() => handleConfirmPayment('CASH')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-white border-2 border-transparent hover:border-green-600 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Hand it Over (Cash)</p>
                    <p className="text-xs text-gray-500">Requires worker QR scan</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-600" />
              </button>
            </div>

            <div className="px-6 py-4 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && selectedPayrollForPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70] backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-50">
              <div>
                <h2 className="text-lg font-bold text-green-900">Scan Worker QR</h2>
                <p className="text-xs text-green-700">Verifying payment for {selectedPayrollForPayment.worker.user?.name}</p>
              </div>
              <button
                onClick={() => setShowQRScanner(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="p-8 flex flex-col items-center">
              <div id="qr-reader" className="w-full max-w-[300px] border-4 border-green-500 rounded-2xl overflow-hidden shadow-lg relative min-h-[300px] bg-black flex items-center justify-center">
                  <div className="text-xs text-white absolute top-4 z-10 bg-black/50 px-2 py-1 rounded">Position QR in center</div>
                  {/* html5-qrcode renderer will mount here */}
              </div>
              
              {qrError && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2 animate-bounce">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {qrError}
                </div>
              )}

              <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 text-left">
                   <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                   <div>
                        <p className="text-sm font-bold text-blue-900">Wait for Worker QR</p>
                        <p className="text-xs text-blue-700 leading-relaxed mt-1">Please ask the worker to show their ID card QR code. Once scanned successfully, the payment will be recorded instantly.</p>
                   </div>
              </div>
            </div>

            <QRScannerLogic onScanSuccess={handleQRScanSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}

// Separate component for QR Scanner Logic to handle lifecycle correctly
function QRScannerLogic({ onScanSuccess }: { onScanSuccess: (text: string) => void }) {
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, 
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          () => {} // silence errors to avoid console noise
        );
      } catch (err) {
        console.error("Unable to start scanning:", err);
      }
    };

    startScanner();

    return () => {
      const stopScanner = async () => {
        try {
          if (html5QrCode.isScanning) {
            await html5QrCode.stop();
          }
          html5QrCode.clear();
        } catch (err) {
          console.error("Failed to stop scanner:", err);
        }
      };
      stopScanner();
    };
  }, [onScanSuccess]);

  return null;
}

