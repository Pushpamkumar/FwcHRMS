'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Users,
  UserCheck,
  CalendarDays,
  Briefcase,
  Brain,
  Activity,
  Plus,
  Loader2,
  AlertCircle,
  FileCheck2,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Check,
  X,
  ChevronRight
} from 'lucide-react';

interface Stats {
  totalEmployees: number;
  attendanceRate: number;
  monthlyPayroll: string;
  avgPerformance: number;
}

interface DeptHeadcount {
  name: string;
  count: number;
  performance: number;
}

interface ActiveTodayItem {
  employeeId: string;
  name: string;
  designation: string;
  status: 'In Office' | 'Remote' | 'On Leave' | 'Client Site';
  checkIn?: string;
}

interface SystemAlert {
  id: string;
  type: 'compliance' | 'payroll' | 'onboarding' | 'recruitment' | 'leave';
  title: string;
  description: string;
  status: 'pending' | 'resolved' | 'rejected';
  action_label?: string;
  metadata?: {
    leaveRequestId?: string;
  };
}

interface PayrollBreakdownItem {
  department: string;
  monthlyPayroll: string;
  trend: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [deptHeadcount, setDeptHeadcount] = useState<DeptHeadcount[]>([]);
  const [activeToday, setActiveToday] = useState<ActiveTodayItem[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [payrollBreakdown, setPayrollBreakdown] = useState<PayrollBreakdownItem[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [attendanceHeatmap, setAttendanceHeatmap] = useState<{ date: string; count: number }[]>([]);
  const [performanceDistribution, setPerformanceDistribution] = useState<{ exceptional: number; meetsExpectations: number } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [actioningAlertId, setActioningAlertId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setError('');
      const response = await api.get('/employees/admin-stats');
      const data = response.data;
      setStats(data.stats);
      setDeptHeadcount(data.departmentHeadcount);
      setInsights(data.insights);
      setActiveToday(data.activeToday);
      setSystemAlerts(data.systemAlerts);
      setAttendanceHeatmap(data.attendanceHeatmap);
      setPerformanceDistribution(data.performanceDistribution);
      setPayrollBreakdown(data.payrollBreakdown);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to fetch dashboard metrics. Verify database connections.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await api.get('/employees/export-report', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `workforce_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Failed to export report:', err);
      setError('Failed to export CSV workforce report.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAlertAction = async (alert: SystemAlert, status: 'approved' | 'rejected' | 'resolved') => {
    try {
      setActioningAlertId(alert.id);
      if (alert.type === 'leave' && alert.metadata?.leaveRequestId) {
        // Leave approval
        await api.put(`/leaves/requests/${alert.metadata.leaveRequestId}`, {
          status: status === 'approved' ? 'approved' : 'rejected'
        });
      } else {
        // System alerts action
        await api.post(`/employees/alerts/${alert.id}/action`, {
          status: status === 'approved' || status === 'resolved' ? 'resolved' : 'rejected'
        });
      }
      await loadDashboardData();
    } catch (err) {
      console.error('Alert action error:', err);
      setError('Failed to process alert action request.');
    } finally {
      setActioningAlertId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020105]">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <span className="text-xs text-indigo-200/50 uppercase font-bold tracking-widest font-mono">
          Assembling Control Dashboard...
        </span>
      </div>
    );
  }

  // Format today's date
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options) + ' - Live';
  };

  // Get department bar color
  const getDeptColorClass = (code: string) => {
    switch (code) {
      case 'ENG': return 'bg-blue-500';
      case 'HR': return 'bg-emerald-500';
      case 'MKT': return 'bg-yellow-500';
      case 'FIN': return 'bg-purple-500';
      case 'OPS': return 'bg-cyan-500';
      default: return 'bg-indigo-500';
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in text-slate-100">
      {/* Title Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/[0.04] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">Command Dashboard</h1>
          <p className="text-indigo-200/40 text-xs mt-1.5 font-mono">
            {getFormattedDate()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center space-x-2 px-4.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/15 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Export Report</span>
          </button>
          
          <div className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-medium text-slate-300">
            Jun 2026
          </div>
          
          <button
            onClick={loadDashboardData}
            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] text-slate-300 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 px-5 py-4 rounded-2xl text-xs flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Indicators Statistics Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Card 1: Total Employees */}
          <div className="relative overflow-hidden bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl hover:border-white/[0.1] transition-all flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono">Total Employees</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-white">{stats.totalEmployees.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">+2.4%</span>
              </div>
            </div>
            {/* Sparkline Visual */}
            <svg className="w-20 h-10 shrink-0 opacity-60" viewBox="0 0 100 30">
              <path d="M 0 25 Q 25 10 50 15 T 100 5" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Card 2: Attendance Rate */}
          <div className="relative overflow-hidden bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl hover:border-white/[0.1] transition-all flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono">Attendance Rate</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-white">{stats.attendanceRate}%</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">+1.1%</span>
              </div>
            </div>
            <svg className="w-20 h-10 shrink-0 opacity-60" viewBox="0 0 100 30">
              <path d="M 0 20 Q 25 25 50 12 T 100 8" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Card 3: Monthly Payroll */}
          <div className="relative overflow-hidden bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl hover:border-white/[0.1] transition-all flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono">Monthly Payroll</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-white">{stats.monthlyPayroll}</span>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full">-0.5%</span>
              </div>
            </div>
            <svg className="w-20 h-10 shrink-0 opacity-60" viewBox="0 0 100 30">
              <path d="M 0 15 Q 25 8 50 22 T 100 18" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Card 4: Avg Performance */}
          <div className="relative overflow-hidden bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl hover:border-white/[0.1] transition-all flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono">Avg Performance</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-white">{stats.avgPerformance}%</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">+0.8%</span>
              </div>
            </div>
            <svg className="w-20 h-10 shrink-0 opacity-60" viewBox="0 0 100 30">
              <path d="M 0 25 Q 25 20 50 10 T 100 4" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      {/* Main Multi-grid Dashboard layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (Headcounts, Active directories, Heatmaps) - 7 cols */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Department Headcount & Performance */}
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Department Headcount & Performance</h2>
            <div className="space-y-5">
              {deptHeadcount.map((dept, index) => {
                // Determine a code fallback to select background
                const mockCodes = ['ENG', 'HR', 'MKT', 'FIN', 'OPS'];
                const code = mockCodes[index % mockCodes.length];
                const headcountPercent = Math.min(100, (dept.count / 20) * 100);
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span className="hover:text-white transition-colors">{dept.name}</span>
                      <span className="font-mono text-indigo-300">{dept.count} • {dept.performance}% Perf</span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getDeptColorClass(code)} rounded-full transition-all duration-1000`}
                        style={{ width: `${headcountPercent || 15}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Today directory */}
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Active Today</h2>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
                {activeToday.length} Active
              </span>
            </div>
            
            <div className="divide-y divide-white/[0.03] max-h-[300px] overflow-y-auto pr-1">
              {activeToday.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center space-x-3">
                    <div className="h-8.5 w-8.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center font-bold text-indigo-300 text-xs">
                      {getInitials(item.name)}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">{item.name}</span>
                      <span className="text-[10px] text-indigo-200/40 mt-0.5 block">{item.designation}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                    item.status === 'In Office' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    item.status === 'Remote' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                    item.status === 'On Leave' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Heatmap */}
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Attendance Heatmap — 2026</h2>
            
            {/* Calendar Heatmap Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 text-center text-[9px] uppercase font-bold text-indigo-300/40 tracking-widest font-mono">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                  <span key={idx}>{month}</span>
                ))}
              </div>
              
              <div className="grid grid-cols-12 gap-2">
                {(() => {
                  // Precompute the maximum block sum of the year for dynamic color scaling
                  const maxBlockValue = Math.max(
                    ...Array.from({ length: 12 }).flatMap((_, mIdx) => {
                      const targetMonthStr = String(mIdx + 1).padStart(2, '0');
                      const mData = attendanceHeatmap.filter(item => item.date.split('-')[1] === targetMonthStr);
                      return Array.from({ length: 8 }).map((_, bIdx) => {
                        const dayStart = bIdx * 4 + 1;
                        const dayEnd = bIdx === 7 ? 31 : (bIdx + 1) * 4;
                        return mData.reduce((sum, item) => {
                          const day = parseInt(item.date.split('-')[2], 10);
                          return (day >= dayStart && day <= dayEnd) ? sum + item.count : sum;
                        }, 0);
                      });
                    }),
                    1 // Fall back to 1 to avoid division by zero
                  );

                  return Array.from({ length: 12 }).map((_, monthIdx) => {
                    const targetMonthStr = String(monthIdx + 1).padStart(2, '0');
                    const monthData = attendanceHeatmap.filter(item => item.date.split('-')[1] === targetMonthStr);

                    return (
                      <div key={monthIdx} className="grid grid-cols-4 gap-1">
                        {Array.from({ length: 8 }).map((_, blockIdx) => {
                          const dayStart = blockIdx * 4 + 1;
                          const dayEnd = blockIdx === 7 ? 31 : (blockIdx + 1) * 4;
                          
                          // Sum check-ins for the days in this block range
                          const blockSum = monthData.reduce((sum, item) => {
                            const day = parseInt(item.date.split('-')[2], 10);
                            if (day >= dayStart && day <= dayEnd) {
                              return sum + item.count;
                            }
                            return sum;
                          }, 0);

                          const ratio = blockSum / maxBlockValue;
                          let bgClass = 'bg-indigo-950/20';
                          if (blockSum > 0) {
                            if (ratio >= 0.75) bgClass = 'bg-indigo-300';
                            else if (ratio >= 0.5) bgClass = 'bg-indigo-400/70';
                            else if (ratio >= 0.25) bgClass = 'bg-indigo-500/50';
                            else bgClass = 'bg-indigo-600/30';
                          }

                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          const dateRangeText = `${monthNames[monthIdx]} ${dayStart}-${dayEnd}`;

                          return (
                            <div
                              key={blockIdx}
                              className={`h-3.5 rounded-sm ${bgClass} transition-colors hover:scale-110 cursor-pointer`}
                              title={`${dateRangeText}: ${blockSum} check-ins`}
                            />
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
              
              <div className="flex items-center justify-between text-[9px] font-bold text-indigo-300/30 font-mono tracking-widest uppercase">
                <span>Less active</span>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 rounded-sm bg-indigo-950/20" />
                  <div className="h-2 w-2 rounded-sm bg-indigo-600/30" />
                  <div className="h-2 w-2 rounded-sm bg-indigo-500/50" />
                  <div className="h-2 w-2 rounded-sm bg-indigo-400/70" />
                  <div className="h-2 w-2 rounded-sm bg-indigo-300" />
                </div>
                <span>More active</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (AI feeds, Interactive Alerts, payroll tables) - 5 cols */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* AI Intelligence Feed */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/10 via-white/[0.01] to-purple-950/10 border border-indigo-500/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="absolute top-0 right-0 p-8 text-indigo-500/5 pointer-events-none">
              <Brain className="h-32 w-32" />
            </div>
            <div className="flex items-center space-x-2.5">
              <Brain className="h-5 w-5 text-indigo-400 animate-pulse" />
              <h2 className="text-sm font-bold tracking-wider uppercase text-white font-sans">AI Intelligence Feed</h2>
            </div>
            
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                  <span className="text-indigo-400 font-bold font-mono">#0{idx + 1}</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Alerts - Actionable with Approve, Disapprove, Reject, Accept */}
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-bold tracking-wider uppercase text-white font-sans">System Alerts & Actions</h2>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {systemAlerts.length === 0 ? (
                <div className="text-center py-6 text-indigo-200/20 text-xs font-mono">
                  No pending alerts or action approvals.
                </div>
              ) : (
                systemAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase font-mono ${
                          alert.type === 'leave' ? 'bg-amber-500/10 text-amber-400' :
                          alert.type === 'payroll' ? 'bg-purple-500/10 text-purple-400' :
                          alert.type === 'compliance' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {alert.type}
                        </span>
                        <h3 className="text-xs font-bold text-white mt-2 leading-snug">{alert.title}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{alert.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1.5 border-t border-white/[0.02]">
                      <button
                        onClick={() => handleAlertAction(alert, 'rejected')}
                        disabled={actioningAlertId !== null}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-[10px] font-semibold tracking-wider uppercase transition-all disabled:opacity-50"
                      >
                        {alert.type === 'leave' ? 'Reject' : 'Disapprove'}
                      </button>
                      <button
                        onClick={() => handleAlertAction(alert, alert.type === 'leave' ? 'approved' : 'resolved')}
                        disabled={actioningAlertId !== null}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold tracking-wider uppercase transition-all disabled:opacity-50"
                      >
                        {actioningAlertId === alert.id ? (
                          <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" />
                        ) : null}
                        {alert.type === 'leave' ? 'Accept' : 'Approve'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payroll Breakdown */}
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Payroll Breakdown</h2>
            <div className="space-y-3">
              {payrollBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                  <span className="text-xs font-semibold text-slate-300">{item.department}</span>
                  <div className="flex items-center space-x-3 text-xs font-semibold">
                    <span className="text-white font-mono">{item.monthlyPayroll}</span>
                    <span className={`font-mono text-[10px] font-bold ${
                      item.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {item.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Distribution */}
          {performanceDistribution && (
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-5">
              <h2 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Performance Distribution</h2>
              
              <div className="space-y-4.5 text-xs font-semibold text-slate-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <span>Exceptional (A+)</span>
                  </div>
                  <span className="font-mono text-white">{performanceDistribution.exceptional} employees</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-950/80 border border-indigo-500/20" />
                    <span>Meets Expectations (A)</span>
                  </div>
                  <span className="font-mono text-white">{performanceDistribution.meetsExpectations} employees</span>
                </div>

                {/* Progress Visual Bar */}
                <div className="h-2.5 w-full bg-white/[0.03] rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-indigo-500" 
                    style={{ width: `${(performanceDistribution.exceptional / (performanceDistribution.exceptional + performanceDistribution.meetsExpectations)) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-indigo-950/85 border-l border-white/5" 
                    style={{ width: `${(performanceDistribution.meetsExpectations / (performanceDistribution.exceptional + performanceDistribution.meetsExpectations)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
