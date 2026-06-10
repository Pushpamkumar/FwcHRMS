'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  ArrowLeft,
  CalendarDays
} from 'lucide-react';

interface EmployeeProfile {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  gender?: string;
  isActive: boolean;
  department?: {
    _id: string;
    name: string;
    code: string;
  };
  reportingManagerId?: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  employmentDetails?: {
    designation: string;
    employmentType: string;
    joiningDate: string;
    workMode: string;
    noticePeriod: number;
  };
}

interface LeaveBalance {
  leave_type: string;
  total_days: string;
  used_days: string;
  pending_days: string;
  remaining_days: string;
}

interface PayrollStructure {
  ctc_annual: string;
  basic: string;
  hra: string;
  special_allowance: string;
  pf_employee: string;
  professional_tax: string;
  tds: string;
}

export default function EmployeeProfileDetails() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [payrollStructure, setPayrollStructure] = useState<PayrollStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing stats
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [newCtc, setNewCtc] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadProfileData = async () => {
    try {
      setErrorMsg('');
      const response = await api.get(`/employees/${employeeId}`);
      const data = response.data;
      setProfile(data.profile);
      setLeaveBalances(data.leaveBalances);
      setPayrollStructure(data.payrollStructure);
      if (data.payrollStructure) {
        setNewCtc(parseFloat(data.payrollStructure.ctc_annual).toString());
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
      setErrorMsg('Failed to load employee details. Verify that API server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadProfileData();
    }
  }, [employeeId]);

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsUpdating(true);

    try {
      await api.put(`/employees/${employeeId}`, {
        ctcAnnual: newCtc
      });
      setSuccessMsg('Salary structure updated successfully.');
      setIsEditingSalary(false);
      loadProfileData();
    } catch (err: any) {
      console.error('Salary update failed:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update salary.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!profile) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsUpdating(true);

    try {
      const nextStatus = !profile.isActive;
      await api.put(`/employees/${employeeId}`, {
        isActive: nextStatus
      });
      setSuccessMsg(`Employee account is now ${nextStatus ? 'Activated' : 'Suspended'}.`);
      loadProfileData();
    } catch (err: any) {
      console.error('Status toggle failed:', err);
      setErrorMsg('Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
        <span className="text-xs text-indigo-200/50 uppercase font-bold tracking-widest font-mono">
          Loading Profile Details...
        </span>
      </div>
    );
  }

  if (errorMsg && !profile) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-6 rounded-2xl max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
        <p className="text-sm font-bold">{errorMsg}</p>
        <button
          onClick={() => router.push('/admin/employees')}
          className="px-4 py-2 bg-indigo-600 rounded-xl text-xs font-semibold text-white"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Back button & profile header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.05] pb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/admin/employees')}
            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {profile.firstName} {profile.lastName}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                profile.isActive
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {profile.isActive ? 'Active' : 'Suspended'}
              </span>
            </div>
            <p className="text-indigo-200/50 text-xs mt-1">
              {profile.employmentDetails?.designation} • {profile.employeeId}
            </p>
          </div>
        </div>

        {/* Admin operations */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleStatus}
            disabled={isUpdating}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              profile.isActive
                ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                : 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
            }`}
          >
            {profile.isActive ? 'Suspend Employee' : 'Activate Employee'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-200 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="h-4.5 w-4.5 text-green-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2">
          <AlertCircle className="h-4.5 w-4.5 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Details Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1: General Details */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/[0.04] pb-2 flex items-center space-x-2">
            <User className="h-4.5 w-4.5 text-indigo-400" />
            <span>Profile Overview</span>
          </h2>
          
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-indigo-200/40 font-semibold block mb-1">Email Address</span>
              <div className="flex items-center space-x-2 text-white">
                <Mail className="h-4 w-4 text-indigo-300/30" />
                <span>{profile.email}</span>
              </div>
            </div>
            <div>
              <span className="text-indigo-200/40 font-semibold block mb-1">Phone Number</span>
              <div className="flex items-center space-x-2 text-white">
                <Phone className="h-4 w-4 text-indigo-300/30" />
                <span>{profile.phone || 'N/A'}</span>
              </div>
            </div>
            <div>
              <span className="text-indigo-200/40 font-semibold block mb-1">Department</span>
              <div className="flex items-center space-x-2 text-white">
                <Briefcase className="h-4 w-4 text-indigo-300/30" />
                <span>{profile.department?.name || 'Unassigned'} ({profile.department?.code || 'N/A'})</span>
              </div>
            </div>
            <div>
              <span className="text-indigo-200/40 font-semibold block mb-1">Reporting Manager</span>
              <div className="flex items-center space-x-2 text-white">
                <User className="h-4 w-4 text-indigo-300/30" />
                <span>
                  {profile.reportingManagerId 
                    ? `${profile.reportingManagerId.firstName} ${profile.reportingManagerId.lastName}` 
                    : 'Unassigned'}
                </span>
              </div>
            </div>
            <div>
              <span className="text-indigo-200/40 font-semibold block mb-1">Joining Date</span>
              <div className="flex items-center space-x-2 text-white">
                <Calendar className="h-4 w-4 text-indigo-300/30" />
                <span>
                  {profile.employmentDetails?.joiningDate 
                    ? new Date(profile.employmentDetails.joiningDate).toLocaleDateString() 
                    : 'N/A'}
                </span>
              </div>
            </div>
            <div>
              <span className="text-indigo-200/40 font-semibold block mb-1">Work Mode</span>
              <span className="text-indigo-200 px-2 py-0.5 rounded bg-white/5 uppercase font-bold text-[9px]">
                {profile.employmentDetails?.workMode || 'hybrid'}
              </span>
            </div>
          </div>
        </div>

        {/* Column 2 & 3 Right Side */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Salary Compensation Management */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-3 mb-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <DollarSign className="h-4.5 w-4.5 text-indigo-400" />
                <span>Salary Structure & Payouts</span>
              </h2>
              <button
                onClick={() => setIsEditingSalary(!isEditingSalary)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                {isEditingSalary ? 'Cancel Editing' : 'Revise CTC'}
              </button>
            </div>

            {isEditingSalary ? (
              <form onSubmit={handleUpdateSalary} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-indigo-200/70 mb-2">
                    Revised Annual CTC (INR)
                  </label>
                  <input
                    type="number"
                    required
                    value={newCtc}
                    onChange={(e) => setNewCtc(e.target.value)}
                    disabled={isUpdating}
                    className="w-full max-w-md bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Save CTC Revision
                </button>
              </form>
            ) : payrollStructure ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4">
                  <span className="text-indigo-200/40 font-semibold block mb-1">Annual CTC</span>
                  <span className="text-base font-extrabold text-white">
                    ₹{(parseFloat(payrollStructure.ctc_annual) / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4">
                  <span className="text-indigo-200/40 font-semibold block mb-1">Basic Salary / mo</span>
                  <span className="text-base font-extrabold text-white">
                    ₹{Math.round(parseFloat(payrollStructure.basic)).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4">
                  <span className="text-indigo-200/40 font-semibold block mb-1">HRA / mo</span>
                  <span className="text-base font-extrabold text-white">
                    ₹{Math.round(parseFloat(payrollStructure.hra)).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4">
                  <span className="text-indigo-200/40 font-semibold block mb-1">Special Allowance / mo</span>
                  <span className="text-base font-extrabold text-white">
                    ₹{Math.round(parseFloat(payrollStructure.special_allowance)).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4">
                  <span className="text-indigo-200/40 font-semibold block mb-1">PF Contribution / mo</span>
                  <span className="text-base font-extrabold text-white">
                    ₹{Math.round(parseFloat(payrollStructure.pf_employee)).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4">
                  <span className="text-indigo-200/40 font-semibold block mb-1">TDS / mo</span>
                  <span className="text-base font-extrabold text-white">
                    ₹{Math.round(parseFloat(payrollStructure.tds)).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-indigo-200/20 py-4 font-medium">
                No active salary structure found. Onboard employee to configure.
              </div>
            )}
          </div>

          {/* Active Leave Balances */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/[0.04] pb-3 mb-5 flex items-center space-x-2">
              <CalendarDays className="h-4.5 w-4.5 text-indigo-400" />
              <span>Leave Balances ({new Date().getFullYear()})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              {leaveBalances.length === 0 ? (
                <div className="col-span-3 text-indigo-200/20 py-4 font-medium">
                  No active leave records found.
                </div>
              ) : (
                leaveBalances.map((balance) => (
                  <div
                    key={balance.leave_type}
                    className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-200/40 tracking-wider">
                        {balance.leave_type.replace('_', ' ')} Leaves
                      </span>
                      <span className="text-2xl font-extrabold block text-white mt-1.5">
                        {parseFloat(balance.remaining_days)}
                      </span>
                    </div>
                    <span className="text-[10px] text-indigo-200/20 mt-4 block">
                      Total: {parseFloat(balance.total_days)} • Used: {parseFloat(balance.used_days)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
