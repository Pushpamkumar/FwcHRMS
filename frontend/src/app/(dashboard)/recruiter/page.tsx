'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Briefcase,
  Users,
  Plus,
  Loader2,
  AlertCircle,
  TrendingUp,
  Brain,
  Send,
  UserCheck,
  CheckCircle,
  XCircle,
  FileText,
  Building2,
  ChevronRight,
  ArrowRight,
  UserX,
  X,
  PhoneCall,
  MessageSquare,
  BarChart,
  Calendar,
  Settings,
  Sparkles
} from 'lucide-react';

interface JobPosting {
  _id: string;
  title: string;
  departmentId?: {
    _id: string;
    name: string;
    code: string;
  };
  requirements: {
    minExperience: number;
    maxExperience: number;
    requiredSkills: string[];
    education: string;
    location: string;
  };
  salaryRange?: {
    min: number;
    max: number;
  };
  applicationsCount: number;
  shortlistedCount: number;
  status: string;
}

interface CandidateApplication {
  _id: string;
  jobPostingId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  resumeUrl: string;
  applicationStage: 'screening' | 'shortlisted' | 'phone_screen' | 'technical_interview' | 'hr_interview' | 'offer' | 'hired' | 'rejected';
  appliedAt: string;
  aiScreening?: {
    overallScore: number;
    status: string;
    scores?: {
      skillsMatch: number;
      experienceMatch: number;
      educationMatch: number;
    };
    matchedSkills?: string[];
    missingSkills?: string[];
    extractedInfo?: {
      yearsExperience?: number;
      skills?: string[];
      education?: string;
    };
    aiSummary?: string;
    aiModel?: string;
  };
  offerDetails?: {
    designation: string;
    salaryAnnual: number;
    joiningDate: string;
    status: 'pending_manager' | 'approved' | 'rejected' | 'none';
    managerNotes?: string;
  };
}

const KANBAN_STAGES = [
  { id: 'screening', label: 'Screening', color: 'border-yellow-500/25 bg-yellow-500/5 text-yellow-400' },
  { id: 'shortlisted', label: 'Shortlisted', color: 'border-indigo-500/25 bg-indigo-500/5 text-indigo-400' },
  { id: 'phone_screen', label: 'Phone Screen', color: 'border-blue-500/25 bg-blue-500/5 text-blue-400' },
  { id: 'technical_interview', label: 'Tech Round', color: 'border-purple-500/25 bg-purple-500/5 text-purple-400' },
  { id: 'hr_interview', label: 'HR Round', color: 'border-orange-500/25 bg-orange-500/5 text-orange-400' },
  { id: 'offer', label: 'Offer', color: 'border-teal-500/25 bg-teal-500/5 text-teal-400' },
  { id: 'hired', label: 'Hired', color: 'border-green-500/25 bg-green-500/5 text-green-400' },
  { id: 'rejected', label: 'Rejected', color: 'border-red-500/25 bg-red-500/5 text-red-400' },
];

