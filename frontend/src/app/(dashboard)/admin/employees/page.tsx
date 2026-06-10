'use client'; 

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Users,
  Search,
  Plus,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  FileSpreadsheet,
  UserSearch,
  GitFork,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Briefcase
} from 'lucide-react';

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: {
    _id: string;
    name: string;
    code: string;
  };
  employmentDetails?: {
    designation: string;
    employmentType: string;
  };
  isActive: boolean;
}

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface OrgNode {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  designation: string;
  parentId: string | null;
  photo?: string | null;
}

export default function EmployeeManagement() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'list' | 'import' | 'chart'>('list');

  // Employee Directory state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [isSubmittingOnboard, setIsSubmittingOnboard] = useState(false);
  const [onboardError, setOnboardError] = useState('');
  const [onboardSuccess, setOnboardSuccess] = useState('');

  // Add Employee Form fields
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGender, setNewGender] = useState('male');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('FWConboard@2026');
  const [newRole, setNewRole] = useState('employee');
  const [newDeptId, setNewDeptId] = useState('');
  const [newDesignation, setNewDesignation] = useState('Software Engineer');
  const [newCtc, setNewCtc] = useState('800000');

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importLog, setImportLog] = useState('');

  // Org Chart state
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  // Trigger modal open if query contains action=add
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsAddModalOpen(true);
    }
  }, [searchParams]);

  // Load Employees and Departments
  const loadEmployees = async () => {
    setIsLoadingList(true);
    try {
      const response = await api.get('/employees', {
        params: {
          page,
          search,
          department: selectedDept,
          role: selectedRole,
          limit: 10,
        },
      });
      setEmployees(response.data.employees);
      setTotalPages(response.data.pagination.pages || 1);
    } catch (e) {
      console.error('Failed to load employee list:', e);
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get('/auth/departments');
      setDepartments(response.data);
      if (response.data.length > 0) {
        setNewDeptId(response.data[0]._id);
      }
    } catch (e) {
      console.error('Failed to fetch departments:', e);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [page, selectedDept, selectedRole]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadEmployees();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadDepartments();
  }, []);

  // Org Chart loader
  const loadOrgChart = async () => {
    setIsLoadingChart(true);
    try {
      const response = await api.get('/employees/org-chart');
      setOrgNodes(response.data);
    } catch (e) {
      console.error('Failed to load org chart hierarchy:', e);
    } finally {
      setIsLoadingChart(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'chart') {
      loadOrgChart();
    }
  }, [activeTab]);

  // Onboard Submit
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError('');
    setOnboardSuccess('');

    if (!newFirstName || !newLastName || !newEmail || !newPassword || !newCtc) {
      setOnboardError('Please fill in all mandatory fields.');
      return;
    }

    if (!newEmail.endsWith('@fwcit.com')) {
      setOnboardError('Employee emails must end with @fwcit.com domain.');
      return;
    }

    setIsSubmittingOnboard(true);
    try {
      const payload = {
        firstName: newFirstName,
        lastName: newLastName,
        phone: newPhone,
        gender: newGender,
        email: newEmail.toLowerCase(),
        password: newPassword,
        role: newRole,
        departmentId: newDeptId,
        designation: newDesignation,
        ctcAnnual: newCtc,
      };

      const response = await api.post('/employees', payload);
      setOnboardSuccess(response.data.message || 'Employee successfully onboarded.');
      loadEmployees();
      
      // Reset forms
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setNewEmail('');
      setNewPassword('FWConboard@2026');
      setModalStep(1);
    } catch (err: any) {
      console.error('Onboard error:', err);
      setOnboardError(err.response?.data?.message || 'Failed to onboard employee.');
    } finally {
      setIsSubmittingOnboard(false);
    }
  };

  // CSV Manual Parser Fallback
  const handleCSVImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportLog('');

    if (!csvText.trim()) {
      setImportLog('Error: CSV input is empty.');
      return;
    }

    setIsImporting(true);
    try {
      const rows = csvText.split('\n').map((row) => row.split(','));
      // Expect header row: firstName, lastName, email, role, designation, ctc
      const headers = rows[0].map((h) => h.trim());
      
      const parsedEmployees: any[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 5 || !row[0].trim()) continue; // skip blank rows
        
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowData[h] = row[idx]?.trim() || '';
        });

        parsedEmployees.push(rowData);
      }

      if (parsedEmployees.length === 0) {
        setImportLog('Error: Found 0 rows of data.');
        setIsImporting(false);
        return;
      }

      setImportLog(`Sending ${parsedEmployees.length} records to backend...`);
      const response = await api.post('/employees/bulk-import', { employees: parsedEmployees });
      
      const resData = response.data;
      setImportLog(`SUCCESS:\nOnboarded: ${resData.successCount} employees.\nFailed: ${resData.failCount}.\n`);
      if (resData.errors.length > 0) {
        setImportLog((prev) => prev + `\nErrors:\n` + resData.errors.map((err: any) => `- Row ${err.index + 1}: ${err.email} - ${err.reason}`).join('\n'));
      }
      
      loadEmployees();
      setCsvText('');
    } catch (err: any) {
      console.error('CSV import error:', err);
      setImportLog(`Error running CSV import: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Render Org Chart recursive card components
  const renderOrgSubTree = (parentId: string | null, depth = 0) => {
    const children = orgNodes.filter((node) => node.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <div className={`pl-6 border-l border-white/10 space-y-4 ${depth > 0 ? 'mt-4' : ''}`}>
        {children.map((node) => (
          <div key={node.id} className="space-y-2">
            <div className="flex items-center space-x-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl max-w-sm">
              <div className="h-8 w-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300 uppercase">
                {node.name[0]}
              </div>
              <div>
                <span className="font-bold text-xs text-white block">{node.name}</span>
                <span className="text-[10px] text-indigo-200/40 block mt-0.5">{node.designation} • {node.employeeId}</span>
              </div>
            </div>
            {renderOrgSubTree(node.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Employee Directory</h1>
          <p className="text-indigo-200/50 text-xs mt-1">Manage corporate access lists, departments, and organization trees.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setOnboardSuccess('');
              setOnboardError('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-lg transition-all"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Onboard Hire
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex space-x-2 border-b border-white/[0.05] pb-px">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-semibold tracking-wide transition-all ${
            activeTab === 'list'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-indigo-200/30 hover:text-white'
          }`}
        >
          <UserSearch className="h-4 w-4" />
          <span>Active Directory</span>
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-semibold tracking-wide transition-all ${
            activeTab === 'import'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-indigo-200/30 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Bulk Onboarding CSV</span>
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-semibold tracking-wide transition-all ${
            activeTab === 'chart'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-indigo-200/30 hover:text-white'
          }`}
        >
          <GitFork className="h-4 w-4" />
          <span>Org Structure</span>
        </button>
      </div>

      {/* TAB 1: Directory Table List */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between bg-white/[0.02] border border-white/[0.05] p-4 rounded-2xl">
            {/* Search */}
            <div className="flex items-center space-x-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2 w-full md:max-w-md">
              <Search className="h-4 w-4 text-indigo-300/30" />
              <input
                type="text"
                placeholder="Search by name or employee ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-xs text-white placeholder-indigo-200/20 w-full"
              />
            </div>
            
            {/* Select Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
                className="bg-neutral-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>

              <select
                value={selectedRole}
                onChange={(e) => { setSelectedRole(e.target.value); setPage(1); }}
                className="bg-neutral-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Access Roles</option>
                <option value="admin">System Admin</option>
                <option value="manager">Manager</option>
                <option value="hr_recruiter">HR Recruiter</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-xl">
            {isLoadingList ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
                <span className="text-xs text-indigo-200/30 uppercase font-bold tracking-widest font-mono">
                  Loading Directory...
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.05] bg-white/[0.01] text-[10px] uppercase font-bold tracking-wider text-indigo-200/40">
                      <th className="py-4 px-6">Employee</th>
                      <th className="py-4 px-6">ID & Email</th>
                      <th className="py-4 px-6">Access Role</th>
                      <th className="py-4 px-6">Department</th>
                      <th className="py-4 px-6">Designation</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-xs">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-indigo-200/20 font-medium">
                          No employees found in directory.
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp) => (
                        <tr key={emp._id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-4 px-6 font-bold text-white">
                            {emp.firstName} {emp.lastName}
                          </td>
                          <td className="py-4 px-6 font-mono text-[11px]">
                            <span className="block text-indigo-300 font-bold">{emp.employeeId}</span>
                            <span className="block text-indigo-200/30 mt-0.5">{emp.email}</span>
                          </td>
                          <td className="py-4 px-6 uppercase text-[10px] font-bold text-indigo-200/60">
                            {emp.role.replace('_', ' ')}
                          </td>
                          <td className="py-4 px-6 text-indigo-200/70">
                            {emp.department?.name || 'Unassigned'}
                          </td>
                          <td className="py-4 px-6 text-indigo-200/70">
                            {emp.employmentDetails?.designation || 'Software Engineer'}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              emp.isActive 
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                              <span>{emp.isActive ? 'Active' : 'Terminated'}</span>
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Link
                              href={`/admin/employees/${emp._id}`}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/10 text-indigo-300 font-bold hover:text-white"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="p-4 bg-white/[0.01] border-t border-white/[0.05] flex items-center justify-between">
                <span className="text-[10px] text-indigo-200/30 font-medium">Page {page} of {totalPages}</span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1.5 border border-white/5 rounded-lg text-indigo-200/40 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4.5 w-4.5" />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1.5 border border-white/5 rounded-lg text-indigo-200/40 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* TAB 2: Bulk Onboarding */}
      {activeTab === 'import' && (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
              <span>Bulk Employee Imports</span>
            </h2>
            <p className="text-indigo-200/40 text-xs mt-1">
              Onboard multiple hires simultaneously using CSV formatting. Copy and paste raw CSV values.
            </p>
          </div>

          <form onSubmit={handleCSVImportSubmit} className="space-y-4">
            <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-2xl p-4 text-xs font-mono">
              <span className="font-bold text-indigo-400 block mb-2 uppercase tracking-wide">CSV Input Template (First row must be header):</span>
              firstName, lastName, email, role, designation, ctc
              <br />
              Nithin, Nair, nithin@fwcit.com, employee, Frontend Dev, 800000
              <br />
              Shweta, Iyer, shweta@fwcit.com, employee, QA Engineer, 700000
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-200/70 mb-2">CSV Content</label>
              <textarea
                rows={6}
                required
                placeholder="firstName, lastName, email, role, designation, ctc&#10;Arjun, Mehta, arjun.mehta@fwcit.com, employee, Software Engineer, 900000"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                disabled={isImporting}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-4 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isImporting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing CSV...
                </>
              ) : (
                'Import & Onboard Directory'
              )}
            </button>
          </form>

          {importLog && (
            <div className="bg-[#090514] border border-white/[0.05] rounded-2xl p-5 font-mono text-[11px] leading-relaxed text-indigo-200/80 whitespace-pre-wrap">
              <span className="font-bold text-indigo-400 block mb-2 border-b border-white/5 pb-1">Import Execution Log:</span>
              {importLog}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Org Chart Structure */}
      {activeTab === 'chart' && (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <GitFork className="h-5 w-5 text-indigo-400" />
              <span>Hierarchical Reporting Structure</span>
            </h2>
            <p className="text-indigo-200/40 text-xs mt-1">Nested org charts compiled directly from database direct report logs.</p>
          </div>

          {isLoadingChart ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
              <span className="text-xs text-indigo-200/30 uppercase font-bold tracking-widest font-mono">
                Compiling Org Hierarchy...
              </span>
            </div>
          ) : (
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl overflow-x-auto">
              {/* Root Nodes (employees with ParentId null, i.e. Admins/top leaders) */}
              <div className="space-y-6 min-w-[500px]">
                {orgNodes.filter((node) => !node.parentId).map((rootNode) => (
                  <div key={rootNode.id} className="space-y-4">
                    <div className="flex items-center space-x-3 p-3.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-xl max-w-sm">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white uppercase shadow-md">
                        {rootNode.name[0]}
                      </div>
                      <div>
                        <span className="font-extrabold text-sm text-white block">{rootNode.name}</span>
                        <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block mt-0.5">{rootNode.designation} • {rootNode.employeeId}</span>
                      </div>
                    </div>
                    {renderOrgSubTree(rootNode.id)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Onboard Hire Drawer */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090514] border border-white/[0.1] rounded-3xl w-full max-w-lg shadow-[0_30px_70px_rgba(0,0,0,0.8)] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-white/[0.05] flex justify-between items-center bg-[#020105]/20">
              <div>
                <h3 className="font-extrabold text-white text-base">Onboard New Talent</h3>
                <span className="text-[10px] text-indigo-300/40 uppercase font-semibold">Step {modalStep} of 3</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-indigo-200/40 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8">
              {onboardError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2.5 rounded-xl text-xs mb-5">
                  {onboardError}
                </div>
              )}

              {onboardSuccess ? (
                <div className="text-center space-y-4 py-4 animate-fade-in">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Hire Onboarded Successfully</h4>
                    <p className="text-indigo-200/50 text-xs mt-1">{onboardSuccess}</p>
                  </div>
                  <button
                    onClick={() => {
                      setOnboardSuccess('');
                      setIsAddModalOpen(false);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 px-6 rounded-xl transition-all"
                  >
                    Close Drawer
                  </button>
                </div>
              ) : (
                <form onSubmit={handleOnboardSubmit} className="space-y-4" autoComplete="off">
                  {/* Step 1: Personal Details */}
                  {modalStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/60 mb-1.5">First Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Sunita"
                            value={newFirstName}
                            onChange={(e) => setNewFirstName(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white placeholder-indigo-200/20 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/60 mb-1.5">Last Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Rao"
                            value={newLastName}
                            onChange={(e) => setNewLastName(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white placeholder-indigo-200/20 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/60 mb-1.5">Contact Phone</label>
                          <input
                            type="tel"
                            placeholder="+91-9876543210"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white placeholder-indigo-200/20 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/60 mb-1.5">Gender</label>
                          <select
                            value={newGender}
                            onChange={(e) => setNewGender(e.target.value)}
                            className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none cursor-pointer"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (newFirstName && newLastName) setModalStep(2);
                          else setOnboardError('First name and last name are required.');
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center mt-6"
                      >
                        Next Details <ArrowRight className="h-4 w-4 ml-1.5" />
                      </button>
                    </div>
                  )}

                  {/* Step 2: Work Roles */}
                  {modalStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/60 mb-1.5">Access Role</label>
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none cursor-pointer"
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="hr_recruiter">HR Recruiter</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/60 mb-1.5">Department</label>
                          <select
                            value={newDeptId}
                            onChange={(e) => setNewDeptId(e.target.value)}
                            className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none cursor-pointer"
                          >
                            {departments.map((d) => (
                              <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/60 mb-1.5">Designation</label>
                          <input
                            type="text"
                            required
                            value={newDesignation}
                            onChange={(e) => setNewDesignation(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/60 mb-1.5">Annual CTC (INR)</label>
                          <input
                            type="number"
                            required
                            value={newCtc}
                            onChange={(e) => setNewCtc(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 mt-6">
                        <button
                          type="button"
                          onClick={() => setModalStep(1)}
                          className="flex-1 border border-white/5 hover:border-white/10 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center"
                        >
                          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalStep(3)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center"
                        >
                          Next Details <ArrowRight className="h-4 w-4 ml-1.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Login Credentials */}
                  {modalStep === 3 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/60 mb-1.5">Corporate Email</label>
                        <input
                          type="email"
                          required
                          autoComplete="off"
                          placeholder="username@fwcit.com"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white placeholder-indigo-200/20 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/60 mb-1.5">Access Password</label>
                        <input
                          type="text"
                          required
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>

                      <div className="flex gap-4 mt-6">
                        <button
                          type="button"
                          onClick={() => setModalStep(2)}
                          disabled={isSubmittingOnboard}
                          className="flex-1 border border-white/5 hover:border-white/10 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center disabled:opacity-50"
                        >
                          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingOnboard}
                          className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center disabled:opacity-50"
                        >
                          {isSubmittingOnboard ? (
                            <>
                              <Loader2 className="h-4.5 w-4.5 animate-spin mr-1.5" /> Onboarding...
                            </>
                          ) : (
                            'Confirm Onboarding'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
