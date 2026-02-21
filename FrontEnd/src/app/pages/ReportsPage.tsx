import { useState } from 'react';
import { Download, FileText, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';

export function ReportsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const plantationId = user?.publicMetadata?.plantationId as string | undefined;

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: string, title: string) => {
    if (!plantationId) return;
    setDownloading(type);
    try {
      const token = await getToken();
      let blob: Blob;

      switch (type) {
        case 'harvest':
          blob = await api.downloadHarvestReport(plantationId, selectedMonth, token || undefined);
          break;
        case 'payroll':
          blob = await api.downloadPayrollReport(plantationId, selectedMonth, token || undefined);
          break;
        case 'inventory':
          blob = await api.downloadInventoryReport(plantationId, selectedMonth, token || undefined);
          break;
        case 'financial':
          blob = await api.downloadFinancialReport(plantationId, selectedMonth, token || undefined);
          break;
        case 'income-analysis':
          blob = await api.downloadIncomeAnalysisReport(plantationId, selectedMonth, token || undefined);
          break;
        default:
          throw new Error('Invalid report type');
      }

      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Revoke the object URL after a delay to ensure the browser has loaded the PDF
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to generate report. Please ensure there is data for the selected month.');
    } finally {
      setDownloading(null);
    }
  };

  const reports = [
    {
      id: 'harvest',
      title: 'Plantation Performance',
      description: 'Comprehensive overview of harvest yields and worker productivity',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-700',
    },
    {
      id: 'payroll',
      title: 'Worker Payroll Registry',
      description: 'Complete breakdown of wages, bonuses, and deductions',
      icon: FileText,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'inventory',
      title: 'Resource Usage Report',
      description: 'Tracking of operational resources and inventory flow',
      icon: Calendar,
      color: 'bg-orange-100 text-orange-700',
    },
    {
      id: 'financial',
      title: 'Financial Summary & Analysis',
      description: 'Monthly profit/loss statement with revenue and expense charts',
      icon: TrendingUp,
      color: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'income-analysis',
      title: 'Income Analysis (Factory-wise)',
      description: 'Breakdown of income and weight delivered across multiple factories',
      icon: FileText,
      color: 'bg-rose-100 text-rose-700',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate and export plantation reports</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <label className="text-sm font-semibold text-gray-700">Report Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 outline-none text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          const isDownloading = downloading === report.id;
          return (
            <div key={report.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${report.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{report.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                  <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wider">
                    Scope: {new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </p>
                  <button
                    onClick={() => handleDownload(report.id, report.title)}
                    disabled={!!downloading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-2">Need a different report?</h3>
        <p className="text-sm text-green-800 mb-4">
          Contact our support team to request custom analytics or specialized data exports for your plantation.
        </p>
        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
          Contact Support
        </button>
      </div>
    </div>
  );
}

