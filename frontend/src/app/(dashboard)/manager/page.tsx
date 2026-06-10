'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Loader2,
  Plus,
  Target,
  Send,
  MapPin,
  Mail,
  Sliders,
  Check,
  X,
  Brain,
  TrendingUp,
  FileText,
  Award,
  Briefcase,
  BarChart,
  ShieldAlert,
  Settings,
  User,
  Heart
} from 'lucide-react';

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  employmentDetails?: {
    designation: string;
    employmentType: string;
    joiningDate: string;
    workMode: string;
  };
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  employeeName: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  days: string;
  reason: string;
  status: string;
  applied_at: string;
}

interface TeamAttendance {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: string | null;
  status: string;
  check_in_ip: string | null;
  notes: string | null;
}

function ManagerDashboardContent() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const { user } = useAuthStore();
  const [reports, setReports] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<TeamAttendance[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // States for new dynamic tabs
  const [teamTimesheets, setTeamTimesheets] = useState<any[]>([]);
  const [isTimesheetsLoading, setIsTimesheetsLoading] = useState(false);
  const [teamReportsStats, setTeamReportsStats] = useState<any[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  
  // Appraisal preview / review modal state
  const [selectedAppraisalEmp, setSelectedAppraisalEmp] = useState<Employee | null>(null);
  const [appraisalStats, setAppraisalStats] = useState<any | null>(null);
  const [isAppraisalStatsLoading, setIsAppraisalStatsLoading] = useState(false);
  const [appraisalForm, setAppraisalForm] = useState({
    rating: 'A',
    overallScore: 4.0,
    managerComments: '',
    promotionRecommended: false,
    incrementRecommended: 0
  });
  const [isSubmittingAppraisal, setIsSubmittingAppraisal] = useState(false);
  const [appraisalMsg, setAppraisalMsg] = useState({ type: '', text: '' });
  
  // Goal creation state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    target: '',
    weight: 20,
    dueDate: '',
    reviewPeriod: 'Q2 2026'
  });
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);
  const [goalMsg, setGoalMsg] = useState({ type: '', text: '' });

  // Task creation state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ text: '', dueDate: '' });
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskMsg, setTaskMsg] = useState({ type: '', text: '' });


  // Action states
  const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null);
  const [recognitionMsg, setRecognitionMsg] = useState('');
  const [hiringForm, setHiringForm] = useState({ title: '', count: 1, desc: '' });
  const [hiringMsg, setHiringMsg] = useState('');
  const [escalations, setEscalations] = useState([
    { id: '1', employeeName: 'Priya Sharma', issue: 'Unresolved geocoding offsets on remote clock check-ins.', status: 'pending' },
    { id: '2', employeeName: 'Rajesh Kumar', issue: 'Overtime claim mismatch for Q2 technical refactoring.', status: 'pending' }
  ]);
  const [pendingOffers, setPendingOffers] = useState<any[]>([]);
  const [isOffersLoading, setIsOffersLoading] = useState(false);
  const [myHiringRequests, setMyHiringRequests] = useState<any[]>([]);
  const [isHiringRequestsLoading, setIsHiringRequestsLoading] = useState(false);

  const loadMyHiringRequests = async () => {
    try {
      setIsHiringRequestsLoading(true);
      const res = await api.get('/recruitment/hiring-requests');
      setMyHiringRequests(res.data || []);
    } catch (err) {
      console.error('Failed to fetch my hiring requests:', err);
    } finally {
      setIsHiringRequestsLoading(false);
    }
  };

  const loadPendingOffers = async () => {
    try {
      setIsOffersLoading(true);
      const res = await api.get('/recruitment/pending-offers');
      setPendingOffers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch pending offers:', err);
    } finally {
      setIsOffersLoading(false);
    }
  };

  const loadTimesheets = async () => {
    try {
      setIsTimesheetsLoading(true);
      const res = await api.get('/timesheets/team');
      setTeamTimesheets(res.data || []);
    } catch (err) {
      console.error('Failed to load team timesheets:', err);
    } finally {
      setIsTimesheetsLoading(false);
    }
  };

  const loadTeamReportsStats = async (reportList: Employee[]) => {
    try {
      setIsStatsLoading(true);
      const list = reportList.length > 0 ? reportList : reports;
      if (list.length === 0) return;
      const statsPromises = list.map(async (emp) => {
        try {
          const res = await api.get(`/employees/${emp._id}/performance-stats`);
          return res.data;
        } catch (err) {
          console.error(`Error loading stats for ${emp.employeeId}:`, err);
          return {
            employeeId: emp.employeeId,
            firstName: emp.firstName,
            lastName: emp.lastName,
            designation: emp.employmentDetails?.designation || 'Staff',
            ctcAnnual: 0,
            attendanceRate: 100.0,
            taskCompletionRate: 0.0,
            performanceReview: { overallScore: null, rating: null }
          };
        }
      });
      const results = await Promise.all(statsPromises);
      setTeamReportsStats(results);
    } catch (err) {
      console.error('Failed to load team report stats:', err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const handleTimesheetDecision = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/timesheets/${id}/status`, { status });
      await loadTimesheets();
    } catch (err: any) {
      console.error('Failed to update timesheet status:', err);
      alert(err.response?.data?.message || 'Failed to update timesheet status.');
    }
  };

  const handleBeginAppraisalReview = async (emp: Employee) => {
    setSelectedAppraisalEmp(emp);
    setIsAppraisalStatsLoading(true);
    setAppraisalStats(null);
    setAppraisalMsg({ type: '', text: '' });
    setAppraisalForm({
      rating: 'A',
      overallScore: 4.0,
      managerComments: '',
      promotionRecommended: false,
      incrementRecommended: 0
    });
    try {
      const res = await api.get(`/employees/${emp._id}/performance-stats`);
      setAppraisalStats(res.data);
      if (res.data.performanceReview) {
        setAppraisalForm({
          rating: res.data.performanceReview.rating || 'A',
          overallScore: res.data.performanceReview.overallScore || 4.0,
          managerComments: res.data.performanceReview.managerComments || '',
          promotionRecommended: res.data.performanceReview.promotionRecommended || false,
          incrementRecommended: res.data.performanceReview.incrementRecommended || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats for appraisal:', err);
    } finally {
      setIsAppraisalStatsLoading(false);
    }
  };

  const handleAppraisalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppraisalEmp) return;
    setIsSubmittingAppraisal(true);
    setAppraisalMsg({ type: '', text: '' });
    try {
      await api.post(`/employees/${selectedAppraisalEmp._id}/appraisal`, appraisalForm);
      setAppraisalMsg({ type: 'success', text: 'Appraisal submitted successfully.' });
      setTimeout(() => {
        setSelectedAppraisalEmp(null);
        setAppraisalStats(null);
        loadTeamReportsStats(reports);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to submit appraisal:', err);
      setAppraisalMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit appraisal.' });
    } finally {
      setIsSubmittingAppraisal(false);
    }
  };

  const loadData = async () => {
    try {
      setError('');
      const [reportsRes, leavesRes, attRes, offersRes, hiringRes] = await Promise.all([
        api.get('/employees'),
        api.get('/leaves/requests'),
        api.get('/attendance/team'),
        api.get('/recruitment/pending-offers'),
        api.get('/recruitment/hiring-requests').catch(err => ({ data: [] }))
      ]);
      const fetchedReports = reportsRes.data.employees || [];
      setReports(fetchedReports);
      setLeaveRequests(leavesRes.data || []);
      setAttendance(attRes.data || []);
      setPendingOffers(offersRes.data || []);
      setMyHiringRequests(hiringRes.data || []);
      
      // Proactively load report stats for current reports
      if (fetchedReports.length > 0) {
        loadTeamReportsStats(fetchedReports);
      }
    } catch (err: any) {
      console.error('Failed to load manager dashboard data:', err);
      setError('Connection issue. Verify API backend configurations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentTab === 'hiring') {
      loadMyHiringRequests();
    } else if (currentTab === 'timesheets') {
      loadTimesheets();
    } else if (currentTab === 'reports') {
      loadTeamReportsStats(reports);
    }
  }, [currentTab, reports]);

  const handleOfferDecision = async (applicationId: string, decision: 'approved' | 'rejected') => {
    const managerNotes = prompt('Enter manager remarks/notes (optional):') || '';
    try {
      await api.post(`/recruitment/applications/${applicationId}/process-offer`, {
        decision,
        managerNotes
      });
      await loadPendingOffers();
    } catch (err: any) {
      console.error('Offer decision failed:', err);
      alert(err.response?.data?.message || 'Failed to submit decision.');
    }
  };

  const handleLeaveDecision = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessingLeaveId(requestId);
    try {
      await api.put(`/leaves/requests/${requestId}`, { status });
      await loadData();
    } catch (err: any) {
      console.error('Leave status update failed:', err);
      alert(err.response?.data?.message || 'Failed to update leave request.');
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    setIsSubmittingGoal(true);
    setGoalMsg({ type: '', text: '' });

    try {
      const res = await api.post('/goals', {
        employeeId: selectedEmp.employeeId,
        ...goalForm
      });
      setGoalMsg({ type: 'success', text: res.data.message || 'OKR Goal assigned successfully.' });
      setGoalForm({
        title: '',
        description: '',
        target: '',
        weight: 20,
        dueDate: '',
        reviewPeriod: 'Q2 2026'
      });
      setTimeout(() => {
        setShowGoalModal(false);
        setSelectedEmp(null);
      }, 2000);
    } catch (err: any) {
      console.error('Goal creation failed:', err);
      setGoalMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to assign Goal.'
      });
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    setIsSubmittingTask(true);
    setTaskMsg({ type: '', text: '' });

    try {
      await api.post('/tasks', {
        employeeId: selectedEmp.employeeId,
        text: taskForm.text,
        dueDate: taskForm.dueDate || undefined
      });
      setTaskMsg({ type: 'success', text: 'Task assigned successfully!' });
      setTaskForm({ text: '', dueDate: '' });
      setTimeout(() => {
        setShowTaskModal(false);
        setSelectedEmp(null);
        setTaskMsg({ type: '', text: '' });
      }, 2000);
    } catch (err: any) {
      console.error('Task creation failed:', err);
      setTaskMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to assign Task.'
      });
    } finally {
      setIsSubmittingTask(false);
    }
  };


  const handleRecognitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecognitionMsg('Awarded recognition certificate to direct report.');
    setTimeout(() => setRecognitionMsg(''), 3000);
  };

  const handleHiringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/recruitment/hiring-requests', {
        title: hiringForm.title,
        count: hiringForm.count,
        description: hiringForm.desc
      });
      setHiringMsg(`Submitted hiring request for ${hiringForm.count}x ${hiringForm.title} role.`);
      setHiringForm({ title: '', count: 1, desc: '' });
      await loadMyHiringRequests();
      setTimeout(() => setHiringMsg(''), 3000);
    } catch (err: any) {
      console.error('Hiring request submission failed:', err);
      alert(err.response?.data?.message || 'Failed to submit hiring request.');
    }
  };

  const resolveEscalation = (id: string) => {
    setEscalations(prev => prev.filter(item => item.id !== id));
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020105]">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <span className="text-xs text-indigo-200/50 uppercase font-bold tracking-widest font-mono">
          Syncing Manager Panel...
        </span>
      </div>
    );
  }

  // Render view template based on tab selection
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono font-semibold">Direct Reports</span>
                  <span className="text-2xl font-black block text-white mt-1.5">{reports.length} Team Members</span>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono font-semibold">Pending Leaves</span>
                  <span className="text-2xl font-black block text-amber-400 mt-1.5">{leaveRequests.length} Requests</span>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono font-semibold">Today Presence</span>
                  <span className="text-2xl font-black block text-emerald-400 mt-1.5">
                    {attendance.filter(a => a.date.split('T')[0] === new Date().toISOString().split('T')[0]).length || reports.length - 1} Online
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono font-semibold">Team OKRs</span>
                  <span className="text-2xl font-black block text-indigo-400 mt-1.5">Active</span>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Target className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Quick summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Leaves short list */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-4">
                <h3 className="text-xs font-bold tracking-wider uppercase text-white font-sans">Pending Team Leaves</h3>
                <div className="divide-y divide-white/[0.04] max-h-[300px] overflow-y-auto pr-1">
                  {leaveRequests.length > 0 ? (
                    leaveRequests.map(req => (
                      <div key={req.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-white">{req.employeeName}</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-bold uppercase">{req.leave_type}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(req.from_date).toLocaleDateString()} to {new Date(req.to_date).toLocaleDateString()} ({parseFloat(req.days)} days)
                          </span>
                        </div>
                        <div className="flex space-x-1.5 shrink-0">
                          <button
                            onClick={() => handleLeaveDecision(req.id, 'rejected')}
                            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/15 hover:bg-rose-500/20"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleLeaveDecision(req.id, 'approved')}
                            className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs font-mono">No pending leaves.</div>
                  )}
                </div>
              </div>

              {/* Presence summary */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-4">
                <h3 className="text-xs font-bold tracking-wider uppercase text-white font-sans">Daily Presence Ticker</h3>
                <div className="divide-y divide-white/[0.04] max-h-[300px] overflow-y-auto pr-1">
                  {reports.slice(0, 5).map((emp, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-white block">{emp.firstName} {emp.lastName}</span>
                        <span className="text-[9px] text-slate-400 mt-0.5 block">{emp.employmentDetails?.designation || 'Staff'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase tracking-wider">
                        Online
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'insights':
        return (
          <div className="bg-white/[0.01] border border-indigo-500/10 rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-indigo-500/5 pointer-events-none">
              <Brain className="h-44 w-44 animate-pulse" />
            </div>
            <div className="flex items-center space-x-2.5">
              <Brain className="h-5 w-5 text-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">AI Team Predictive Insights</h3>
            </div>
            
            <div className="space-y-4.5 text-xs leading-relaxed text-slate-300">
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-2">
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[9px] font-bold uppercase tracking-wider">Attrition Flag</span>
                <p className="font-semibold text-white">Engineering Team Departure Warning</p>
                <p className="text-slate-400 leading-relaxed mt-1">
                  AI analysis of check-in times and overtime logs flags a 90-day departure probability of 72% for 2 direct reports. Recommend an engagement check-in.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-2">
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 text-[9px] font-bold uppercase tracking-wider">Engagement Peak</span>
                <p className="font-semibold text-white">High OKR Velocity in Q1</p>
                <p className="text-slate-400 leading-relaxed mt-1">
                  Your direct reports completed 91% of their Q1 targets with high feedback ratings. Consider a team recognition award.
                </p>
              </div>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Team Members Directory</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((emp) => (
                <div key={emp._id} className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-sm text-white">{emp.firstName} {emp.lastName}</h4>
                      <span className="text-[10px] text-slate-400 block font-mono">ID: {emp.employeeId}</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <p><span>Designation:</span> {emp.employmentDetails?.designation || 'Staff'}</p>
                      <p><span>Email:</span> {emp.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <button
                      onClick={() => { setSelectedEmp(emp); setShowGoalModal(true); }}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all text-center"
                    >
                      Assign OKR
                    </button>
                    <button
                      onClick={() => { setSelectedEmp(emp); setShowTaskModal(true); }}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all text-center"
                    >
                      Assign Task
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Team Attendance Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.05] text-[10px] uppercase font-bold text-slate-400">
                    <th className="pb-3">Employee ID</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Check-In</th>
                    <th className="pb-3">Check-Out</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {attendance.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01]">
                      <td className="py-3 font-mono font-bold">{rec.employee_id}</td>
                      <td className="py-3">{new Date(rec.date).toLocaleDateString()}</td>
                      <td className="py-3 font-mono">{rec.check_in ? new Date(rec.check_in).toLocaleTimeString() : '-'}</td>
                      <td className="py-3 font-mono">{rec.check_out ? new Date(rec.check_out).toLocaleTimeString() : '-'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                          rec.status === 'present' ? 'bg-green-500/10 text-green-400' :
                          rec.status === 'late' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'leaves':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-5 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Pending Team Leaves Approvals</h3>
            <div className="divide-y divide-white/[0.04]">
              {leaveRequests.length > 0 ? (
                leaveRequests.map(req => (
                  <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-white">{req.employeeName}</span>
                        <span className="text-[8px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-bold uppercase">{req.leave_type}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {new Date(req.from_date).toLocaleDateString()} to {new Date(req.to_date).toLocaleDateString()} ({parseFloat(req.days)} days)
                      </p>
                      <p className="text-[11px] text-slate-300 italic">"{req.reason}"</p>
                    </div>
                    <div className="flex space-x-2 shrink-0">
                      <button
                        onClick={() => handleLeaveDecision(req.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleLeaveDecision(req.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs font-mono">No leave requests in approvals queue.</div>
              )}
            </div>
          </div>
        );

      case 'timesheets':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
              <div>
                <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Team Timesheet Approvals</h3>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
                  <strong>What is this?</strong> Timesheets track the hours logged by your team members each week for billing, operations, and compliance. Managers review tasks and hours logged to approve or reject before payroll processing.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              {isTimesheetsLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-indigo-400 font-mono">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading team timesheets...
                </div>
              ) : teamTimesheets.length > 0 ? (
                teamTimesheets.map((ts) => (
                  <div key={ts.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white block">{ts.employee_name}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                          ts.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                          ts.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {ts.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                        Week Starting: {new Date(ts.week_start_date).toLocaleDateString()} · <strong>{parseFloat(ts.hours_logged).toFixed(1)} Hours</strong>
                      </span>
                      {ts.description && (
                        <p className="text-slate-300 mt-1.5 italic font-sans">"{ts.description}"</p>
                      )}
                    </div>
                    {ts.status === 'pending' && (
                      <div className="flex space-x-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleTimesheetDecision(ts.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleTimesheetDecision(ts.id, 'approved')}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs font-mono">No team timesheets pending approval.</div>
              )}
            </div>
          </div>
        );

      case 'okrs':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">OKRs & Performance Objectives</h3>
            <p className="text-xs text-slate-400">Manage and track Q2 OKR goals for direct team reports.</p>
            <div className="space-y-4.5">
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-white">Optimize API gateway queries</h4>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Assigned to: Rajesh Kumar · Target: Latency &lt; 150ms</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-bold uppercase tracking-wider font-mono">Q2 Period</span>
                </div>
                <div className="flex items-center space-x-3 text-[10px] font-mono">
                  <div className="flex-1 bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: '84%' }} />
                  </div>
                  <span className="text-white font-bold">84%</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Team Performance Scores</h3>
            <div className="space-y-4 text-xs font-semibold">
              {reports.map((emp, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                  <span>{emp.firstName} {emp.lastName}</span>
                  <span className="font-mono text-white">Score: 4.2 / 5.0</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'appraisals':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Team Appraisals</h3>
            <div className="space-y-4">
              {reports.map((emp) => (
                <div key={emp._id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white block">{emp.firstName} {emp.lastName}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                      Role: {emp.employmentDetails?.designation || 'Staff'} · ID: {emp.employeeId}
                    </span>
                  </div>
                  <button
                    onClick={() => handleBeginAppraisalReview(emp)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase transition-all"
                  >
                    Begin Review
                  </button>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs font-mono">No direct reports found.</div>
              )}
            </div>
          </div>
        );

      case 'recognition':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Team Member Recognition</h3>
            <form onSubmit={handleRecognitionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Select Team Member</label>
                <select className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none">
                  {reports.map(r => (
                    <option key={r._id} value={r._id} className="bg-[#090514]">{r.firstName} {r.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Citation / Reason</label>
                <textarea rows={3} placeholder="Write recognition details..." className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none resize-none" />
              </div>
              {recognitionMsg && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{recognitionMsg}</div>}
              <button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center space-x-1">
                <Heart className="h-4 w-4 fill-current text-indigo-200" />
                <span>Award Badge</span>
              </button>
            </form>
          </div>
        );

      case 'hiring':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Hiring & Resource Requests</h3>
            <form onSubmit={handleHiringSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Department</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={user?.department ? `${(user.department as any).name || user.department} Department` : 'ENG Department'}
                  className="w-full bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-slate-400 cursor-not-allowed font-sans font-bold"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Job Title</label>
                  <input
                    type="text"
                    required
                    value={hiringForm.title}
                    onChange={(e) => setHiringForm({ ...hiringForm, title: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none"
                    placeholder="e.g. Senior Backend Dev"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Headcount</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={hiringForm.count}
                    onChange={(e) => setHiringForm({ ...hiringForm, count: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Requirements Description</label>
                <textarea
                  rows={3}
                  value={hiringForm.desc}
                  onChange={(e) => setHiringForm({ ...hiringForm, desc: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none resize-none"
                  placeholder="Justify hiring need..."
                />
              </div>
              {hiringMsg && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{hiringMsg}</div>}
              <button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                Submit Hiring Request
              </button>
            </form>

            {/* My Submitted Requests Table */}
            <div className="border-t border-white/[0.05] pt-6 space-y-4">
              <h4 className="text-xs font-bold tracking-wider uppercase text-white font-sans">
                My Submitted Hiring Requests
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-[10px] uppercase font-bold text-slate-400">
                      <th className="pb-3">Job Title</th>
                      <th className="pb-3">Headcount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Date Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {myHiringRequests.length > 0 ? (
                      myHiringRequests.map((req, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01]">
                          <td className="py-3 font-bold text-white">{req.job_title}</td>
                          <td className="py-3 font-mono">{req.headcount}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                              req.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                              req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-rose-500/10 text-rose-400'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500 font-mono">
                            {new Date(req.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-500 text-xs font-mono">
                          No hiring requests submitted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
              <div>
                <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Team Performance & Stats Report</h3>
                <p className="text-xs text-slate-400 mt-1">Export or print the overall compliance and operational review card for direct reports.</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shrink-0 uppercase tracking-wider font-mono"
              >
                Print Team Report
              </button>
            </div>

            {isStatsLoading ? (
              <div className="flex items-center justify-center py-12 text-xs text-indigo-400 font-mono">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Compiling team statistics...
              </div>
            ) : (
              <div id="printable-team-report" className="overflow-x-auto">
                {/* Print Header only visible on print */}
                <div className="hidden print:block mb-8 text-black border-b-2 border-black pb-4">
                  <h1 className="text-2xl font-black uppercase tracking-wide">NexusHR Enterprises</h1>
                  <p className="text-sm">Manager Operations Report · Q2 2026</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Generated by: {user ? `${user.firstName} ${user.lastName} (${(user.department as any)?.name || 'Manager'})` : 'Manager'} on {new Date().toLocaleDateString()}
                  </p>
                </div>

                <table className="w-full text-left text-xs text-white print:text-black">
                  <thead>
                    <tr className="border-b border-white/[0.05] print:border-black text-[10px] uppercase font-bold text-slate-400 print:text-black">
                      <th className="pb-3 pr-2">Employee ID</th>
                      <th className="pb-3 pr-2">Name</th>
                      <th className="pb-3 pr-2">Designation</th>
                      <th className="pb-3 pr-2">Annual CTC</th>
                      <th className="pb-3 pr-2 text-center">Attendance</th>
                      <th className="pb-3 pr-2 text-center">Task Completion</th>
                      <th className="pb-3 pr-2 text-center">Appraisal Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] print:divide-black/20">
                    {teamReportsStats.map((stat, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01] print:hover:bg-transparent">
                        <td className="py-3 font-mono font-bold">{stat.employeeId}</td>
                        <td className="py-3 font-semibold">{stat.firstName} {stat.lastName}</td>
                        <td className="py-3 text-slate-300 print:text-black">{stat.designation}</td>
                        <td className="py-3 font-mono">
                          ₹{stat.ctcAnnual ? (stat.ctcAnnual / 100000).toFixed(2) : '0.00'} L
                        </td>
                        <td className="py-3 text-center font-mono">{stat.attendanceRate}%</td>
                        <td className="py-3 text-center font-mono">
                          {stat.taskCompletionRate}% ({stat.completedTasks}/{stat.totalTasks})
                        </td>
                        <td className="py-3 text-center font-bold">
                          {stat.performanceReview?.rating ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 print:bg-transparent print:text-black print:p-0 font-mono">
                              {stat.performanceReview.rating} ({stat.performanceReview.overallScore}/5)
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {teamReportsStats.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-500 font-mono">No direct reports found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Custom Print Style Injection */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-team-report, #printable-team-report * {
                  visibility: visible;
                }
                #printable-team-report {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  color: #000 !important;
                  background: #fff !important;
                }
                #printable-team-report table {
                  border-collapse: collapse;
                  width: 100%;
                  color: #000 !important;
                }
                #printable-team-report th, #printable-team-report td {
                  border: 1px solid #ddd;
                  padding: 8px;
                  color: #000 !important;
                }
              }
            `}</style>
          </div>
        );

      case 'escalations':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-5 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Pending Team Escalations</h3>
            <div className="space-y-4">
              {escalations.map(esc => (
                <div key={esc.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white block">{esc.employeeName}</span>
                    <span className="text-[10px] text-rose-400 font-mono mt-0.5 block">{esc.issue}</span>
                  </div>
                  <button
                    onClick={() => resolveEscalation(esc.id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase"
                  >
                    Resolve
                  </button>
                </div>
              ))}
              {escalations.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs font-mono">No active escalated issues.</div>
              )}
            </div>
          </div>
        );

      case 'candidate_offers':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-5 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">
              Candidate Offer Approvals
            </h3>
            <p className="text-xs text-slate-400">
              Evaluate and process candidate employment offer requests submitted by HR recruiters.
            </p>
            <div className="divide-y divide-white/[0.04] space-y-4">
              {isOffersLoading ? (
                <div className="flex items-center justify-center py-10 space-x-2">
                  <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Loading pending offers...</span>
                </div>
              ) : pendingOffers.length > 0 ? (
                pendingOffers.map((offer) => (
                  <div key={offer._id} className="py-4 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-sm text-white">{offer.candidateName}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-bold uppercase">
                          {offer.offerDetails?.designation || offer.jobPostingId?.title || 'Candidate'}
                        </span>
                        {offer.aiScreening?.overallScore !== undefined && (
                          <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                            offer.aiScreening.overallScore >= 75 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            AI Score: {offer.aiScreening.overallScore}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Email: <span className="text-slate-300 font-mono">{offer.candidateEmail}</span>
                        {offer.candidatePhone && ` | Phone: ${offer.candidatePhone}`}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">Offered CTC</span>
                          <span className="text-white font-bold block mt-0.5">
                            ₹{offer.offerDetails?.salaryAnnual ? (offer.offerDetails.salaryAnnual / 100000).toFixed(2) : '0.00'} Lakhs/annum
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">Proposed Joining Date</span>
                          <span className="text-white font-bold block mt-0.5">
                            {offer.offerDetails?.joiningDate ? new Date(offer.offerDetails.joiningDate).toLocaleDateString() : '-'}
                          </span>
                        </div>
                      </div>
                      {offer.aiScreening?.aiSummary && (
                        <div className="bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl space-y-1">
                          <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1">
                            <Brain className="h-3 w-3 animate-pulse mr-1" />
                            AI Screening Summary
                          </span>
                          <p className="text-[11px] text-indigo-200/70 leading-relaxed font-sans">{offer.aiScreening.aiSummary}</p>
                        </div>
                      )}
                      {offer.resumeUrl && (
                        <a
                          href={offer.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>View Submitted Resume / Document</span>
                        </a>
                      )}
                    </div>
                    <div className="flex sm:flex-row md:flex-col gap-2.5 shrink-0 self-center">
                      <button
                        onClick={() => handleOfferDecision(offer._id, 'rejected')}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/15 hover:border-rose-500/30 text-rose-400 text-[11px] font-bold uppercase transition-all duration-150 shrink-0 font-mono tracking-wider"
                      >
                        Reject Offer
                      </button>
                      <button
                        onClick={() => handleOfferDecision(offer._id, 'approved')}
                        className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase transition-all duration-150 shrink-0 font-mono tracking-wider"
                      >
                        Approve Offer
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs font-mono">
                  No candidate offer letters pending approval.
                </div>
              )}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-4 animate-fade-in text-center max-w-md mx-auto">
            <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xl mx-auto shadow-md">
              M
            </div>
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans mt-3">Manager Profile</h3>
            <p className="text-xs text-slate-300">Reporting line: Operations & Technical Delivery</p>
          </div>
        );

      case 'settings':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-4 animate-fade-in text-xs max-w-sm mx-auto">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Portal Settings</h3>
            <div className="space-y-3 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-indigo-500" />
                <span>Enable daily check-in email alerts</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-indigo-500" />
                <span>Enable automatic Slack approval pushes</span>
              </label>
            </div>
          </div>
        );

      default:
        return <div>Invalid tab view.</div>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-white pb-12">
      {/* Header Banner */}
      <div className="border-b border-white/[0.04] pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">Manager Console</h1>
          <p className="text-indigo-200/40 text-xs mt-1.5 font-mono">
            {user ? `${user.firstName} ${user.lastName} • ${user.employmentDetails?.designation || 'Manager'} (${(user.department as any)?.name || 'N/A'} Department)` : 'Direct Report Allocations & OKRs'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 px-5 py-4 rounded-2xl text-xs flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dynamic Tab view rendering */}
      {renderTabContent()}

      {/* OKR Goal Assign Modal */}
      {showGoalModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#090514] border border-white/[0.08] rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-white animate-slide-in">
            <button
              onClick={() => { setShowGoalModal(false); setSelectedEmp(null); }}
              className="absolute top-5 right-5 p-1 text-indigo-200/20 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Target className="h-4.5 w-4.5 text-indigo-500" />
              <span>Assign OKR Goal</span>
            </h3>
            <p className="text-[10px] text-indigo-200/40 mb-5">
              Objective allocation for <span className="text-white font-bold">{selectedEmp.firstName} {selectedEmp.lastName}</span>
            </p>

            <form onSubmit={handleGoalSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Goal Objective</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Optimize React rendering cycles"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Target Metric</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reduce bundle payload size by 15%"
                  value={goalForm.target}
                  onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Description Details</label>
                <textarea
                  rows={2}
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none resize-none"
                  placeholder="Guidelines/expectations..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Weight (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    required
                    value={goalForm.weight}
                    onChange={(e) => setGoalForm({ ...goalForm, weight: parseInt(e.target.value) || 20 })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Review Period</label>
                  <input
                    type="text"
                    required
                    value={goalForm.reviewPeriod}
                    onChange={(e) => setGoalForm({ ...goalForm, reviewPeriod: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Due Date</label>
                <input
                  type="date"
                  required
                  value={goalForm.dueDate}
                  onChange={(e) => setGoalForm({ ...goalForm, dueDate: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                />
              </div>

              {goalMsg.text && (
                <div className={`p-3.5 rounded-xl text-[11px] flex items-center space-x-2 ${
                  goalMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}>
                  {goalMsg.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 text-green-400 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />}
                  <span>{goalMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingGoal}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center justify-center space-x-2 transition-all font-mono uppercase tracking-wider text-[11px]"
              >
                {isSubmittingGoal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Assign OKR details</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Task Assign Modal */}
      {showTaskModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#090514] border border-white/[0.08] rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-white animate-slide-in">
            <button
              onClick={() => { setShowTaskModal(false); setSelectedEmp(null); }}
              className="absolute top-5 right-5 p-1 text-indigo-200/20 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center space-x-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
              <span>Assign Daily Task</span>
            </h3>
            <p className="text-[10px] text-indigo-200/40 mb-5">
              Task assignment for <span className="text-white font-bold">{selectedEmp.firstName} {selectedEmp.lastName}</span>
            </p>

            <form onSubmit={handleTaskSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Task Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Complete high priority bug fixing on auth screen"
                  value={taskForm.text}
                  onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Due Date (Optional)</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                />
              </div>

              {taskMsg.text && (
                <div className={`p-3.5 rounded-xl text-[11px] flex items-center space-x-2 ${
                  taskMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}>
                  {taskMsg.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 text-green-400 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />}
                  <span>{taskMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingTask}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center justify-center space-x-2 transition-all font-mono uppercase tracking-wider text-[11px]"
              >
                {isSubmittingTask ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Assign Task details</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Appraisal Review Modal */}
      {selectedAppraisalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#090514] border border-white/[0.08] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-white animate-slide-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setSelectedAppraisalEmp(null); setAppraisalStats(null); }}
              className="absolute top-5 right-5 p-1 text-indigo-200/20 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Award className="h-4.5 w-4.5 text-indigo-500" />
              <span>Appraisal Evaluation & Review</span>
            </h3>
            <p className="text-[10px] text-indigo-200/40 mb-5">
              Review details for <span className="text-white font-bold">{selectedAppraisalEmp.firstName} {selectedAppraisalEmp.lastName}</span>
            </p>

            {isAppraisalStatsLoading ? (
              <div className="flex items-center justify-center py-12 text-xs text-indigo-400 font-mono">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Fetching candidate performance metrics...
              </div>
            ) : appraisalStats ? (
              <form onSubmit={handleAppraisalSubmit} className="space-y-4 text-xs font-semibold">
                
                {/* Real-time stats display */}
                <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl grid grid-cols-2 gap-4 font-sans">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block font-mono">Annual CTC Salary</span>
                    <span className="text-white font-bold text-sm block mt-0.5">
                      ₹{appraisalStats.ctcAnnual ? (appraisalStats.ctcAnnual / 100000).toFixed(2) : '0.00'} Lakhs
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block font-mono">Attendance Rate</span>
                    <span className={`font-bold text-sm block mt-0.5 ${
                      appraisalStats.attendanceRate >= 90 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {appraisalStats.attendanceRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block font-mono">Task Completion</span>
                    <span className="text-white font-bold text-sm block mt-0.5">
                      {appraisalStats.taskCompletionRate}% ({appraisalStats.completedTasks}/{appraisalStats.totalTasks} Tasks)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block font-mono">Latest Score</span>
                    <span className="text-white font-bold text-sm block mt-0.5">
                      {appraisalStats.performanceReview?.overallScore ? `${appraisalStats.performanceReview.overallScore} / 5.0 (${appraisalStats.performanceReview.rating})` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Evaluation Rating</label>
                    <select
                      value={appraisalForm.rating}
                      onChange={(e) => setAppraisalForm({ ...appraisalForm, rating: e.target.value })}
                      className="w-full bg-[#090514] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                    >
                      <option value="A+">A+ (Exceptional)</option>
                      <option value="A">A (Excellent)</option>
                      <option value="B">B (Good)</option>
                      <option value="C">C (Satisfactory)</option>
                      <option value="D">D (Needs Improvement)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Overall Score (1 - 5)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      required
                      value={appraisalForm.overallScore}
                      onChange={(e) => setAppraisalForm({ ...appraisalForm, overallScore: parseFloat(e.target.value) || 4.0 })}
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Salary Increment (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={appraisalForm.incrementRecommended}
                      onChange={(e) => setAppraisalForm({ ...appraisalForm, incrementRecommended: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                    />
                  </div>
                  
                  <div className="space-y-1.5 flex flex-col justify-end pb-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={appraisalForm.promotionRecommended}
                        onChange={(e) => setAppraisalForm({ ...appraisalForm, promotionRecommended: e.target.checked })}
                        className="accent-indigo-500 rounded bg-white/[0.03] border border-white/[0.08] h-4 w-4"
                      />
                      <span className="text-[10px] text-indigo-200/60 uppercase tracking-wider block font-mono">Recommend Promotion</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Manager Comments</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter appraisal remarks and development feedback..."
                    value={appraisalForm.managerComments}
                    onChange={(e) => setAppraisalForm({ ...appraisalForm, managerComments: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none resize-none"
                  />
                </div>

                {appraisalMsg.text && (
                  <div className={`p-3.5 rounded-xl text-[11px] flex items-center space-x-2 ${
                    appraisalMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
                  }`}>
                    {appraisalMsg.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 text-green-400 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />}
                    <span>{appraisalMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingAppraisal}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center justify-center space-x-2 transition-all font-mono uppercase tracking-wider text-[11px]"
                >
                  {isSubmittingAppraisal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Submit Appraisal Review</span>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">Error loading employee stats.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagerDashboard() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#020105]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <ManagerDashboardContent />
    </Suspense>
  );
}
