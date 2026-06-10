'use client';
 
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  DollarSign,
  FileCheck2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
 
interface PayrollRun {
  employee_id: string;
  month: number;
  year: number;
  working_days: number;
  present_days: string;
  lop_days: string;
  gross_salary: string;
  total_deductions: string;
  net_salary: string;
  payslip_url?: string;
  status: string;
  processed_at?: string;
}
 
export default function PayrollEngine() {
  const [month, setMonth] = useState('6'); // default June
  const [year, setYear] = useState('2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [processedRuns, setProcessedRuns] = useState<PayrollRun[]>([]);
 
  const fetchMonthlyRuns = async () => {
    try {
      const response = await api.get(`/payroll/runs/${month}/${year}`);
      setProcessedRuns(response.data || []);
    } catch (err) {
      console.error('Failed to fetch monthly payroll runs:', err);
    }
  };
 
  useEffect(() => {
    fetchMonthlyRuns();
  }, [month, year]);
 
  // Mock department cost chart datasets based on seeder salaries
  const costReportData = [
    { name: 'Engineering', cost: 2850000 / 12 },
    { name: 'HR', cost: 1120000 / 12 },
    { name: 'Marketing & Sales', cost: 1350000 / 12 },
    { name: 'Finance', cost: 1350000 / 12 },
    { name: 'Operations', cost: 1200000 / 12 }
  ];
 
  const handleRunPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
 
    try {
      const response = await api.post('/payroll/run', {
        month: parseInt(month),
        year: parseInt(year)
      });
      
      const data = response.data;
      setSuccessMsg(data.message || 'Payroll processed successfully.');
      if (data.runs) {
        setProcessedRuns(data.runs);
      } else {
        await fetchMonthlyRuns();
      }
    } catch (err: any) {
      console.error('Run payroll failed:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to execute payroll run.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Payroll Engine</h1>
        <p className="text-indigo-200/50 text-xs mt-1">
          Calculate monthly CTC payouts, generate payslip PDFs, and analyze department payroll costs.
        </p>
      </div>

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-200 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="h-4.5 w-4.5 text-green-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2 animate-fade-in">
          <AlertCircle className="h-4.5 w-4.5 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Run Payroll Panel */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/[0.04] pb-2 flex items-center space-x-2">
            <CalendarDays className="h-4.5 w-4.5 text-indigo-400" />
            <span>Process Monthly Payouts</span>
          </h2>

          <form onSubmit={handleRunPayroll} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-indigo-200/70 mb-1.5">Select Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-200/70 mb-1.5">Select Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-[0_4px_20px_rgba(99,102,241,0.25)] transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin mr-1.5" />
                  Processing Payouts...
                </>
              ) : (
                'Run Monthly Payroll'
              )}
            </button>
          </form>
        </div>

        {/* Cost Analysis Chart */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 shadow-xl lg:col-span-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center space-x-2">
            <DollarSign className="h-4.5 w-4.5 text-indigo-400" />
            <span>Monthly Payout Cost by Department</span>
          </h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costReportData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [`₹${Math.round(value).toLocaleString()}`, 'Monthly Cost']}
                  contentStyle={{ backgroundColor: '#090514', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="cost" fill="url(#colorBarGrad)" radius={[8, 8, 0, 0]}>
                  <defs>
                    <linearGradient id="colorBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Processed Runs Table Results */}
      {processedRuns.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-xl animate-slide-in">
          <div className="p-6 border-b border-white/[0.05] bg-white/[0.01]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <FileCheck2 className="h-4.5 w-4.5 text-indigo-400" />
              <span>Processed Payroll Runs Summary (Month: {month}/{year})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.005] text-[10px] uppercase font-bold tracking-wider text-indigo-200/40">
                  <th className="py-4 px-6">Employee ID</th>
                  <th className="py-4 px-6">Attendance Stats</th>
                  <th className="py-4 px-6">Gross Pay</th>
                  <th className="py-4 px-6">Deductions</th>
                  <th className="py-4 px-6">Net Salary</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-xs font-medium text-indigo-100">
                {processedRuns.map((run) => (
                  <tr key={run.employee_id} className="hover:bg-white/[0.01]">
                    <td className="py-4 px-6 font-bold text-white font-mono">{run.employee_id}</td>
                    <td className="py-4 px-6">
                      <span className="block">Worked: {parseFloat(run.present_days)}/{run.working_days} days</span>
                      {parseFloat(run.lop_days) > 0 && (
                        <span className="block text-yellow-400 text-[10px]">LOP: {parseFloat(run.lop_days)} days</span>
                      )}
                    </td>
                    <td className="py-4 px-6">₹{Math.round(parseFloat(run.gross_salary)).toLocaleString()}</td>
                    <td className="py-4 px-6">₹{Math.round(parseFloat(run.total_deductions)).toLocaleString()}</td>
                    <td className="py-4 px-6 text-green-400">
                      ₹{Math.round(parseFloat(run.net_salary)).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
                        {run.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {run.payslip_url && (
                        <a
                          href={run.payslip_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-bold"
                        >
                          <Download className="h-4 w-4" />
                          <span>PDF</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
