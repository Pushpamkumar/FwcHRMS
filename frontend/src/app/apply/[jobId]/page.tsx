'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import {
  Briefcase,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle,
  Send,
  FileText,
  Brain,
  Mail,
  Phone,
  User,
  ArrowLeft
} from 'lucide-react';

// For the public candidate route, we make a standard axios instance to prevent needing dashboard JWT auth interceptors
const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true
});

interface JobPosting {
  _id: string;
  title: string;
  departmentId?: {
    name: string;
    code: string;
  };
  description: string;
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
}

const MOCK_JOB: JobPosting = {
  _id: 'mock-job-id',
  title: 'Senior Full Stack Engineer (AI Integration)',
  departmentId: {
    name: 'Technology & AI',
    code: 'ENG'
  },
  description: 'We are seeking a Senior Full Stack Engineer to join our core AI-HRMS platform team. You will build and scale web architectures, integrate real-time LLM agents, design micro-services, and collaborate on state-of-the-art HR systems. The ideal candidate has deep expertise in React/Next.js, Node.js, and cloud orchestration.',
  requirements: {
    minExperience: 3,
    maxExperience: 8,
    requiredSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Next.js', 'FastAPI'],
    education: 'B.Tech / MCA / Equivalent experience',
    location: 'Bangalore (Hybrid)'
  },
  salaryRange: {
    min: 1500000,
    max: 2800000,
    currency: 'INR'
  }
};

