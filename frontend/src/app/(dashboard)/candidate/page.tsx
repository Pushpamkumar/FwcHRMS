'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Briefcase,
  FileText,
  Brain,
  Bell,
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  User,
  Settings,
  ShieldCheck,
  Send,
  X
} from 'lucide-react';

interface JobPosting {
  _id: string;
  title: string;
  description: string;
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
    currency: string;
  };
  status: string;
}

interface CandidateApplication {
  _id: string;
  jobPostingId: {
    _id: string;
    title: string;
  };
  candidateName: string;
  candidateEmail: string;
  resumeUrl: string;
  applicationStage: 'screening' | 'shortlisted' | 'phone_screen' | 'technical_interview' | 'hr_interview' | 'offer' | 'hired' | 'rejected';
  appliedAt: string;
  aiScreening?: {
    overallScore: number;
    scores?: {
      skillsMatch: number;
      experienceMatch: number;
      educationMatch: number;
      keywordsMatch: number;
    };
    matchedSkills?: string[];
    missingSkills?: string[];
    aiSummary?: string;
  };
  offerDetails?: {
    designation: string;
    salaryAnnual: number;
    joiningDate: string;
    status: 'pending_manager' | 'approved' | 'rejected' | 'none';
    managerNotes?: string;
  };
}

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: {
    meetUrl?: string;
    date?: string;
    time?: string;
    interviewer?: string;
    round?: string;
    applicationId?: string;
  };
}

const STAGES_STEPPER = [
  { id: 'screening', label: 'Screen' },
  { id: 'shortlisted', label: 'Shortlist' },
  { id: 'interview', label: 'Interviews' },
  { id: 'offer', label: 'Offer' },
  { id: 'hired', label: 'Hired' }
];

function getStageStep(stage: string): number {
  if (['phone_screen', 'technical_interview', 'hr_interview'].includes(stage)) {
    return 2; // Interview stage
  }
  switch (stage) {
    case 'screening': return 0;
    case 'shortlisted': return 1;
    case 'offer': return 3;
    case 'hired': return 4;
    default: return 0;
  }
}

function CandidateDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'explore';
  const { user } = useAuthStore();

  // Data states
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Apply Modal state
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [applyForm, setApplyForm] = useState({ resumeUrl: '', coverLetter: '' });
  const [isApplying, setIsApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState({ type: '', text: '' });

  // AI Resume Analyzer state
  const [resumeText, setResumeText] = useState('');
  const [targetJobTitle, setTargetJobTitle] = useState('');
  const [targetSkills, setTargetSkills] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analyzerError, setAnalyzerError] = useState('');

  // View Offer state
  const [selectedOfferApp, setSelectedOfferApp] = useState<CandidateApplication | null>(null);
  const [isProcessingOffer, setIsProcessingOffer] = useState(false);

  const loadData = async () => {
    try {
      setError('');
      setIsLoading(true);
      
      const [jobsRes, appsRes, notifsRes] = await Promise.all([
        api.get('/recruitment/jobs'),
        api.get('/recruitment/my-applications'),
        api.get('/recruitment/notifications')
      ]);

      setJobs(jobsRes.data || []);
      setApplications(appsRes.data || []);
      setNotifications(notifsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load candidate dashboard data:', err);
      setError('Could not connect to service. Ensure Node API backend is online.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setIsApplying(true);
    setApplyMsg({ type: '', text: '' });

    try {
      const payload = {
        candidateName: `${user?.firstName} ${user?.lastName}`,
        candidateEmail: user?.email,
        candidatePhone: user?.employmentDetails?.noticePeriod ? '+91' : undefined, // optional mock or retrieve from profile
        resumeUrl: applyForm.resumeUrl,
        coverLetter: applyForm.coverLetter
      };

      await api.post(`/recruitment/jobs/${selectedJob._id}/apply`, payload);
      setApplyMsg({ type: 'success', text: 'Application submitted successfully! AI Screening triggered.' });
      setApplyForm({ resumeUrl: '', coverLetter: '' });
      setTimeout(() => {
        setSelectedJob(null);
        loadData();
      }, 2000);
    } catch (err: any) {
      console.error('Application submission failed:', err);
      setApplyMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to submit application.'
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleAiAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalyzerError('');

    try {
      const res = await api.post('/recruitment/ai-analyze', {
        resumeText,
        targetJobTitle,
        targetSkills
      });
      setAnalysisResult(res.data.analysis);
    } catch (err: any) {
      console.error('AI resume analysis failed:', err);
      const errMsg = err.response?.data?.message || 'AI Analysis failed. Please check the backend is running and try again.';
      setAnalyzerError(errMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNotificationRead = async (id: string) => {
    try {
      await api.put(`/recruitment/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleOfferAction = async (appId: string, action: 'accept' | 'decline') => {
    setIsProcessingOffer(true);
    try {
      await api.post(`/recruitment/applications/${appId}/offer-action`, { action });
      alert(`You have successfully ${action}ed the offer!`);
      setSelectedOfferApp(null);
      loadData();
    } catch (err: any) {
      console.error('Offer action failed:', err);
      alert(err.response?.data?.message || 'Failed to process offer action.');
    } finally {
      setIsProcessingOffer(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020105]">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <span className="text-xs text-indigo-200/50 uppercase font-bold tracking-widest font-mono">
          Loading Candidate Console...
        </span>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'explore':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Open Positions</h2>
              <span className="text-[10px] text-indigo-300 font-bold font-mono uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                {jobs.length} Positions Available
              </span>
            </div>

            {/* Compute set of job IDs already applied to */}
            {(() => {
              const appliedJobIds = new Set(
                applications.map((a) =>
                  typeof a.jobPostingId === 'object' && a.jobPostingId !== null
                    ? a.jobPostingId._id
                    : String(a.jobPostingId)
                )
              );

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {jobs.map((job) => {
                    const alreadyApplied = appliedJobIds.has(job._id);
                    return (
                      <div key={job._id} className={`bg-white/[0.01] border rounded-3xl p-6 shadow-xl transition-all duration-200 flex flex-col justify-between ${alreadyApplied ? 'border-green-500/20' : 'border-white/[0.05] hover:border-indigo-500/30'}`}>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 block font-mono">
                                {job.departmentId?.name || 'Technical'} Division
                              </span>
                              {alreadyApplied && (
                                <span className="text-[9px] font-extrabold uppercase tracking-widest text-green-400 font-mono bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                                  ✓ Applied
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-black text-white mt-1 leading-snug">{job.title}</h3>
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                            {job.description}
                          </p>

                          <div className="flex flex-wrap gap-4 text-[10px] text-slate-300 font-semibold font-mono">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              <span>{job.requirements.location}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Briefcase className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              <span>{job.requirements.minExperience}-{job.requirements.maxExperience} Yrs Exp</span>
                            </div>
                            {job.salaryRange && (
                              <div className="flex items-center space-x-0.5">
                                <DollarSign className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                <span>₹{(job.salaryRange.min/100000).toFixed(1)}L - ₹{(job.salaryRange.max/100000).toFixed(1)}L PA</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono block">Required Tech Stack:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {job.requirements.requiredSkills.map((s, idx) => (
                                <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/5 font-mono text-[9px] text-indigo-200">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {alreadyApplied ? (
                          <button
                            disabled
                            className="mt-6 w-full py-3 rounded-2xl bg-green-700/30 border border-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-not-allowed opacity-80"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Application Submitted</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => { setSelectedJob(job); setApplyMsg({ type: '', text: '' }); }}
                            className="mt-6 w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/10"
                          >
                            <span>Apply for Role</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {jobs.length === 0 && (
                    <div className="col-span-2 text-center py-16 bg-white/[0.01] border border-white/[0.03] rounded-3xl text-slate-500 font-mono text-xs">
                      No active job listings found. Check back later!
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );

      case 'applications':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-sm font-bold tracking-wider uppercase text-white font-sans">My Active Applications</h2>

            <div className="space-y-6">
              {applications.map((app) => {
                const stageStep = getStageStep(app.applicationStage);
                const isRejected = app.applicationStage === 'rejected';
                
                // Check if there are scheduled interview notes in notifications
                const activeInterview = notifications.find(n => 
                  !n.read && 
                  n.type === 'interview_scheduled' && 
                  n.data?.meetUrl
                );

                return (
                  <div key={app._id} className="bg-white/[0.01] border border-white/[0.05] rounded-3xl p-6.5 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 block font-mono">
                          ID: {app._id.substring(18).toUpperCase()}
                        </span>
                        <h3 className="text-base font-black text-white mt-1">
                          {typeof app.jobPostingId === 'object' && app.jobPostingId !== null ? app.jobPostingId.title : 'Software Engineer'}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex flex-wrap gap-2.5 items-center">
                        {app.aiScreening && (
                          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/15">
                            <Brain className="h-4 w-4 text-indigo-400" />
                            <span className="text-[10px] font-extrabold font-mono text-indigo-300">Match score: {app.aiScreening.overallScore}%</span>
                          </div>
                        )}
                        <span className={`px-3 py-1.5 rounded-xl border text-[9px] font-extrabold uppercase font-mono tracking-wider ${
                          isRejected ? 'border-red-500/20 bg-red-500/5 text-red-400' :
                          app.applicationStage === 'hired' ? 'border-green-500/20 bg-green-500/5 text-green-400' :
                          'border-indigo-500/25 bg-indigo-500/5 text-indigo-400'
                        }`}>
                          {app.applicationStage.replace('_', ' ')}
                        </span>

                        {app.offerDetails && app.offerDetails.status === 'approved' && app.applicationStage !== 'hired' && (
                          <button
                            onClick={() => setSelectedOfferApp(app)}
                            className="px-3.5 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-[10px] font-extrabold uppercase animate-pulse shadow-lg"
                          >
                            View Offer Letter
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stepper progress indicator */}
                    {!isRejected && (
                      <div className="pt-4 pb-2 px-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 font-mono mb-2">
                          <span>Application Progress</span>
                          <span className="text-white uppercase">{STAGES_STEPPER[stageStep].label}</span>
                        </div>
                        <div className="relative flex items-center justify-between w-full">
                          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/5 rounded-full -z-10" />
                          <div 
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-500 rounded-full -z-10 transition-all duration-300" 
                            style={{ width: `${(stageStep / (STAGES_STEPPER.length - 1)) * 100}%` }}
                          />
                          {STAGES_STEPPER.map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                                idx <= stageStep 
                                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20' 
                                  : 'bg-[#090514] text-slate-600 border border-white/5'
                              }`}>
                                {idx <= stageStep ? '✓' : idx + 1}
                              </div>
                              <span className="text-[8px] font-bold tracking-wider uppercase font-mono mt-1.5 text-slate-500">{step.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active interview notice */}
                    {activeInterview && (
                      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-indigo-400 font-mono block">Upcoming Interview Invite</span>
                          <p className="text-xs font-semibold text-white mt-0.5">
                            {activeInterview.data?.round?.replace('_', ' ').toUpperCase()} on {activeInterview.data?.date} at {activeInterview.data?.time}
                          </p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Interviewer: {activeInterview.data?.interviewer}</span>
                        </div>
                        <a
                          href={activeInterview.data?.meetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleNotificationRead(activeInterview._id)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
                        >
                          <span>Join Google Meet</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}

              {applications.length === 0 && (
                <div className="text-center py-16 bg-white/[0.01] border border-white/[0.03] rounded-3xl text-slate-500 font-mono text-xs">
                  You have not applied for any roles yet. Visit the Explore Jobs tab!
                </div>
              )}
            </div>
          </div>
        );

      case 'analyzer':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* Form */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-3xl p-6.5 shadow-xl space-y-5">
              <div>
                <h3 className="text-sm font-bold tracking-wider uppercase text-white font-sans">AI Resume Screener & Analyzer</h3>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-relaxed">
                  Screen your resume instantly against your target job profile. Our Claude AI models parse requirements, identify skill gaps, and grade compatibility.
                </p>
              </div>

              <form onSubmit={handleAiAnalysis} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Target Job Position Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Frontend Engineer"
                    value={targetJobTitle}
                    onChange={(e) => setTargetJobTitle(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Required Core Skills (Comma separated)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. React, TypeScript, Next.js, Redux"
                    value={targetSkills}
                    onChange={(e) => setTargetSkills(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Paste Resume Text / CV Details</label>
                  <textarea
                    rows={8}
                    required
                    placeholder="Paste resume text, experience details, and certifications..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none resize-none font-mono text-[11px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAnalyzing || !resumeText}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold font-mono uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/10"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Running AI Diagnostic...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4.5 w-4.5 fill-current text-indigo-200" />
                      <span>Analyze Compatibility Score</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Results */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-3xl p-6.5 shadow-xl min-h-[400px] flex flex-col justify-center relative overflow-hidden">
              {isAnalyzing && (
                <div className="absolute inset-0 bg-[#090514]/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                  <span className="text-[10px] text-indigo-200/50 uppercase tracking-widest font-mono font-bold animate-pulse">Processing Skills Fit...</span>
                </div>
              )}

              {analyzerError && !isAnalyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10">
                  <div className="w-full max-w-sm bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 text-center space-y-3">
                    <XCircle className="h-8 w-8 text-rose-400 mx-auto" />
                    <p className="text-xs text-rose-200 font-semibold">{analyzerError}</p>
                    <button
                      onClick={() => setAnalyzerError('')}
                      className="text-[10px] text-rose-400 hover:text-rose-300 underline font-mono"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {analysisResult ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center space-x-2.5 border-b border-white/[0.05] pb-4">
                    <Brain className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">AI Diagnostic Report</h3>
                  </div>

                  {/* Main score ring */}
                  <div className="flex items-center space-x-6">
                    <div className="relative w-24 h-24 flex items-center justify-center bg-indigo-600/10 border border-indigo-500/20 rounded-full shadow-inner shadow-indigo-500/10">
                      <div className="text-center">
                        <span className="text-3xl font-black font-mono text-white block">{analysisResult.overallScore}%</span>
                        <span className="text-[8px] text-indigo-300/60 uppercase font-bold tracking-wider block mt-0.5">Match Score</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase font-mono tracking-wider ${
                        analysisResult.overallScore >= 75 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        AI Verdict: {analysisResult.status}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono">Model Engine: {analysisResult.aiModel || 'Claude 3.5'}</p>
                    </div>
                  </div>

                  {/* Criteria breakdown */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-2xl">
                      <span className="text-[8px] text-indigo-200/40 uppercase font-bold font-mono">Skills Match</span>
                      <span className="text-sm font-black font-mono text-white block mt-0.5">{analysisResult.scores.skillsMatch}%</span>
                    </div>
                    <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-2xl">
                      <span className="text-[8px] text-indigo-200/40 uppercase font-bold font-mono">Experience Match</span>
                      <span className="text-sm font-black font-mono text-white block mt-0.5">{analysisResult.scores.experienceMatch}%</span>
                    </div>
                    <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-2xl">
                      <span className="text-[8px] text-indigo-200/40 uppercase font-bold font-mono">Education Match</span>
                      <span className="text-sm font-black font-mono text-white block mt-0.5">{analysisResult.scores.educationMatch}%</span>
                    </div>
                    <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-2xl">
                      <span className="text-[8px] text-indigo-200/40 uppercase font-bold font-mono">Keyword Match</span>
                      <span className="text-sm font-black font-mono text-white block mt-0.5">{analysisResult.scores.keywordsMatch}%</span>
                    </div>
                  </div>

                  {/* Skills lists */}
                  <div className="space-y-4 border-t border-white/[0.04] pt-4">
                    {analysisResult.matchedSkills && analysisResult.matchedSkills.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-green-400/60 tracking-wider font-mono block">Matched Skills (Strength)</span>
                        <div className="flex flex-wrap gap-1">
                          {analysisResult.matchedSkills.map((s: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/10 font-mono text-[9px] text-green-400">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysisResult.missingSkills && analysisResult.missingSkills.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-rose-400/60 tracking-wider font-mono block">Missing Skill Gaps</span>
                        <div className="flex flex-wrap gap-1">
                          {analysisResult.missingSkills.map((s: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/10 font-mono text-[9px] text-rose-400">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="space-y-1.5 border-t border-white/[0.04] pt-4">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono block">AI Analysis Summary</span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{analysisResult.aiSummary}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 space-y-4">
                  <Brain className="h-10 w-10 text-indigo-500/30 mx-auto" />
                  <div>
                    <h4 className="font-extrabold text-xs text-white">Diagnostics Console Ready</h4>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Submit your resume details on the left side to get a complete analytical breakdown.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-3xl p-6.5 shadow-xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wider uppercase text-white font-sans">Notifications Center</h2>
              <span className="text-[10px] font-bold font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                {notifications.filter(n => !n.read).length} Unread
              </span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => !notif.read && handleNotificationRead(notif._id)}
                  className={`py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors cursor-pointer ${
                    !notif.read ? 'bg-indigo-500/[0.02] -mx-4 px-4 rounded-xl' : ''
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${!notif.read ? 'bg-indigo-400' : 'bg-transparent'}`} />
                      <span className="font-bold text-xs text-white">{notif.title}</span>
                      <span className="text-[8px] font-mono text-slate-500">{new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-3.5">
                      {notif.message}
                    </p>
                    {notif.data?.meetUrl && (
                      <div className="mt-2.5 pl-3.5">
                        <a
                          href={notif.data.meetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold font-mono"
                        >
                          <span>Join Meeting Room ({notif.data.round?.replace('_', ' ')})</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  {!notif.read && (
                    <button className="text-[9px] font-bold uppercase text-indigo-400/60 hover:text-indigo-400 shrink-0 self-start sm:self-auto">
                      Mark read
                    </button>
                  )}
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="text-center py-12 text-slate-500 font-mono text-xs">
                  No notifications yet.
                </div>
              )}
            </div>
          </div>
        );

      default:
        return <div>Invalid tab view selected.</div>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-white pb-12">
      {/* Greeting Banner */}
      <div className="border-b border-white/[0.04] pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">Applicant Center</h1>
          <p className="text-indigo-200/40 text-xs mt-1.5 font-mono">
            Candidate Job Portal & AI Resume Diagnostics
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 px-5 py-4 rounded-2xl text-xs flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {renderTabContent()}

      {/* Apply to Job Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-white">
          <div className="bg-[#090514] border border-white/[0.08] rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-slide-in">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-5 right-5 p-1 text-indigo-200/20 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Briefcase className="h-4.5 w-4.5 text-indigo-500" />
              <span>Job Application</span>
            </h3>
            <p className="text-[10px] text-indigo-200/40 mb-5">
              Submit details for position: <span className="text-white font-bold">{selectedJob.title}</span>
            </p>

            <form onSubmit={handleApplySubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Resume / CV Link (URL)</label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://dropbox.com/my-resume.pdf"
                  value={applyForm.resumeUrl}
                  onChange={(e) => setApplyForm({ ...applyForm, resumeUrl: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-indigo-200/40 uppercase tracking-wider block font-mono">Cover Letter / Notes</label>
                <textarea
                  rows={4}
                  placeholder="Introduce yourself or highlight why you are a fit..."
                  value={applyForm.coverLetter}
                  onChange={(e) => setApplyForm({ ...applyForm, coverLetter: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none resize-none"
                />
              </div>

              {applyMsg.text && (
                <div className={`p-3.5 rounded-xl text-[11px] flex items-center space-x-2 ${
                  applyMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}>
                  {applyMsg.type === 'success' ? <CheckCircle className="h-4.5 w-4.5 text-green-400 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />}
                  <span>{applyMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isApplying || !applyForm.resumeUrl}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold font-mono uppercase tracking-wider text-[11px]"
              >
                {isApplying ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin mx-auto" />
                ) : (
                  <span>Submit Application</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Offer Letter Modal View */}
      {selectedOfferApp && selectedOfferApp.offerDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-white">
          <div className="bg-[#090514] border border-white/[0.08] rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-slide-in">
            <button
              onClick={() => setSelectedOfferApp(null)}
              className="absolute top-5 right-5 p-1 text-indigo-200/20 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 mb-3">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h2 className="text-xl font-black text-white">Employment Offer Letter</h2>
              <span className="text-[9px] uppercase font-bold text-indigo-400 font-mono tracking-wider block mt-1">FWC IT Services Private Limited</span>
            </div>

            <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-5 space-y-4 text-xs leading-relaxed text-slate-300">
              <p>
                Dear <strong className="text-white font-bold">{selectedOfferApp.candidateName}</strong>,
              </p>
              <p>
                We are thrilled to offer you a position at FWC IT Services! Based on your qualifications, matching skill evaluations, and interview loops, we are excited to invite you to join us.
              </p>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-white/[0.04] font-mono text-[11px]">
                <div>
                  <span className="text-[8px] uppercase text-indigo-200/40 font-bold block">Proposed Role</span>
                  <span className="text-white font-bold">{selectedOfferApp.offerDetails.designation}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase text-indigo-200/40 font-bold block">Compensation (CTC)</span>
                  <span className="text-white font-bold">₹{(selectedOfferApp.offerDetails.salaryAnnual/100000).toFixed(2)}L Per Annum</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase text-indigo-200/40 font-bold block">Proposed Joining Date</span>
                  <span className="text-white font-bold">{new Date(selectedOfferApp.offerDetails.joiningDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase text-indigo-200/40 font-bold block">Location & Mode</span>
                  <span className="text-white font-bold">Bangalore, IN (Hybrid)</span>
                </div>
              </div>

              {selectedOfferApp.offerDetails.managerNotes && (
                <div className="p-3 bg-white/[0.01] border-l-2 border-indigo-500 rounded-r-xl italic text-slate-400">
                  Manager note: "{selectedOfferApp.offerDetails.managerNotes}"
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 mt-6">
              <button
                disabled={isProcessingOffer}
                onClick={() => handleOfferAction(selectedOfferApp._id, 'decline')}
                className="flex-1 py-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 text-xs font-bold transition-all disabled:opacity-50"
              >
                Decline Offer
              </button>
              <button
                disabled={isProcessingOffer}
                onClick={() => handleOfferAction(selectedOfferApp._id, 'accept')}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-green-600/10 flex items-center justify-center space-x-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Accept & Sign Offer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CandidateDashboard() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#020105]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <CandidateDashboardContent />
    </Suspense>
  );
}