function RecruiterDashboardContent() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppsLoading, setIsAppsLoading] = useState(false);
  const [error, setError] = useState('');

  // Job Modal State
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    departmentId: '',
    description: '',
    minExperience: '',
    maxExperience: '',
    requiredSkills: '',
    education: '',
    location: '',
    salaryMin: '',
    salaryMax: ''
  });
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [jobMsg, setJobMsg] = useState({ type: '', text: '' });

  // Candidate Detail Drawer/Modal
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateApplication | null>(null);

  // Scheduler State
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '', round: 'technical_interview', interviewer: '' });
  const [scheduleMsg, setScheduleMsg] = useState('');

  // Offer Request State
  const [offerForm, setOfferForm] = useState({ designation: '', salaryAnnual: '', joiningDate: '' });
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerMsg, setOfferMsg] = useState('');

  // JD Generator State
  const [jdTitle, setJdTitle] = useState('');
  const [jdDept, setJdDept] = useState('');
  const [jdSkills, setJdSkills] = useState('');
  const [jdSalary, setJdSalary] = useState('');
  const [jdQualification, setJdQualification] = useState('');
  const [generatedJd, setGeneratedJd] = useState('');
  const [isGeneratingJd, setIsGeneratingJd] = useState(false);

  // Hiring Requests State
  const [hiringRequests, setHiringRequests] = useState<any[]>([]);
  const [isHiringLoading, setIsHiringLoading] = useState(false);

  // Interviews — real backend data
  const [interviewApps, setInterviewApps] = useState<any[]>([]);
  const [isInterviewsLoading, setIsInterviewsLoading] = useState(false);

  // Offers & Hires — real backend data
  const [offerApps, setOfferApps] = useState<any[]>([]);
  const [isOffersLoading, setIsOffersLoading] = useState(false);

  // Analytics — computed from all applications
  const [analyticsApps, setAnalyticsApps] = useState<any[]>([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  const loadHiringRequests = async () => {
    setIsHiringLoading(true);
    try {
      const res = await api.get('/recruitment/hiring-requests');
      setHiringRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load hiring requests:', err);
    } finally {
      setIsHiringLoading(false);
    }
  };

  const loadInterviews = async () => {
    setIsInterviewsLoading(true);
    try {
      const res = await api.get('/recruitment/all-applications?filter=interviews');
      setInterviewApps(res.data || []);
    } catch (err) {
      console.error('Failed to load interview data:', err);
    } finally {
      setIsInterviewsLoading(false);
    }
  };

  const loadOffers = async () => {
    setIsOffersLoading(true);
    try {
      const res = await api.get('/recruitment/all-applications?filter=offers');
      setOfferApps(res.data || []);
    } catch (err) {
      console.error('Failed to load offers data:', err);
    } finally {
      setIsOffersLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      const res = await api.get('/recruitment/all-applications?filter=all');
      setAnalyticsApps(res.data || []);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'hiring_requests') loadHiringRequests();
    if (currentTab === 'interviews') loadInterviews();
    if (currentTab === 'hires') loadOffers();
    // Both analytics AND screener tab need the full dataset
    if (currentTab === 'analytics' || currentTab === 'screener') loadAnalytics();
  }, [currentTab]);

  const handleHiringRequestAction = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/recruitment/hiring-requests/${requestId}/status`, { status });
      await loadHiringRequests();
      if (status === 'approved') {
        alert('Hiring request approved! You can now create the corresponding job opening using the "Add Job Opening" button.');
      }
    } catch (err: any) {
      console.error('Hiring request action failed:', err);
      alert(err.response?.data?.message || 'Failed to update request.');
    }
  };

  const loadInitialData = async () => {
    try {
      setError('');
      const [jobsRes, deptRes] = await Promise.all([
        api.get('/recruitment/jobs'),
        api.get('/employees/departments').then(res => res.data).catch(() => [])
      ]);
      
      const activeJobs = jobsRes.data || [];
      setJobs(activeJobs);
      setDepartments(deptRes || []);

      if (activeJobs.length > 0) {
        setSelectedJobId(activeJobs[0]._id);
      }
    } catch (err: any) {
      console.error('Recruiter load data failed:', err);
      setError('Connection failed. Verify Node API server.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadApplications = async (jobId: string) => {
    if (!jobId) return;
    setIsAppsLoading(true);
    try {
      const res = await api.get(`/recruitment/jobs/${jobId}/applications`);
      setApplications(res.data || []);
    } catch (err) {
      console.error('Failed to load job applications:', err);
    } finally {
      setIsAppsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      loadApplications(selectedJobId);
    }
  }, [selectedJobId]);

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingJob(true);
    setJobMsg({ type: '', text: '' });

    try {
      const res = await api.post('/recruitment/jobs', jobForm);
      setJobMsg({ type: 'success', text: res.data.message || 'Job created successfully!' });
      setJobForm({
        title: '',
        departmentId: '',
        description: '',
        minExperience: '',
        maxExperience: '',
        requiredSkills: '',
        education: '',
        location: '',
        salaryMin: '',
        salaryMax: ''
      });

      const jobsRes = await api.get('/recruitment/jobs');
      setJobs(jobsRes.data || []);
      if (jobsRes.data?.length > 0 && !selectedJobId) {
        setSelectedJobId(jobsRes.data[0]._id);
      }

      setTimeout(() => setShowJobModal(false), 2000);
    } catch (err: any) {
      console.error('Job creation failed:', err);
      setJobMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to create Job. Check inputs.'
      });
    } finally {
      setIsSubmittingJob(false);
    }
  };

  const handleAdvanceStage = async (candidateId: string, currentStage: string) => {
    const stageOrder: CandidateApplication['applicationStage'][] = [
      'screening', 'shortlisted', 'phone_screen', 'technical_interview', 'hr_interview', 'offer', 'hired'
    ];
    const currentIndex = stageOrder.indexOf(currentStage as any);
    if (currentIndex === -1 || currentIndex === stageOrder.length - 1) return;

    const nextStage = stageOrder[currentIndex + 1];
    try {
      await api.put(`/recruitment/recruitment/${candidateId}/stage`, { stage: nextStage });
      await loadApplications(selectedJobId);
      if (selectedCandidate && selectedCandidate._id === candidateId) {
        setSelectedCandidate(prev => prev ? { ...prev, applicationStage: nextStage } : null);
      }
    } catch (err: any) {
      console.error('Stage transition failed:', err);
      alert(err.response?.data?.message || 'Failed to advance applicant.');
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    try {
      await api.put(`/recruitment/recruitment/${candidateId}/stage`, { stage: 'rejected' });
      await loadApplications(selectedJobId);
      if (selectedCandidate && selectedCandidate._id === candidateId) {
        setSelectedCandidate(prev => prev ? { ...prev, applicationStage: 'rejected' } : null);
      }
    } catch (err: any) {
      console.error('Applicant rejection failed:', err);
      alert(err.response?.data?.message || 'Failed to reject applicant.');
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    try {
      const res = await api.post(`/recruitment/applications/${selectedCandidate._id}/schedule-meet`, scheduleForm);
      setScheduleMsg(`Interview scheduled successfully! Meet: ${res.data.meetUrl}`);
      setScheduleForm({ date: '', time: '', round: 'technical_interview', interviewer: '' });
      await loadApplications(selectedJobId);
      setTimeout(() => {
        setScheduleMsg('');
        setSelectedCandidate(null);
      }, 4000);
    } catch (err: any) {
      console.error('Failed to schedule interview:', err);
      alert(err.response?.data?.message || 'Failed to schedule interview.');
    }
  };

  const handleOfferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    setIsSubmittingOffer(true);
    setOfferMsg('');
    try {
      const res = await api.post(`/recruitment/applications/${selectedCandidate._id}/request-offer`, offerForm);
      setOfferMsg('Offer approval request sent to managers successfully!');
      setOfferForm({ designation: '', salaryAnnual: '', joiningDate: '' });
      await loadApplications(selectedJobId);
      setTimeout(() => setOfferMsg(''), 4000);
    } catch (err: any) {
      console.error('Failed to request offer:', err);
      alert(err.response?.data?.message || 'Failed to request offer.');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleGenerateJd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingJd(true);
    
    // Simulate AI JD Generation
    setTimeout(() => {
      setGeneratedJd(`
### JOB DESCRIPTION: ${jdTitle.toUpperCase()}
**Department:** ${jdDept || 'Engineering'}
**Location:** Bangalore, IN (Hybrid)

**Compensation (CTC):** ${jdSalary || '₹12.0L - ₹18.0L PA'}
**Target Qualification:** ${jdQualification || 'B.Tech/M.Tech in CSE or equivalent degree'}

**Position Summary:**
We are seeking an exceptionally motivated and experienced ${jdTitle} to join our core development team. You will lead the architecting, development, and scaling of premium enterprise-ready products, working with state-of-the-art tech stacks.

**Key Responsibilities:**
* Architect clean, performant React and Node.js solutions.
* Design robust PostgreSQL schemas and optimize query workflows.
* Integrate voice/conversational AI models (OpenAI/Gemini).
* Perform code reviews and guide junior developers.

**Required Experience & Skills:**
${jdSkills ? jdSkills.split(',').map(s => `* Expert skills in ${s.trim()}`).join('\n') : `* Expert skills in React, TypeScript, Next.js, and Tailwind CSS.\n* Experience with REST APIs, websockets, and Redis.\n* Strong written and verbal communication.`}
      `);
      setIsGeneratingJd(false);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020105]">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <span className="text-xs text-indigo-200/50 uppercase font-bold tracking-widest font-mono">
          Assembling Recruiter Console...
        </span>
      </div>
    );
  }

  // Group candidates by applicationStage
  const columns: Record<string, CandidateApplication[]> = KANBAN_STAGES.reduce((acc, col) => {
    acc[col.id] = applications.filter(app => app.applicationStage === col.id);
    return acc;
  }, {} as Record<string, CandidateApplication[]>);

  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Active Job Posting & Pipeline select */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl">
              <div className="space-y-1.5 w-full md:w-auto">
                <label className="text-[10px] text-indigo-300/40 uppercase font-bold tracking-wider font-mono">Select Active Job Pipeline</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full md:w-72 bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-xs text-white focus:outline-none"
                >
                  {jobs.map(j => (
                    <option key={j._id} value={j._id} className="bg-[#090514]">
                      {j.title} ({j.applicationsCount} applicants)
                    </option>
                  ))}
                  {jobs.length === 0 && (
                    <option value="">No Active Job Openings</option>
                  )}
                </select>
              </div>

              {selectedJobId && jobs.find(j => j._id === selectedJobId) && (() => {
                const currentJob = jobs.find(j => j._id === selectedJobId)!;
                return (
                  <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300/60 mt-2 md:mt-0 font-medium">
                    <div>
                      <span className="text-[9px] text-indigo-300/30 uppercase block font-mono">Location</span>
                      <span className="text-white text-xs font-semibold">{currentJob.requirements.location}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-indigo-300/30 uppercase block font-mono">Required Exp</span>
                      <span className="text-white text-xs font-semibold font-mono">{currentJob.requirements.minExperience} - {currentJob.requirements.maxExperience} Yrs</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-indigo-300/30 uppercase block font-mono">Applications</span>
                      <span className="text-white text-xs font-semibold font-mono">{currentJob.applicationsCount} total</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-indigo-300/30 uppercase block font-mono">AI Shortlisted</span>
                      <span className="text-indigo-400 font-extrabold text-xs font-mono">{currentJob.shortlistedCount} candidates</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Kanban board */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-400/80 flex items-center space-x-2">
                <Building2 className="h-4.5 w-4.5 text-indigo-500" />
                <span>Recruitment Pipeline Kanban</span>
              </h3>
              
              <div className="overflow-x-auto pb-4">
                <div className="flex space-x-4 min-w-[1400px] h-[580px]">
                  {KANBAN_STAGES.map((col) => {
                    const list = columns[col.id] || [];
                    return (
                      <div key={col.id} className="w-[300px] bg-white/[0.01] border border-white/[0.03] rounded-3xl p-4.5 flex flex-col h-full shrink-0">
                        <div className={`p-2 py-1.5 rounded-lg border mb-4 flex items-center justify-between text-[10px] font-bold font-mono tracking-wider ${col.color}`}>
                          <span>{col.label}</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-bold font-mono">{list.length}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                          {list.map((c) => (
                            <div
                              key={c._id}
                              onClick={() => setSelectedCandidate(c)}
                              className="bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-150 cursor-pointer relative group flex flex-col justify-between"
                            >
                              <div>
                                <h4 className="font-extrabold text-xs text-white leading-tight group-hover:text-indigo-400 transition-colors">
                                  {c.candidateName}
                                </h4>
                                <span className="text-[9px] text-indigo-200/30 font-mono block truncate mt-1">
                                  {c.candidateEmail}
                                </span>

                                {c.aiScreening ? (
                                  <div className="mt-3.5 p-2 bg-indigo-500/10 border border-indigo-500/10 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center space-x-1.5">
                                      <Brain className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                                      <span className="text-[8px] uppercase font-mono text-indigo-300 font-extrabold">Match Score</span>
                                    </div>
                                    <span className={`text-[10px] font-extrabold font-mono ${
                                      c.aiScreening.overallScore >= 75 ? 'text-green-400' : 'text-yellow-400'
                                    }`}>
                                      {c.aiScreening.overallScore}%
                                    </span>
                                  </div>
                                ) : (
                                  <div className="mt-3.5 py-1.5 px-2 bg-white/5 rounded-xl flex items-center space-x-1">
                                    <Loader2 className="h-3 w-3 text-indigo-400 animate-spin" />
                                    <span className="text-[8px] font-mono text-slate-400">Scanning Resume...</span>
                                  </div>
                                )}
                              </div>

                              {col.id !== 'rejected' && col.id !== 'hired' && (
                                <div className="flex items-center justify-between pt-3 border-t border-white/[0.02] mt-3.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRejectCandidate(c._id); }}
                                    className="text-[9px] font-bold text-rose-400/60 hover:text-rose-400 flex items-center space-x-0.5"
                                  >
                                    <UserX className="h-3 w-3 shrink-0" />
                                    <span>Reject</span>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAdvanceStage(c._id, c.applicationStage); }}
                                    className="text-[9px] font-bold text-green-400/60 hover:text-green-400 flex items-center space-x-0.5"
                                  >
                                    <span>Advance</span>
                                    <ArrowRight className="h-3 w-3 shrink-0" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          {list.length === 0 && (
                            <div className="py-12 text-center text-[10px] text-slate-500 font-mono">Empty Column</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 'screener': {
        // Use analyticsApps (all-applications across all jobs), filtered to AI shortlisted status
        const shortlistedCandidates = analyticsApps.filter(
          (a: any) => a.aiScreening?.status === 'shortlisted'
        );
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">AI Shortlisted Candidates</h3>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Candidates with AI status = shortlisted across all job pipelines</p>
              </div>
              <button onClick={loadAnalytics} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Loader2 className={`h-3 w-3 ${isAnalyticsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {isAnalyticsLoading ? (
              <div className="flex items-center justify-center py-10 space-x-2">
                <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-400 font-mono">Loading shortlisted candidates...</span>
              </div>
            ) : shortlistedCandidates.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Brain className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 font-mono">No AI shortlisted candidates yet.</p>
                <p className="text-[10px] text-slate-600 max-w-sm mx-auto">When candidates apply via the "Senior Lead" profile type, the AI scores them ≥70% and auto-shortlists them here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {shortlistedCandidates.map((c: any) => (
                  <div key={c._id} className="p-4 rounded-xl bg-white/[0.01] border border-indigo-500/10 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="font-bold text-sm text-white block">{c.candidateName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{c.candidateEmail}</span>
                        {c.jobPostingId?.title && (
                          <span className="text-[9px] text-indigo-300/50 font-mono block">Applied for: {c.jobPostingId.title}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1.5">
                        <span className={`text-lg font-extrabold font-mono ${
                          c.aiScreening.overallScore >= 80 ? 'text-green-400' :
                          c.aiScreening.overallScore >= 70 ? 'text-indigo-400' : 'text-yellow-400'
                        }`}>{c.aiScreening.overallScore}%</span>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-2 py-0.5 rounded-full font-mono">AI Shortlisted</span>
                      </div>
                    </div>

                    {/* Score breakdown */}
                    {c.aiScreening.scores && (
                      <div className="grid grid-cols-3 gap-2">
                        {[['Skills', c.aiScreening.scores.skillsMatch], ['Experience', c.aiScreening.scores.experienceMatch], ['Education', c.aiScreening.scores.educationMatch]].map(([label, score]: any) => (
                          <div key={label} className="text-center p-2 bg-white/[0.02] rounded-lg border border-white/[0.03]">
                            <span className="text-[8px] text-slate-500 uppercase font-mono block">{label}</span>
                            <span className="text-xs font-bold text-indigo-300 font-mono">{score}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Matched skills */}
                    {c.aiScreening.matchedSkills?.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-green-400/60 uppercase font-bold font-mono">✓ Matched Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {c.aiScreening.matchedSkills.map((s: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[8px] font-mono border border-green-500/10">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {c.aiScreening.missingSkills?.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-rose-400/60 uppercase font-bold font-mono">✗ Missing Skills</span>
                        <div className="flex flex-wrap gap-1">
                          {c.aiScreening.missingSkills.map((s: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[8px] font-mono border border-rose-500/10">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.03]">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase font-mono ${
                        c.applicationStage === 'hired' ? 'bg-emerald-500/10 text-emerald-400' :
                        c.applicationStage === 'offer' ? 'bg-teal-500/10 text-teal-400' :
                        c.applicationStage === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-indigo-500/10 text-indigo-400'
                      }`}>{c.applicationStage?.replace(/_/g, ' ')}</span>
                      <button
                        onClick={() => setSelectedCandidate(c)}
                        className="ml-auto px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold uppercase transition-all"
                      >
                        Open Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }


      case 'jobs':
        return (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Active Job Openings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div key={job._id} className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-white">{job.title}</h4>
                    <div className="space-y-1 text-xs text-slate-300">
                      <p><span>Location:</span> {job.requirements.location}</p>
                      <p><span>Experience:</span> {job.requirements.minExperience} - {job.requirements.maxExperience} Yrs</p>
                      <p><span>Applicants:</span> {job.applicationsCount} logged</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedJobId(job._id)} className="mt-5 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all">
                    Open Pipeline Board
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'candidates':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans font-semibold">Candidates Directory</h3>
            <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto pr-1">
              {applications.map((c, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-white block">{c.candidateName}</span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{c.candidateEmail}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-bold uppercase tracking-wider font-mono">
                    {c.applicationStage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'applications':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Job Applications Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.05] text-[10px] uppercase font-bold text-slate-400">
                    <th className="pb-3">Candidate</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Stage</th>
                    <th className="pb-3">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {applications.map((c, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01]">
                      <td className="py-3 font-bold">{c.candidateName}</td>
                      <td className="py-3 font-mono">{c.candidateEmail}</td>
                      <td className="py-3 font-mono uppercase">{c.applicationStage}</td>
                      <td className="py-3 font-mono font-bold">{c.aiScreening?.overallScore || 'N/A'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'interviews':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Scheduled Interviews</h3>
              <button onClick={loadInterviews} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Loader2 className={`h-3 w-3 ${isInterviewsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {isInterviewsLoading ? (
              <div className="flex items-center justify-center py-10 space-x-2">
                <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-400 font-mono">Loading interviews...</span>
              </div>
            ) : interviewApps.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Calendar className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 font-mono">No interviews scheduled yet.</p>
                <p className="text-[10px] text-slate-600">Schedule interviews from the Kanban board by clicking a candidate card.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {interviewApps.flatMap((app: any) =>
                  (app.interviewDetails || []).map((iv: any, idx: number) => (
                    <div key={`${app._id}-${idx}`} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">{app.candidateName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-bold uppercase tracking-wider font-mono">
                            {iv.round?.replace(/_/g, ' ')}
                          </span>
                          {app.jobPostingId?.title && (
                            <span className="text-[9px] text-slate-500 font-mono">for {app.jobPostingId.title}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Interviewer: <span className="text-slate-200 font-semibold">{iv.interviewer}</span> · {new Date(`${iv.date}T${iv.time}`).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        <a
                          href={iv.meetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-indigo-400 hover:text-indigo-300 font-mono underline underline-offset-2"
                        >
                          {iv.meetUrl}
                        </a>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[8px] font-bold uppercase tracking-wider font-mono shrink-0">Scheduled</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );

      case 'hires':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Offers & Hires</h3>
              <button onClick={loadOffers} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Loader2 className={`h-3 w-3 ${isOffersLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {isOffersLoading ? (
              <div className="flex items-center justify-center py-10 space-x-2">
                <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-400 font-mono">Loading offers...</span>
              </div>
            ) : offerApps.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <UserCheck className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 font-mono">No offers or hires yet.</p>
                <p className="text-[10px] text-slate-600">When a manager approves an offer request, it will appear here in real time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offerApps.map((app: any) => {
                  const offer = app.offerDetails;
                  const isHired = app.applicationStage === 'hired';
                  const statusColor =
                    isHired ? 'bg-emerald-500/10 text-emerald-400' :
                    offer?.status === 'approved' ? 'bg-teal-500/10 text-teal-400' :
                    offer?.status === 'pending_manager' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-rose-500/10 text-rose-400';
                  const statusLabel =
                    isHired ? 'Hired' :
                    offer?.status === 'approved' ? 'Offer Released' :
                    offer?.status === 'pending_manager' ? 'Pending Manager' :
                    offer?.status || app.applicationStage;

                  return (
                    <div key={app._id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{app.candidateName}</span>
                          {app.jobPostingId?.title && (
                            <span className="text-[9px] text-slate-500 font-mono">· {app.jobPostingId.title}</span>
                          )}
                        </div>
                        {offer && (
                          <>
                            <span className="text-[10px] text-slate-300 font-mono block">
                              Designation: <span className="font-semibold text-white">{offer.designation}</span>
                            </span>
                            <span className="text-[10px] text-slate-300 font-mono block">
                              CTC Offered: <span className="font-semibold text-indigo-300">₹{(offer.salaryAnnual / 100000).toFixed(2)}L PA</span>
                              {offer.joiningDate && ` · Joining: ${new Date(offer.joiningDate).toLocaleDateString('en-IN')}`}
                            </span>
                            {offer.managerNotes && (
                              <p className="text-[10px] italic text-slate-500">Manager note: "{offer.managerNotes}"</p>
                            )}
                          </>
                        )}
                        <span className="text-[9px] text-slate-600 font-mono">
                          {app.candidateEmail} · Applied: {new Date(app.appliedAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider font-mono shrink-0 self-start ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'hiring_requests':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans font-semibold">
              Hiring Requests from Managers
            </h3>
            <p className="text-xs text-slate-400">
              Review and approve hiring requests submitted by departmental managers.
            </p>
            <div className="divide-y divide-white/[0.04] space-y-4">
              {isHiringLoading ? (
                <div className="flex items-center justify-center py-10 space-x-2">
                  <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Loading requests...</span>
                </div>
              ) : hiringRequests.length > 0 ? (
                hiringRequests.map((req) => (
                  <div key={req.id} className="py-4 flex flex-col md:flex-row md:items-start justify-between gap-6 text-xs">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-sm text-white">{req.job_title}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-bold uppercase">
                          Headcount: {req.headcount}
                        </span>
                        {req.department_name && (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-bold uppercase">
                            Dept: {req.department_name}
                          </span>
                        )}
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          req.status === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                          req.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                          'bg-rose-500/15 text-rose-400'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Submitted by: <span className="text-slate-300 font-bold">{req.manager_name}</span> (Manager ID: {req.manager_id})
                      </p>
                      {req.description && (
                        <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl text-slate-300">
                          <p className="text-xs leading-relaxed font-sans">{req.description}</p>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 block font-mono">
                        Date: {new Date(req.created_at).toLocaleString()}
                      </span>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex sm:flex-row md:flex-col gap-2.5 shrink-0 self-center">
                        <button
                          onClick={() => handleHiringRequestAction(req.id, 'rejected')}
                          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/15 text-rose-400 text-[10px] font-bold uppercase transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleHiringRequestAction(req.id, 'approved')}
                          className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs font-mono">
                  No hiring requests pending review.
                </div>
              )}
            </div>
          </div>
        );

      case 'voicescreen':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-5 animate-fade-in">
            <div className="flex items-center space-x-2">
              <PhoneCall className="h-5 w-5 text-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">AI Voice Screening Logs</h3>
            </div>
            <p className="text-xs text-slate-400">Verifies candidate conversational logs and telephone-based AI scores.</p>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white block">Priya Sharma — React Architect</span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Vocabulary Match: 88% · Sentence construction: High</span>
                </div>
                <span className="text-emerald-400 font-bold font-mono">Passed (85%)</span>
              </div>
            </div>
          </div>
        );

      case 'chatscreen':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-5 animate-fade-in">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">AI Chat Screening Metrics</h3>
            </div>
            <p className="text-xs text-slate-400">Check automated text interview summaries generated by Claude AI screen agents.</p>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white block">Rajesh Kumar — Node Developer</span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">SQL optimization answers correct. Express routing questions passed.</span>
                </div>
                <span className="text-emerald-400 font-bold font-mono">Shortlisted</span>
              </div>
            </div>
          </div>
        );

      case 'jdgen':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans font-semibold">AI JD Generator (NexAI JD-Agent)</h3>
            </div>
            
            <form onSubmit={handleGenerateJd} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Target Position Title</label>
                  <input
                    type="text"
                    required
                    value={jdTitle}
                    onChange={(e) => setJdTitle(e.target.value)}
                    placeholder="e.g. Lead React Architect"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Department</label>
                  <input
                    type="text"
                    value={jdDept}
                    onChange={(e) => setJdDept(e.target.value)}
                    placeholder="e.g. Engineering"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Skills Required</label>
                  <input
                    type="text"
                    value={jdSkills}
                    onChange={(e) => setJdSkills(e.target.value)}
                    placeholder="e.g. React, Node.js, AWS"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Salary</label>
                  <input
                    type="text"
                    value={jdSalary}
                    onChange={(e) => setJdSalary(e.target.value)}
                    placeholder="e.g. ₹15.0L - ₹20.0L PA"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Qualification</label>
                  <input
                    type="text"
                    value={jdQualification}
                    onChange={(e) => setJdQualification(e.target.value)}
                    placeholder="e.g. B.Tech / MCA"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>
              </div>
              
              <button type="submit" disabled={isGeneratingJd || !jdTitle} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center space-x-1.5">
                {isGeneratingJd ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 fill-current text-indigo-200" />
                    <span>Generate AI Job Description</span>
                  </>
                )}
              </button>
            </form>

            {generatedJd && (
              <div className="p-4 rounded-xl bg-[#020105]/50 border border-white/[0.04] text-xs leading-relaxed font-mono whitespace-pre-wrap text-slate-300">
                {generatedJd}
              </div>
            )}
          </div>
        );

      case 'analytics': {
        // Compute metrics from real data
        const total = analyticsApps.length;

        // ✅ FIX: Only count candidates where AI explicitly set status = 'shortlisted'
        // (not anyone who has been manually advanced through pipeline stages)
        const shortlisted = analyticsApps.filter((a: any) => a.aiScreening?.status === 'shortlisted').length;

        const interviewed = analyticsApps.filter((a: any) => (a.interviewDetails?.length || 0) > 0).length;

        // Offers raised = any offer record that was formally created (pending or approved)
        const offered = analyticsApps.filter((a: any) =>
          a.offerDetails?.status && a.offerDetails.status !== 'none'
        ).length;

        const hired = analyticsApps.filter((a: any) => a.applicationStage === 'hired').length;
        const rejected = analyticsApps.filter((a: any) => a.applicationStage === 'rejected').length;
        const avgScore = total > 0
          ? Math.round(analyticsApps.reduce((sum: number, a: any) => sum + (a.aiScreening?.overallScore || 0), 0) / total)
          : 0;

        // ✅ FIX: Cap at 100%, and use the larger of offered/hired as denominator
        // so manually-advanced hires (without formal offer) don't give >100%
        const conversionRate = (num: number, den: number) => {
          if (den <= 0) return 'N/A';
          const pct = Math.min(100, Math.round((num / den) * 100));
          return `${pct}%`;
        };

        // For offer acceptance: denominator = max(offered, hired) to prevent >100%
        const offerDenominator = Math.max(offered, hired);

        const statCards = [
          { label: 'Total Applications', value: total, color: 'text-white', desc: 'Across all job postings' },
          { label: 'AI Shortlisted', value: shortlisted, color: 'text-indigo-400', desc: total > 0 ? `${conversionRate(shortlisted, total)} of applicants` : 'No applications yet' },
          { label: 'Interviews Scheduled', value: interviewed, color: 'text-blue-400', desc: shortlisted > 0 ? `${conversionRate(interviewed, shortlisted)} of shortlisted` : '–' },
          { label: 'Offers Raised', value: offered, color: 'text-teal-400', desc: interviewed > 0 ? `${conversionRate(offered, interviewed)} of interviewed` : '–' },
          { label: 'Total Hired', value: hired, color: 'text-emerald-400', desc: offerDenominator > 0 ? `${conversionRate(hired, offerDenominator)} offer acceptance` : '–' },
          { label: 'Rejected', value: rejected, color: 'text-rose-400', desc: total > 0 ? `${conversionRate(rejected, total)} rejection rate` : '–' },
          { label: 'Avg AI Match Score', value: `${avgScore}%`, color: 'text-purple-400', desc: 'Average candidate fit score' },
        ];

        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Hiring & TA Analytics</h3>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Real-time metrics computed from all candidate data</p>
              </div>
              <button onClick={loadAnalytics} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Loader2 className={`h-3 w-3 ${isAnalyticsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {isAnalyticsLoading ? (
              <div className="flex items-center justify-center py-10 space-x-2">
                <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-400 font-mono">Computing analytics...</span>
              </div>
            ) : total === 0 ? (
              <div className="text-center py-12 space-y-2">
                <BarChart className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 font-mono">No application data yet.</p>
                <p className="text-[10px] text-slate-600">Analytics will populate as candidates apply to your job postings.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {statCards.map((card, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 font-mono block">{card.label}</span>
                      <span className={`text-2xl font-extrabold font-mono ${card.color}`}>{card.value}</span>
                      <span className="text-[9px] text-slate-600 block">{card.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Stage funnel bar */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">Pipeline Funnel</span>
                  {[
                    { label: 'Applications', count: total, color: 'bg-slate-600' },
                    { label: 'Shortlisted', count: shortlisted, color: 'bg-indigo-600' },
                    { label: 'Interviewed', count: interviewed, color: 'bg-blue-600' },
                    { label: 'Offered', count: offered, color: 'bg-teal-600' },
                    { label: 'Hired', count: hired, color: 'bg-emerald-600' },
                  ].map((stage, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="w-24 text-[9px] text-slate-400 font-mono shrink-0">{stage.label}</span>
                      <div className="flex-1 bg-white/[0.03] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${stage.color} transition-all duration-700`}
                          style={{ width: total > 0 ? `${Math.round((stage.count / total) * 100)}%` : '0%' }}
                        />
                      </div>
                      <span className="text-[9px] font-bold font-mono text-slate-400 w-8 text-right">{stage.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      }

      case 'talentpool':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">General Talent Pool Databank</h3>
            <div className="divide-y divide-white/[0.04]">
              <div className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white block">Rahul Saxena</span>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Skills: React, Next.js, Webpack · Exp: 6 Yrs</span>
                </div>
                <button className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold">Review CV</button>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6.5 shadow-xl space-y-4 animate-fade-in text-xs max-w-sm mx-auto">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Settings & Configurations</h3>
            <div className="space-y-3 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-indigo-500" />
                <span>Notify me when candidates apply public route</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-indigo-500" />
                <span>Auto-run AI screenings on PDF upload submissions</span>
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">Recruiter Board</h1>
          <p className="text-indigo-200/40 text-xs mt-1.5 font-mono">
            ATS & Candidate AI Screening Pipeline
          </p>
        </div>
        
        {currentTab === 'dashboard' || currentTab === 'jobs' ? (
          <button
            onClick={() => { setShowJobModal(true); setJobMsg({ type: '', text: '' }); }}
            className="px-4.5 py-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-semibold shadow-lg hover:shadow-[0_4px_20px_rgba(99,102,241,0.3)] transition-all flex items-center space-x-1.5 self-start"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Post New Job</span>
          </button>
        ) : null}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 px-5 py-4 rounded-2xl text-xs flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dynamic Tab view rendering */}
      {renderTabContent()}

      {/* Candidate Details Drawer Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-4 text-white">
          <div className="bg-[#090514] border-l border-white/[0.08] h-full w-full max-w-lg p-8 shadow-2xl relative overflow-y-auto flex flex-col justify-between animate-slide-in">
            <div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-5 right-5 p-1.5 text-indigo-200/20 hover:text-white rounded-lg transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="mb-6">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/15 text-[9px] font-bold uppercase tracking-wider">
                  Stage: {selectedCandidate.applicationStage.replace('_', ' ')}
                </span>
                <h3 className="text-xl font-extrabold text-white mt-3">{selectedCandidate.candidateName}</h3>
                <p className="text-xs text-indigo-200/40 font-mono mt-1">
                  Email: {selectedCandidate.candidateEmail} {selectedCandidate.candidatePhone && `· Phone: ${selectedCandidate.candidatePhone}`}
                </p>
              </div>

              <div className="mb-6 flex flex-wrap gap-3">
                <a
                  href={selectedCandidate.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-bold text-indigo-300 hover:text-white transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span>Download CV / Resume</span>
                </a>
              </div>

              {selectedCandidate.aiScreening ? (
                <div className="space-y-6">
                  <div className="bg-white/[0.02] border border-indigo-500/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-extrabold text-white uppercase tracking-wider font-sans">
                      <Brain className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                      <span>AI Resume Match Report</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                        <span className="text-[9px] text-indigo-200/30 uppercase block font-mono">Skills Match</span>
                        <span className="text-sm font-bold text-indigo-400 font-mono">
                          {selectedCandidate.aiScreening.scores?.skillsMatch || selectedCandidate.aiScreening.overallScore}%
                        </span>
                      </div>
                      <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                        <span className="text-[9px] text-indigo-200/30 uppercase block font-mono">Exp Match</span>
                        <span className="text-sm font-bold text-indigo-400 font-mono">
                          {selectedCandidate.aiScreening.scores?.experienceMatch || selectedCandidate.aiScreening.overallScore}%
                        </span>
                      </div>
                      <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                        <span className="text-[9px] text-indigo-200/30 uppercase block font-mono">Edu Match</span>
                        <span className="text-sm font-bold text-indigo-400 font-mono">
                          {selectedCandidate.aiScreening.scores?.educationMatch || selectedCandidate.aiScreening.overallScore}%
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-2 leading-relaxed">
                      <span className="text-[10px] text-indigo-200/30 uppercase font-bold block font-mono">AI Analysis Summary</span>
                      <p className="text-indigo-200/70 font-medium">
                        {selectedCandidate.aiScreening.aiSummary}
                      </p>
                    </div>

                    {selectedCandidate.aiScreening.matchedSkills && selectedCandidate.aiScreening.matchedSkills.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-green-400/50 uppercase font-bold block font-mono">Matched Skills</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCandidate.aiScreening.matchedSkills.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 font-mono text-[9px] border border-green-500/10">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedCandidate.aiScreening.missingSkills && selectedCandidate.aiScreening.missingSkills.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-red-400/50 uppercase font-bold block font-mono">Missing Skills Gaps</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCandidate.aiScreening.missingSkills.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 font-mono text-[9px] border border-red-500/10">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-white/[0.01] border border-white/[0.03] rounded-2xl flex items-center space-x-2 text-xs text-indigo-200/40">
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-indigo-500" />
                  <span>Resume scan is currently running in background. Refresh board shortly.</span>
                </div>
              )}

              {/* Schedule interview section */}
              {selectedCandidate.applicationStage !== 'hired' && selectedCandidate.applicationStage !== 'rejected' && (
                <form onSubmit={handleScheduleInterview} className="mt-6 p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] space-y-4 text-xs font-semibold">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Schedule Candidate Interview</span>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      required
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white font-mono focus:outline-none"
                    />
                    <input
                      type="time"
                      required
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Interviewer Name (e.g. Rajiv Singh)"
                    value={scheduleForm.interviewer}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, interviewer: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none"
                  />
                  {scheduleMsg && <div className="p-3 rounded-xl bg-green-500/15 text-green-400 border border-green-500/20">{scheduleMsg}</div>}
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider text-[10px]">
                    Schedule Interview
                  </button>
                </form>
              )}

              {/* Offer Letter Request Section */}
              {selectedCandidate.applicationStage !== 'hired' && selectedCandidate.applicationStage !== 'rejected' && (
                <div className="mt-6 p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] space-y-4 text-xs font-semibold">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Request Manager Offer Approval</span>
                  
                  {selectedCandidate.offerDetails && selectedCandidate.offerDetails.status !== 'none' ? (
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/15">
                        <span className="text-[9px] uppercase font-bold text-indigo-400 font-mono block">Current Offer Status</span>
                        <p className="text-white mt-1">Designation: <span className="font-bold">{selectedCandidate.offerDetails.designation}</span></p>
                        <p className="text-white">CTC: <span className="font-bold">₹{(selectedCandidate.offerDetails.salaryAnnual/100000).toFixed(2)}L PA</span></p>
                        <div className="flex items-center space-x-1.5 mt-2.5">
                          <span className={`w-2 h-2 rounded-full ${
                            selectedCandidate.offerDetails.status === 'pending_manager' ? 'bg-amber-400 animate-pulse' :
                            selectedCandidate.offerDetails.status === 'approved' ? 'bg-green-400' : 'bg-rose-400'
                          }`} />
                          <span className="text-[10px] font-bold uppercase text-slate-200">
                            {selectedCandidate.offerDetails.status.replace('_', ' ')}
                          </span>
                        </div>
                        {selectedCandidate.offerDetails.managerNotes && (
                          <p className="text-[10px] italic text-slate-400 mt-2">Manager notes: "{selectedCandidate.offerDetails.managerNotes}"</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleOfferRequest} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Offered Designation</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Senior Software Engineer"
                          value={offerForm.designation}
                          onChange={(e) => setOfferForm({ ...offerForm, designation: e.target.value })}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Salary Annual (INR)</label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 1200000"
                            value={offerForm.salaryAnnual}
                            onChange={(e) => setOfferForm({ ...offerForm, salaryAnnual: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-indigo-200/40 uppercase block font-mono">Joining Date</label>
                          <input
                            type="date"
                            required
                            value={offerForm.joiningDate}
                            onChange={(e) => setOfferForm({ ...offerForm, joiningDate: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      {offerMsg && <div className="p-3 rounded-xl bg-green-500/15 text-green-400 border border-green-500/20">{offerMsg}</div>}
                      
                      <button
                        type="submit"
                        disabled={isSubmittingOffer}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider text-[10px] disabled:opacity-50"
                      >
                        {isSubmittingOffer ? 'Sending Request...' : 'Send Offer Request to Manager'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 pt-6 border-t border-white/[0.05] mt-6">
              {selectedCandidate.applicationStage !== 'rejected' && (
                <button
                  onClick={() => handleRejectCandidate(selectedCandidate._id)}
                  className="flex-1 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold hover:bg-red-500/15 transition-all"
                >
                  Reject Candidate
                </button>
              )}
              {selectedCandidate.applicationStage !== 'hired' && selectedCandidate.applicationStage !== 'rejected' && (
                <button
                  onClick={() => handleAdvanceStage(selectedCandidate._id, selectedCandidate.applicationStage)}
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md animate-pulse"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Advance Stage</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Job Modal Form */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-white">
          <div className="bg-[#090514] border border-white/[0.08] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-slide-in">
            <button
              onClick={() => setShowJobModal(false)}
              className="absolute top-5 right-5 p-1 text-indigo-200/20 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-bold uppercase tracking-wider mb-5 flex items-center space-x-2">
              <Briefcase className="h-4.5 w-4.5 text-indigo-500" />
              <span>Create Active Job Posting</span>
            </h3>

            <form onSubmit={handleJobSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase font-bold block font-mono">Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead React Architect"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase font-bold block font-mono">Department</label>
                  <select
                    required
                    value={jobForm.departmentId}
                    onChange={(e) => setJobForm({ ...jobForm, departmentId: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                  >
                    <option value="" className="bg-[#090514]">Select Department</option>
                    {departments.map((dept: any) => (
                      <option key={dept._id} value={dept._id} className="bg-[#090514]">
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase font-bold block font-mono">Job Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bangalore, IN (Hybrid)"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase font-bold block font-mono">Education Requirements</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech / M.Tech"
                  value={jobForm.education}
                  onChange={(e) => setJobForm({ ...jobForm, education: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase font-bold block font-mono">Min Experience (Yrs)</label>
                  <input
                    type="number"
                    required
                    value={jobForm.minExperience}
                    onChange={(e) => setJobForm({ ...jobForm, minExperience: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase font-bold block font-mono">Max Experience (Yrs)</label>
                  <input
                    type="number"
                    required
                    value={jobForm.maxExperience}
                    onChange={(e) => setJobForm({ ...jobForm, maxExperience: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase font-bold block font-mono">Salary Min (INR / Yr)</label>
                  <input
                    type="number"
                    placeholder="e.g. 800000"
                    value={jobForm.salaryMin}
                    onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase font-bold block font-mono">Salary Max (INR / Yr)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500000"
                    value={jobForm.salaryMax}
                    onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase font-bold block font-mono">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  required
                  placeholder="React, TypeScript, Next.js"
                  value={jobForm.requiredSkills}
                  onChange={(e) => setJobForm({ ...jobForm, requiredSkills: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase font-bold block font-mono">Job Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe role responsibilities..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none resize-none"
                />
              </div>

              {jobMsg.text && (
                <div className={`p-3.5 rounded-xl text-[11px] flex items-center space-x-2 ${
                  jobMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}>
                  {jobMsg.type === 'success' ? <CheckCircle className="h-4.5 w-4.5 text-green-400 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />}
                  <span>{jobMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingJob}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold font-mono uppercase tracking-wider text-[11px]"
              >
                {isSubmittingJob ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  <span>Publish Job Listing</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecruiterDashboard() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#020105]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <RecruiterDashboardContent />
    </Suspense>
  );
}