export default function CandidateApplyPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [form, setForm] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    resumeProfileType: 'senior' // 'senior' or 'junior' to trigger AI responses
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setError('');
        // Fetch all jobs and find the active matching one
        const res = await publicApi.get('/recruitment/jobs');
        const found = res.data.find((j: any) => j._id === jobId);
        if (!found) {
          if (jobId === 'mock-job-id') {
            setJob(MOCK_JOB);
          } else {
            setError('Job opening not found or has been filled.');
          }
        } else {
          setJob(found);
        }
      } catch (err: any) {
        console.error('Fetch job opening failed:', err);
        if (jobId === 'mock-job-id') {
          setJob(MOCK_JOB);
        } else {
          setError('Could not retrieve job listing details. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Map template types to simulated resume URLs so FastAPI triggers specific shortlist logic
    const mockResumeUrl = form.resumeProfileType === 'senior'
      ? 'https://cloudinary.com/fwc/resumes/senior_lead_developer_profile.pdf'
      : 'https://cloudinary.com/fwc/resumes/junior_developer_profile.pdf';

    try {
      await publicApi.post(`/recruitment/jobs/${jobId}/apply`, {
        candidateName: form.candidateName,
        candidateEmail: form.candidateEmail,
        candidatePhone: form.candidatePhone,
        resumeUrl: mockResumeUrl
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Application submit failed:', err);
      if (jobId === 'mock-job-id') {
        // Fallback simulate success for demonstration/testing
        setTimeout(() => {
          setIsSuccess(true);
          setIsSubmitting(false);
        }, 1000);
        return;
      }
      setError(err.response?.data?.message || 'Failed to submit application. Verify inputs.');
    } finally {
      if (jobId !== 'mock-job-id') {
        setIsSubmitting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020105] flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
        <span className="text-xs text-indigo-200/50 uppercase font-bold tracking-widest font-mono">
          Loading Job Opening...
        </span>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-[#020105] flex flex-col items-center justify-center text-white p-6">
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-6 py-5 rounded-3xl max-w-md text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06040c] via-[#020105] to-[#04020a] text-white p-6 md:p-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Job details description */}
        {job && (
          <div className="lg:col-span-7 bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 space-y-6 shadow-xl">
            <div>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase tracking-widest border border-indigo-500/20 font-mono">
                {job.departmentId?.name || 'Technology'}
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight mt-4 text-white">
                {job.title}
              </h1>
              <div className="flex items-center space-x-2 text-indigo-200/40 text-xs mt-2 font-mono">
                <MapPin className="h-3.5 w-3.5" />
                <span>{job.requirements.location}</span>
                {job.salaryRange && job.salaryRange.max > 0 && (
                  <>
                    <span>·</span>
                    <span>Est. CTC: ₹{(job.salaryRange.min / 100000).toFixed(1)}L - ₹{(job.salaryRange.max / 100000).toFixed(1)}L / Yr</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">Position Overview</h3>
              <p className="text-xs text-indigo-200/70 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/[0.05]">
              <div>
                <h4 className="text-[10px] uppercase font-bold text-indigo-200/30">Experience Required</h4>
                <span className="text-xs text-white block mt-1">
                  {job.requirements.minExperience} to {job.requirements.maxExperience} Years
                </span>
              </div>
              <div>
                <h4 className="text-[10px] uppercase font-bold text-indigo-200/30">Education Profile</h4>
                <span className="text-xs text-white block mt-1">{job.requirements.education}</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/[0.05]">
              <h4 className="text-[10px] uppercase font-bold text-indigo-200/30">Key Core Skills</h4>
              <div className="flex flex-wrap gap-2">
                {job.requirements.requiredSkills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-indigo-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Apply Form or Success message */}
        <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 shadow-xl">
          {isSuccess ? (
            <div className="text-center py-10 space-y-6 animate-fade-in">
              <div className="h-16 w-16 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                <CheckCircle className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-extrabold text-white">Application Received!</h2>
                <p className="text-xs text-indigo-200/50 leading-relaxed">
                  Thank you for applying to FWC IT Services. Our real-time AI recruitment service is screening your CV against core job parameters.
                </p>
              </div>

              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center space-x-3 text-left">
                <Brain className="h-8 w-8 text-indigo-400 animate-pulse shrink-0" />
                <div className="text-[10px] text-indigo-200/60 leading-relaxed font-mono">
                  <span className="font-bold text-white block uppercase tracking-wider mb-0.5">Real-Time AI Pipeline</span>
                  Automatic shortlists and skill matches are updated on the Recruiter board instantly.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-white">Submit Candidate Profile</h2>
                <p className="text-xs text-indigo-200/40 mt-1">
                  Upload your CV details to trigger automatic AI screening checks.
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3.5 rounded-2xl text-[11px] flex items-center space-x-2">
                  <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase font-bold flex items-center space-x-1">
                    <User className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter first & last name"
                    value={form.candidateName}
                    onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase font-bold flex items-center space-x-1">
                    <Mail className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={form.candidateEmail}
                    onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-indigo-200/40 uppercase font-bold flex items-center space-x-1">
                    <Phone className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={form.candidatePhone}
                    onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-white focus:outline-none font-mono"
                  />
                </div>

                {/* Resume Profile Type selector for AI simulation */}
                <div className="space-y-2.5 p-4 bg-white/[0.01] border border-white/[0.04] rounded-2xl">
                  <span className="text-[10px] text-indigo-200/30 uppercase font-bold block mb-1">
                    Simulate AI Screening Profile
                  </span>

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resumeProfileType"
                      value="senior"
                      checked={form.resumeProfileType === 'senior'}
                      onChange={() => setForm({ ...form, resumeProfileType: 'senior' })}
                      className="mt-1.5 accent-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Senior Lead Candidate CV</span>
                      <span className="text-[10px] text-indigo-200/30 block mt-0.5">Includes keyword matching to trigger AI shortlisting.</span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer mt-3">
                    <input
                      type="radio"
                      name="resumeProfileType"
                      value="junior"
                      checked={form.resumeProfileType === 'junior'}
                      onChange={() => setForm({ ...form, resumeProfileType: 'junior' })}
                      className="mt-1.5 accent-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Junior Candidate CV</span>
                      <span className="text-[10px] text-indigo-200/30 block mt-0.5">Missing experience and skills to trigger AI review/rejection warnings.</span>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-500/10"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Submitting Profile...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Apply For Position</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
