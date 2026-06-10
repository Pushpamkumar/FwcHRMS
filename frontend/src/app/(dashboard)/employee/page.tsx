'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Clock,
  MapPin,
  Calendar,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  FileSpreadsheet,
  Check,
  TrendingUp,
  X,
  Download,
  Search,
  Sparkles,
  User,
  FileText,
  Briefcase
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  status: string;
  notes: string | null;
}

interface LeaveBalance {
  leave_type: string;
  total_days: string;
  used_days: string;
  pending_days: string;
  remaining_days: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  target: string;
  progress: number;
  status: string;
  weight: number;
  due_date: string;
  review_period: string;
}

interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  status: 'done' | 'review' | 'overdue';
}

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
  return name.slice(0, 2).toUpperCase();
};

function EmployeeDashboardContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const [profile, setProfile] = useState<any>(null);
  const [payrollStructure, setPayrollStructure] = useState<any>(null);
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  
  const [currentTime, setCurrentTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Dynamic Month/Year Selector
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  
  // Clock state
  const [isClocking, setIsClocking] = useState(false);
  const [clockMsg, setClockMsg] = useState({ type: '', text: '' });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Leave Form state
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'casual',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState({ type: '', text: '' });
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // OKR update state
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalProgressVal, setGoalProgressVal] = useState<number>(0);
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);

  // Profile Edit Form State
  const [profileForm, setProfileForm] = useState({
    phone: '',
    gender: 'prefer_not_to_say',
    skills: '',
    address: { street: '', city: '', state: '', pincode: '', country: '' },
    emergencyContact: { name: '', relation: '', phone: '' },
    bankDetails: { bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '' }
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  const loadData = async () => {
    try {
      setError('');
      if (!user?.id) return;

      const [profileRes, attRes, balRes, goalsRes, tasksRes] = await Promise.all([
        api.get(`/employees/${user.id}`),
        api.get('/attendance/my'),
        api.get('/leaves/balance'),
        api.get('/goals/my'),
        api.get('/tasks/my')
      ]);

      setProfile(profileRes.data.profile);
      setPayrollStructure(profileRes.data.payrollStructure);
      setAttendance(attRes.data);
      setBalances(balRes.data);
      setGoals(goalsRes.data);
      setTasks(tasksRes.data);
    } catch (err: any) {
      console.error('Failed to load employee dashboard data:', err);
      setError('Connection issue or server error. Please check database configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Live Clock timer
    const timer = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setCurrentTime(timeStr);
    }, 1000);

    // Geolocation capture
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.log('Geolocation denied or unavailable:', err.message)
      );
    }

    // Tasks are fetched and set dynamically from the backend inside loadData()


    return () => clearInterval(timer);
  }, [user]);

  // Synchronize profile form state when data is loaded
  useEffect(() => {
    if (profile) {
      setProfileForm({
        phone: profile.phone || '',
        gender: profile.gender || 'prefer_not_to_say',
        skills: profile.skills ? profile.skills.join(', ') : '',
        address: {
          street: profile.address?.street || '',
          city: profile.address?.city || '',
          state: profile.address?.state || '',
          pincode: profile.address?.pincode || '',
          country: profile.address?.country || ''
        },
        emergencyContact: {
          name: profile.emergencyContact?.name || '',
          relation: profile.emergencyContact?.relation || '',
          phone: profile.emergencyContact?.phone || ''
        },
        bankDetails: {
          bankName: profile.bankDetails?.bankName || '',
          accountNumber: profile.bankDetails?.accountNumber || '',
          ifscCode: profile.bankDetails?.ifscCode || '',
          accountHolderName: profile.bankDetails?.accountHolderName || ''
        }
      });
    }
  }, [profile]);

  const handleToggleTask = async (taskId: string) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    const nextCompleted = !t.completed;
    try {
      await api.put(`/tasks/${taskId}/toggle`, { completed: nextCompleted });
      await loadData();
    } catch (err: any) {
      console.error('Failed to toggle task:', err);
    }
  };


  // Clock status checks – use local IST date to match backend storage
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD in IST
  const todayRecord = attendance.find(r => r.date.split('T')[0] === todayStr);
  const isCheckedIn = !!(todayRecord && todayRecord.check_in);
  const isCheckedOut = !!(todayRecord && todayRecord.check_out);

  const handleClockAction = async (action: 'in' | 'out') => {
    setIsClocking(true);
    setClockMsg({ type: '', text: '' });

    try {
      let currentCoords = coords;
      if (!currentCoords && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(currentCoords);
        } catch (e: any) {
          console.warn('Geolocation capture failed, submitting clock with fallback coordinates.', e.message);
        }
      }

      const payload = {
        location: currentCoords
          ? { lat: currentCoords.lat, lng: currentCoords.lng, address: 'Browser Geolocated' }
          : { lat: 0, lng: 0, address: 'Fallback Location' }
      };

      if (action === 'in') {
        // Clock In
        const res = await api.post('/attendance/check-in', payload);
        setClockMsg({ type: 'success', text: res.data.message || 'Clock-in completed successfully.' });
      } else {
        // Clock Out
        const res = await api.put('/attendance/check-out', payload);
        setClockMsg({ type: 'success', text: res.data.message || 'Clock-out completed successfully.' });
      }

      await loadData();
    } catch (err: any) {
      console.error('Clock action failed:', err);
      setClockMsg({
        type: 'error',
        text: err.response?.data?.message || 'Transaction failed. Check servers.'
      });
    } finally {
      setIsClocking(false);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLeave(true);
    setLeaveMsg({ type: '', text: '' });

    try {
      const res = await api.post('/leaves/apply', leaveForm);
      setLeaveMsg({ type: 'success', text: res.data.message || 'Leave applied successfully!' });
      setLeaveForm({ leaveType: 'casual', fromDate: '', toDate: '', reason: '' });
      await loadData();
      setTimeout(() => setShowLeaveModal(false), 2000);
    } catch (err: any) {
      console.error('Leave apply failed:', err);
      setLeaveMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to submit leave. Check dates/balances.'
      });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleUpdateGoalProgress = async (goalId: string) => {
    setIsUpdatingGoal(true);
    try {
      await api.put(`/goals/${goalId}/progress`, { progress: goalProgressVal });
      setEditingGoalId(null);
      await loadData();
    } catch (err: any) {
      console.error('Goal update failed:', err);
      alert(err.response?.data?.message || 'Failed to update goal progress.');
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSavingProfile(true);
    setProfileMsg({ type: '', text: '' });

    try {
      const payload = {
        ...profileForm,
        skills: profileForm.skills.split(',').map(s => s.trim()).filter(Boolean)
      };
      await api.put(`/employees/${user.id}`, payload);
      setProfileMsg({ type: 'success', text: 'Profile details saved successfully.' });
      await loadData();
    } catch (err: any) {
      console.error('Failed to save profile details:', err);
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile details.'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Helper to open chatbot globally
  const handleAskNexAI = () => {
    window.dispatchEvent(new CustomEvent('open-chat'));
  };

  // Printable mock company documents PDF Generator
  const handlePrintDoc = (docType: string) => {
    if (!profile) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let docTitle = '';
    let docBody = '';

    if (docType === 'offer') {
      docTitle = 'Employment Offer Letter';
      docBody = `
        <p>Date: June 01, 2026</p>
        <p>Dear <strong>${profile.firstName} ${profile.lastName}</strong>,</p>
        <p>We are pleased to extend you an offer of employment at <strong>FWC IT Services Private Limited</strong> in the position of <strong>${profile.employmentDetails?.designation || 'Software Engineer'}</strong>.</p>
        <p>Your base compensation structures and employee benefits are details within our payroll engines. This appointment remains subject to verification check clearances, and compliance protocols.</p>
        <p>Welcome to our workspace portal!</p>
      `;
    } else if (docType === 'nda') {
      docTitle = 'Non-Disclosure Agreement (NDA)';
      docBody = `
        <p>This Corporate Non-Disclosure Agreement safeguards proprietary systems and software modules developed within the enterprise portals of <strong>FWC IT Services Private Limited</strong>.</p>
        <p>The signatory <strong>${profile.firstName} ${profile.lastName}</strong> (Employee ID: ${profile.employeeId}) agrees not to disclose codebase snippets, credentials, system architectures, or client information profiles to unauthorized domains.</p>
      `;
    } else if (docType === 'ip') {
      docTitle = 'Intellectual Property Assignment';
      docBody = `
        <p>The developer <strong>${profile.firstName} ${profile.lastName}</strong> agrees that all systems, designs, algorithms, codebases, and assets constructed during active employment belong exclusively to <strong>FWC IT Services Private Limited</strong>.</p>
        <p>This includes all modules pushed to internal workspaces, git repositories, and cloud nodes.</p>
      `;
    } else {
      docTitle = 'PAN & Aadhaar Consent Certificate';
      docBody = `
        <p>This certifies that <strong>${profile.firstName} ${profile.lastName}</strong> has consented to background verification checks utilizing PAN & Aadhaar details mapped within the employee database.</p>
        <p>State: <strong>COMPLIANT & VERIFIED</strong></p>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${docTitle} - ${profile.firstName} ${profile.lastName}</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: 800; color: #4f46e5; }
            .title { font-size: 16px; font-weight: 700; margin-top: 15px; text-transform: uppercase; letter-spacing: 0.05em; color: #1e293b; }
            .content { font-size: 13px; margin-bottom: 60px; }
            .footer { margin-top: 100px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
            .signature { border-top: 1.5px solid #cbd5e1; width: 180px; text-align: center; padding-top: 8px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">FWC IT Services Private Limited</div>
            <div class="title">${docTitle}</div>
          </div>
          <div class="content">
            ${docBody}
          </div>
          <div class="footer">
            <div class="signature">Employee Signature</div>
            <div class="signature">Authorized Signatory</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Parsing selected month and year details for dynamic calendar rendering
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // 0-indexed month

  // Filter attendance logs for selectedMonth
  const selectedMonthLogs = attendance.filter(rec => {
    const d = new Date(rec.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const presentDaysCount = selectedMonthLogs.filter(r => ['present', 'work_from_home', 'late'].includes(r.status)).length;
  
  // Calculate total weekdays in month (excluding weekends)
  const getWorkingDaysCount = (y: number, m: number) => {
    const numDays = new Date(y, m + 1, 0).getDate();
    let count = 0;
    for (let d = 1; d <= numDays; d++) {
      const dayOfWeek = new Date(y, m, d).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
    }
    return count;
  };
  const workingDays = getWorkingDaysCount(year, month);

  const positiveChecks = selectedMonthLogs.filter(r => ['present', 'work_from_home', 'late'].includes(r.status)).length;
  const attendanceRate = selectedMonthLogs.length > 0 ? Math.round((positiveChecks / selectedMonthLogs.length) * 100) : 100;

  const totalRemainingLeaves = balances.reduce((sum, bal) => sum + parseFloat(bal.remaining_days), 0);
  const avgGoalsProgress = goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 78;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const selectedMonthName = `${monthNames[month]} ${year}`;

  // Helper for leave balances progress bars
  const getBalanceForType = (type: string) => {
    const b = balances.find(item => item.leave_type.toLowerCase() === type.toLowerCase());
    return b ? {
      remaining: parseFloat(b.remaining_days),
      total: parseFloat(b.total_days),
      used: parseFloat(b.used_days),
      pending: parseFloat(b.pending_days)
    } : { remaining: 0, total: 10, used: 0, pending: 0 };
  };

  const casualBal = getBalanceForType('casual');
  const sickBal = getBalanceForType('sick');
  const earnedBal = getBalanceForType('earned');

  // Printable Payslip PDF Generator
  const handleDownloadPayslip = () => {
    if (!profile || !payrollStructure) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const basic = parseFloat(payrollStructure.basic);
    const hra = parseFloat(payrollStructure.hra);
    const special = parseFloat(payrollStructure.special_allowance);
    const bonus = 8000;
    const gross = basic + hra + special + bonus;
    
    const pf = parseFloat(payrollStructure.pf_employee);
    const tds = parseFloat(payrollStructure.tds);
    const pt = 200;
    const deductions = pf + tds + pt;
    
    const net = gross - deductions;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Payslip - ${profile.firstName} ${profile.lastName}</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 22px; font-weight: 800; color: #4f46e5; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; text-transform: uppercase; }
            .title { font-size: 16px; font-weight: 700; margin-top: 15px; text-transform: uppercase; letter-spacing: 0.05em; color: #1e293b; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 13px; }
            .grid div p { margin: 6px 0; }
            .grid div span { font-weight: 600; color: #475569; }
            .table-container { display: flex; gap: 40px; margin-bottom: 40px; }
            .table-side { flex: 1; }
            .table-title { font-size: 13px; font-weight: 700; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 12px; text-transform: uppercase; color: #4f46e5; }
            .table-row { display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
            .table-row.total { border-top: 1.5px dashed #cbd5e1; font-weight: 700; padding-top: 10px; margin-top: 10px; border-bottom: none; }
            .summary { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
            .summary-title { font-size: 13px; font-weight: 700; color: #334155; }
            .summary-val { font-size: 20px; font-weight: 900; color: #10b981; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
            .signature { border-top: 1.5px solid #cbd5e1; width: 180px; text-align: center; padding-top: 8px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">NexHR Enterprise Suite</div>
            <div class="subtitle">FWC IT Services Private Limited</div>
            <div class="title">Payslip for ${selectedMonthName}</div>
          </div>
          
          <div class="grid">
            <div>
              <p><span>Employee Name:</span> ${profile.firstName} ${profile.lastName}</p>
              <p><span>Employee ID:</span> ${profile.employeeId}</p>
              <p><span>Department:</span> ${profile.department?.name || 'Engineering'}</p>
              <p><span>Designation:</span> ${profile.employmentDetails?.designation || 'Software Engineer'}</p>
            </div>
            <div>
              <p><span>Joining Date:</span> ${new Date(profile.employmentDetails?.joiningDate).toLocaleDateString()}</p>
              <p><span>Work Status:</span> Active</p>
              <p><span>Reporting Manager:</span> ${profile.reportingManagerId ? `${profile.reportingManagerId.firstName} ${profile.reportingManagerId.lastName}` : 'N/A'}</p>
              <p><span>Pay Period:</span> ${selectedMonthName}</p>
            </div>
          </div>
          
          <div class="table-container">
            <div class="table-side">
              <div class="table-title">Earnings</div>
              <div class="table-row"><span>Basic Salary</span> <span>₹${basic.toLocaleString()}</span></div>
              <div class="table-row"><span>HRA</span> <span>₹${hra.toLocaleString()}</span></div>
              <div class="table-row"><span>Special Allowance</span> <span>₹${special.toLocaleString()}</span></div>
              <div class="table-row"><span>Performance Bonus</span> <span>₹${bonus.toLocaleString()}</span></div>
              <div class="table-row total"><span>Gross Earnings</span> <span>₹${gross.toLocaleString()}</span></div>
            </div>
            <div class="table-side">
              <div class="table-title">Deductions</div>
              <div class="table-row"><span>Provident Fund (PF)</span> <span>₹${pf.toLocaleString()}</span></div>
              <div class="table-row"><span>Income Tax (TDS)</span> <span>₹${tds.toLocaleString()}</span></div>
              <div class="table-row"><span>Professional Tax</span> <span>₹${pt.toLocaleString()}</span></div>
              <div class="table-row total"><span>Total Deductions</span> <span>₹${deductions.toLocaleString()}</span></div>
            </div>
          </div>
          
          <div class="summary">
            <div>
              <div class="summary-title">Net Take-Home Salary</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-weight: 500;">Calculated base salary on dynamic corporate payslip structure.</div>
            </div>
            <div class="summary-val">₹${net.toLocaleString()}</div>
          </div>
          
          <div class="footer">
            <div class="signature">Employee Signature</div>
            <div class="signature">Authorized Signatory</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Render premium 7-column calendar
  const renderCalendarDays = () => {
    // Determine number of days in target month
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0: Sun, 1: Mon, ...
    
    const calendarDays = [];
    
    // Pad days from the previous month for starting offset
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(null);
    }
    
    // Fill the days of the current month
    for (let d = 1; d <= totalDays; d++) {
      calendarDays.push(d);
    }
    
    // Pad the remaining days of the last week to complete grid of 7 columns
    while (calendarDays.length % 7 !== 0) {
      calendarDays.push(null);
    }
    
    const weeks = [];
    let currentWeek = [];
    for (let i = 0; i < calendarDays.length; i++) {
      currentWeek.push(calendarDays[i]);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    const attMap = new Map<string, AttendanceRecord>();
    attendance.forEach(rec => {
      const dateStr = rec.date.split('T')[0];
      attMap.set(dateStr, rec);
    });

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-3 text-center text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {weeks.map((wk, wkIdx) => (
          <div key={wkIdx} className="grid grid-cols-7 gap-3">
            {wk.map((day, dIdx) => {
              if (day === null) {
                return <div key={dIdx} className="h-16 rounded-xl bg-white/[0.005] border border-dashed border-white/[0.02]" />;
              }
              
              const dayStr = String(day).padStart(2, '0');
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${dayStr}`;
              const rec = attMap.get(dateKey);
              const status = rec?.status;
              
              const dateObj = new Date(year, month, day);
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const isFuture = dateObj > today;
              const isToday = dateKey === todayKey;
              
              let statusLabel = '';
              let timeInfo = '';
              
              // Determine check-in/out times if they exist
              if (rec?.check_in) {
                const checkInTime = new Date(rec.check_in);
                const cInStr = checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Grace period: 9:00–9:10 AM = On Time, after 9:10 AM = Late
                const graceCutoff = new Date(checkInTime);
                graceCutoff.setHours(9, 10, 0, 0);
                const lateDiff = checkInTime.getTime() - graceCutoff.getTime();
                
                let checkOutStr = '';
                if (rec?.check_out) {
                  const checkOutTime = new Date(rec.check_out);
                  checkOutStr = ' - ' + checkOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
                
                timeInfo = `${cInStr}${checkOutStr}`;
                
                if (lateDiff > 0) {
                  const mins = Math.floor(lateDiff / 60000);
                  statusLabel = `Late by ${mins}m`;
                } else {
                  statusLabel = 'On Time';
                }
              }

              let bgClass = 'bg-white/[0.01] border-white/[0.04] text-slate-400';
              let badgeColor = 'text-slate-400 bg-slate-400/10 border-slate-400/20';

              if (status === 'present' || (rec?.check_in && status !== 'late')) {
                bgClass = 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300';
                badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
              } else if (status === 'work_from_home') {
                bgClass = 'bg-sky-500/10 border-sky-500/25 text-sky-300';
                badgeColor = 'text-sky-400 bg-sky-500/10 border-sky-500/25';
              } else if (status === 'late' || (rec?.check_in && status === 'late')) {
                bgClass = 'bg-amber-500/10 border-amber-500/25 text-amber-300';
                badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/25';
              } else if (status === 'on_leave') {
                bgClass = 'bg-rose-500/10 border-rose-500/25 text-rose-300';
                badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/25';
              } else if (status === 'absent') {
                bgClass = 'bg-rose-950/10 border-rose-950/20 text-rose-500/70';
                badgeColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                statusLabel = 'Absent';
              } else if (!isFuture && !isWeekend && !rec) {
                // Automatically marked as absent if past weekday and no record
                bgClass = 'bg-rose-950/10 border-rose-950/20 text-rose-500/70';
                badgeColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                statusLabel = 'Absent';
              } else if (isWeekend) {
                bgClass = 'bg-white/[0.003] border-white/[0.02] text-slate-600';
                statusLabel = 'Weekend';
              }

              return (
                <div
                  key={dIdx}
                  className={`h-16 rounded-xl border flex flex-col items-center justify-between p-1.5 font-mono text-xs ${bgClass} transition-all hover:scale-[1.03] ${
                    isToday ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#020105] border-indigo-400 scale-[1.02]' : ''
                  }`}
                  title={status ? `Attendance: ${status.replace('_', ' ')}` : isWeekend ? 'Weekend' : !isFuture ? 'Absent' : 'Future'}
                >
                  <div className="flex w-full justify-between items-start">
                    <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center font-bold ${isToday ? 'bg-indigo-600 text-white text-[10px]' : ''}`}>
                      {day}
                    </span>
                    {isToday && (
                      <button
                        onClick={() => handleClockAction(isCheckedIn ? 'out' : 'in')}
                        disabled={isCheckedOut || isClocking}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-sans font-extrabold uppercase tracking-wide border shadow transition-all ${
                          isCheckedOut
                            ? 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                            : isCheckedIn
                            ? 'bg-rose-600 border-rose-500 text-white hover:bg-rose-500'
                            : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
                        }`}
                      >
                        {isCheckedOut ? 'Done' : isCheckedIn ? 'Out' : 'In'}
                      </button>
                    )}
                  </div>
                  
                  <div className="w-full text-center space-y-0.5">
                    {timeInfo && (
                      <span className="text-[8px] text-slate-400 font-bold block truncate tracking-tighter leading-none">
                        {timeInfo}
                      </span>
                    )}
                    {statusLabel && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold block mx-auto leading-none border max-w-full truncate ${badgeColor}`}>
                        {statusLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Primary Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Metric 1 */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono">Days Present</span>
                  <span className="text-2xl font-black block text-white mt-1.5">{presentDaysCount}/{workingDays}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">This Month</span>
              </div>
              
              {/* Metric 2 */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono">Net Salary</span>
                  <span className="text-2xl font-black block text-white mt-1.5">₹{netTakeHomeVal.toLocaleString()}</span>
                </div>
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full font-mono">{selectedMonthName}</span>
              </div>

              {/* Metric 3 */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono">Leave Balance</span>
                  <span className="text-2xl font-black block text-white mt-1.5">{totalRemainingLeaves} days</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-mono">Annual</span>
              </div>

              {/* Metric 4 */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono">Goals Completed</span>
                  <span className="text-2xl font-black block text-white mt-1.5">{avgGoalsProgress}%</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">Q2 OKRs</span>
              </div>
            </div>

            {/* Main Grid section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT COLUMN (Attendance Calendar, Payslips, Goals) - 8 cols */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Attendance Grid Calendar */}
                <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Attendance</h3>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white/[0.02] border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:outline-none cursor-pointer w-32"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-widest uppercase">{attendanceRate}% Rate</span>
                  </div>
                  
                  {renderCalendarDays()}

                  {/* Calendar Legend */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-4 border-t border-white/[0.03] text-[10px] font-bold uppercase tracking-wider font-mono">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-md bg-emerald-500/10 border border-emerald-500/20" />
                      <span className="text-emerald-400">Present</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-md bg-sky-500/10 border border-sky-500/20" />
                      <span className="text-sky-400">WFH</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-md bg-amber-500/10 border border-amber-500/20" />
                      <span className="text-amber-400">Late</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-md bg-rose-500/10 border border-rose-500/20" />
                      <span className="text-rose-400">Leave</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-md bg-slate-500/10 border border-slate-500/20" />
                      <span className="text-slate-400">Absent</span>
                    </div>
                  </div>
                </div>

                {/* Payslip summary */}
                <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                    <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">{selectedMonthName} Payslip</h3>
                    <button
                      onClick={handleDownloadPayslip}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1.5 transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-semibold text-slate-300">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-1 border-b border-white/[0.02]">
                        <span>Basic Salary</span>
                        <span className="text-white font-mono">+₹{basicSalaryVal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-white/[0.02]">
                        <span>HRA</span>
                        <span className="text-white font-mono">+₹{hraVal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-white/[0.02]">
                        <span>Special Allowance</span>
                        <span className="text-white font-mono">+₹{specialAllowanceVal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span>Performance Bonus</span>
                        <span className="text-white font-mono">+₹{bonusVal.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-1 border-b border-white/[0.02]">
                        <span>PF Deduction</span>
                        <span className="text-rose-400 font-mono">-₹{pfVal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-white/[0.02]">
                        <span>TDS</span>
                        <span className="text-rose-400 font-mono">-₹{tdsVal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span>Professional Tax</span>
                        <span className="text-rose-400 font-mono">-₹200</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between bg-white/[0.01] border border-white/[0.03] p-4.5 rounded-xl text-xs font-semibold">
                    <span className="text-slate-300">Net Take Home</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">₹{netTakeHomeVal.toLocaleString()}</span>
                  </div>
                </div>




              </div>

              {/* RIGHT COLUMN (Clock, Leave applications, tasks) - 4 cols */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Geolocation Clock card */}
                <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-6">
                  <div className="text-center space-y-2">
                    <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider font-mono">Live Clock</span>
                    <span className="text-3xl font-black block text-white font-mono tracking-wider">{currentTime || '09:07 AM'}</span>
                    
                    <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider ${
                      isCheckedOut ? 'bg-white/5 border-white/10 text-slate-500' :
                      isCheckedIn ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        isCheckedOut ? 'bg-slate-500' :
                        isCheckedIn ? 'bg-emerald-400 animate-ping' :
                        'bg-amber-400 animate-ping'
                      }`} />
                      <span>{isCheckedOut ? 'Shift Completed' : isCheckedIn ? 'Checked In - Onsite' : 'Not Checked In'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleClockAction('in')}
                      disabled={isClocking || isCheckedIn}
                      className={`py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                        isCheckedIn
                          ? 'bg-slate-500/5 text-slate-500 border-white/5 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/20 shadow-lg shadow-emerald-600/15'
                      }`}
                    >
                      {isClocking && !isCheckedIn ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        <span>Check In</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleClockAction('out')}
                      disabled={isClocking || !isCheckedIn || isCheckedOut}
                      className={`py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                        isCheckedOut || !isCheckedIn
                          ? 'bg-slate-500/5 text-slate-500 border-white/5 cursor-not-allowed'
                          : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/20 shadow-lg shadow-rose-600/15'
                      }`}
                    >
                      {isClocking && isCheckedIn && !isCheckedOut ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        <span>Check Out</span>
                      )}
                    </button>
                  </div>


                  {clockMsg.text && (
                    <div className={`p-3.5 rounded-xl text-[10px] flex items-center space-x-2 ${
                      clockMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
                    }`}>
                      {clockMsg.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 text-green-400 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />}
                      <span className="leading-relaxed">{clockMsg.text}</span>
                    </div>
                  )}

                  {/* Leave remaining bars */}
                  <div className="space-y-4 pt-4 border-t border-white/[0.03]">
                    <span className="text-[10px] uppercase font-bold text-indigo-300/40 tracking-wider block font-mono">Leave Balance</span>
                    
                    {/* Casual Leave */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                        <span>Casual Leave</span>
                        <span>{casualBal.remaining} of {casualBal.total} remaining</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(casualBal.remaining / casualBal.total) * 100}%` }} />
                      </div>
                    </div>

                    {/* Sick Leave */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                        <span>Sick Leave</span>
                        <span>{sickBal.remaining} of {sickBal.total} remaining</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(sickBal.remaining / sickBal.total) * 100}%` }} />
                      </div>
                    </div>

                    {/* Earned Leave */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                        <span>Earned Leave</span>
                        <span>{earnedBal.remaining} of {earnedBal.total} remaining</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(earnedBal.remaining / earnedBal.total) * 100}%` }} />
                      </div>
                    </div>

                    {/* Comp Off */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                        <span>Comp Off</span>
                        <span>2 of 2 remaining</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setShowLeaveModal(true); setLeaveMsg({ type: '', text: '' }); }}
                    className="w-full py-3.5 rounded-xl border border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-300 text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Apply for Leave
                  </button>
                </div>

                {/* Announcements */}
                <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-white font-sans">Announcements</h3>
                  <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                    <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 font-mono uppercase block">Events</span>
                      <p className="font-semibold text-white">Employee Appreciation Day — Jun 14</p>
                      <span className="text-[9px] text-indigo-200/30 font-medium">All hands meeting · 10 AM confirmed</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-1">
                      <span className="text-[10px] font-bold text-sky-400 font-mono uppercase block">Holidays</span>
                      <p className="font-semibold text-white">Office closed — June 20 (Fri)</p>
                      <span className="text-[9px] text-indigo-200/30 font-medium">Public holiday · Eid confirmed</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-1">
                      <span className="text-[10px] font-bold text-purple-400 font-mono uppercase block">Reviews</span>
                      <p className="font-semibold text-white">New appraisal cycle starts July 1</p>
                      <span className="text-[9px] text-indigo-200/30 font-medium">Self reviews due Jun 28</span>
                    </div>
                  </div>
                </div>

                {/* My tasks checklist */}
                <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-white font-sans">My Tasks</h3>
                  <div className="space-y-3.5">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between text-xs font-semibold text-slate-300">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleToggleTask(task.id)}
                            className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all ${
                              task.completed
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'border-white/[0.15] hover:border-indigo-400 text-transparent'
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <span className={task.completed ? 'line-through text-indigo-200/30' : 'text-slate-200'}>
                            {task.text}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                          task.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          task.status === 'review' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-3xl p-8 shadow-2xl space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                <Sliders className="h-5 w-5 text-indigo-400" />
                <span>Update Personal Profile Details</span>
              </h2>
              <p className="text-indigo-200/40 text-xs mt-1 font-mono">
                Update emergency details, skills, contact data, and active bank profiles.
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6 text-xs font-semibold text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* SECTION 1: Personal Info */}
                <div className="bg-white/[0.01] border border-white/[0.03] p-5 rounded-2xl space-y-4">
                  <h3 className="text-[10px] font-bold text-indigo-400 font-mono tracking-wider uppercase">Personal Information</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Gender</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer Not To Say</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Skills (Comma-separated)</label>
                    <input
                      type="text"
                      value={profileForm.skills}
                      onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                      placeholder="React, Next.js, Node.js"
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* SECTION 2: Address Info */}
                <div className="bg-white/[0.01] border border-white/[0.03] p-5 rounded-2xl space-y-4">
                  <h3 className="text-[10px] font-bold text-indigo-400 font-mono tracking-wider uppercase">Residential Address</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Street Address</label>
                    <input
                      type="text"
                      value={profileForm.address.street}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        address: { ...profileForm.address, street: e.target.value }
                      })}
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">City</label>
                      <input
                        type="text"
                        value={profileForm.address.city}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, city: e.target.value }
                        })}
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">State</label>
                      <input
                        type="text"
                        value={profileForm.address.state}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, state: e.target.value }
                        })}
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Pincode</label>
                      <input
                        type="text"
                        value={profileForm.address.pincode}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, pincode: e.target.value }
                        })}
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Country</label>
                      <input
                        type="text"
                        value={profileForm.address.country}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, country: e.target.value }
                        })}
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Emergency Contact */}
                <div className="bg-white/[0.01] border border-white/[0.03] p-5 rounded-2xl space-y-4">
                  <h3 className="text-[10px] font-bold text-indigo-400 font-mono tracking-wider uppercase">Emergency Contact</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Contact Name</label>
                    <input
                      type="text"
                      value={profileForm.emergencyContact.name}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        emergencyContact: { ...profileForm.emergencyContact, name: e.target.value }
                      })}
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Relation</label>
                      <input
                        type="text"
                        value={profileForm.emergencyContact.relation}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          emergencyContact: { ...profileForm.emergencyContact, relation: e.target.value }
                        })}
                        placeholder="e.g. Spouse, Parent"
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Contact Phone</label>
                      <input
                        type="tel"
                        value={profileForm.emergencyContact.phone}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          emergencyContact: { ...profileForm.emergencyContact, phone: e.target.value }
                        })}
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Bank Details */}
                <div className="bg-white/[0.01] border border-white/[0.03] p-5 rounded-2xl space-y-4">
                  <h3 className="text-[10px] font-bold text-indigo-400 font-mono tracking-wider uppercase">Bank Account Profile</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Bank Name</label>
                    <input
                      type="text"
                      value={profileForm.bankDetails.bankName}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        bankDetails: { ...profileForm.bankDetails, bankName: e.target.value }
                      })}
                      placeholder="e.g. HDFC Bank"
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Account Holder Name</label>
                    <input
                      type="text"
                      value={profileForm.bankDetails.accountHolderName}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        bankDetails: { ...profileForm.bankDetails, accountHolderName: e.target.value }
                      })}
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Account Number</label>
                      <input
                        type="text"
                        value={profileForm.bankDetails.accountNumber}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          bankDetails: { ...profileForm.bankDetails, accountNumber: e.target.value }
                        })}
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">IFSC Code</label>
                      <input
                        type="text"
                        value={profileForm.bankDetails.ifscCode}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          bankDetails: { ...profileForm.bankDetails, ifscCode: e.target.value }
                        })}
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {profileMsg.text && (
                <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 ${
                  profileMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}>
                  {profileMsg.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 text-green-400 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center justify-center space-x-2 transition-all font-mono uppercase tracking-wider text-[11px]"
              >
                {isSavingProfile ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Save Profile Settings</span>
                  </>
                )}
              </button>
            </form>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                <span>My Company Documents Portal</span>
              </h2>
              <p className="text-indigo-200/40 text-xs mt-1 font-mono">
                View, download and print active corporate compliance agreements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Card 1: Offer Letter */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Employment Offer Letter</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Official job offer specifying designation, annual salary structures, and joining dates.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">Signed</span>
                  <button
                    onClick={() => handlePrintDoc('offer')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>

              {/* Card 2: NDA */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Non-Disclosure Agreement (NDA)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Confidentiality constraints safeguarding source codebases, system configurations, and schemas.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">Verified</span>
                  <button
                    onClick={() => handlePrintDoc('nda')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>

              {/* Card 3: IP Assignment */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Intellectual Property Assignment</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Legal covenant assigning ownership of all modules constructed during active cycles to FWC IT.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">Assigned</span>
                  <button
                    onClick={() => handlePrintDoc('ip')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>

              {/* Card 4: Verification Docs */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit">
                    <User className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Aadhaar & PAN Consent Form</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Consent form signed during onboarding for background identity checks and tax configurations.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">Approved</span>
                  <button
                    onClick={() => handlePrintDoc('consent')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Invalid tab view.</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020105]">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <span className="text-xs text-indigo-200/50 uppercase font-bold tracking-widest font-mono">
          Assembling Employee Portal...
        </span>
      </div>
    );
  }

  // Calculate Net salary taking basic, HRA, special allowance and deductions
  const basicSalaryVal = payrollStructure ? parseFloat(payrollStructure.basic) : 40000;
  const hraVal = payrollStructure ? parseFloat(payrollStructure.hra) : 12000;
  const specialAllowanceVal = payrollStructure ? parseFloat(payrollStructure.special_allowance) : 32000;
  const bonusVal = 8000;
  const grossSalaryVal = basicSalaryVal + hraVal + specialAllowanceVal + bonusVal;

  const pfVal = payrollStructure ? parseFloat(payrollStructure.pf_employee) : 7200;
  const tdsVal = payrollStructure ? parseFloat(payrollStructure.tds) : 8000;
  const ptVal = 200;
  const totalDeductionsVal = pfVal + tdsVal + ptVal;
  const netTakeHomeVal = grossSalaryVal - totalDeductionsVal;

  return (
    <div className="space-y-8 pb-12 animate-fade-in text-slate-100">
      {/* Title & Greeting Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/[0.04] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Good morning, {user?.firstName || 'Priya'}</h1>
          <p className="text-indigo-200/40 text-xs mt-1.5 font-mono">
            Friday, June 6, 2026
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-3 w-64 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3.5 py-2">
            <Search className="h-4 w-4 text-indigo-300/30" />
            <input
              type="text"
              placeholder="Search workspaces..."
              className="bg-transparent border-none focus:outline-none text-xs text-white placeholder-indigo-200/20 w-full"
            />
          </div>
          <button
            onClick={handleAskNexAI}
            className="px-4 py-2 rounded-xl bg-indigo-600/10 border border-indigo-500/25 hover:bg-indigo-600/20 text-indigo-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ask NexAI</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 px-5 py-4 rounded-2xl text-xs flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Employee Profile Banner Card */}
      {profile && (
        <div className="relative overflow-hidden bg-white/[0.01] border border-white/[0.05] rounded-3xl p-6.5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center font-extrabold text-white text-2xl shadow-lg shadow-indigo-600/10 shrink-0">
              {getInitials(`${profile.firstName} ${profile.lastName}`)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{profile.firstName} {profile.lastName}</h2>
              <p className="text-indigo-400 text-xs font-semibold mt-1">
                {profile.employmentDetails?.designation || 'Software Engineer'}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[10px] text-indigo-200/40 font-semibold font-mono uppercase tracking-wider">
                <span>Emp ID: {profile.employeeId}</span>
                <span>{profile.department?.name || 'Engineering Dept'}</span>
                <span>Manager: {profile.reportingManagerId ? `${profile.reportingManagerId.firstName} ${profile.reportingManagerId.lastName}` : 'Anjali Singh'}</span>
              </div>
            </div>
          </div>
          
          {/* Header Stats */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-white/[0.05] pt-4 md:pt-0 md:pl-8">
            <div className="text-center">
              <span className="text-[9px] uppercase font-bold text-indigo-300/30 font-mono tracking-wider">Perf Score</span>
              <span className="text-lg font-black block text-white mt-1">4.2</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] uppercase font-bold text-indigo-300/30 font-mono tracking-wider">Attendance</span>
              <span className="text-lg font-black block text-emerald-400 mt-1">{attendanceRate}%</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] uppercase font-bold text-indigo-300/30 font-mono tracking-wider">Leave Bal</span>
              <span className="text-lg font-black block text-white mt-1">{totalRemainingLeaves}d</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] uppercase font-bold text-indigo-300/30 font-mono tracking-wider">Pending Tasks</span>
              <span className="text-lg font-black block text-rose-400 mt-1">
                {tasks.filter(t => !t.completed).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {renderTabContent()}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#090514] border border-white/[0.08] rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-slide-in text-white">
            <button
              onClick={() => setShowLeaveModal(false)}
              className="absolute top-5 right-5 p-1 text-indigo-200/20 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-bold uppercase tracking-wider mb-5 flex items-center space-x-2">
              <Calendar className="h-4.5 w-4.5 text-indigo-500" />
              <span>Apply for Leave</span>
            </h3>

            <form onSubmit={handleLeaveSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none cursor-pointer"
                >
                  <option className="bg-[#090514]" value="casual">Casual Leave</option>
                  <option className="bg-[#090514]" value="sick">Sick Leave</option>
                  <option className="bg-[#090514]" value="earned">Earned Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">From Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.fromDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">To Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.toDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={leaveForm.reason}
                  placeholder="Explain why leave is requested..."
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white placeholder-indigo-200/10 focus:outline-none resize-none"
                />
              </div>

              {leaveMsg.text && (
                <div className={`p-3.5 rounded-xl text-[11px] flex items-center space-x-2 ${
                  leaveMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}>
                  {leaveMsg.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 text-green-400 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />}
                  <span>{leaveMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingLeave}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center justify-center space-x-2 transition-all font-mono uppercase tracking-wider text-[11px]"
              >
                {isSubmittingLeave ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Application</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeDashboard() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#020105]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <EmployeeDashboardContent />
    </Suspense>
  );
}
