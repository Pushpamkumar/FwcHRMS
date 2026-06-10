'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { User, Phone, Briefcase, Mail, Lock, Eye, EyeOff, Loader2, Award, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface DepartmentData {
  _id: string;
  name: string;
  code: string;
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [devVerifyUrl, setDevVerifyUrl] = useState('');

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('employee');
  const [departmentId, setDepartmentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fetch departments dynamically
  useEffect(() => {
    async function loadDepartments() {
      try {
        const response = await api.get('/auth/departments');
        setDepartments(response.data);
        if (response.data.length > 0) {
          setDepartmentId(response.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to load departments, falling back to static list.', err);
        // Static fallback
        const fallback = [
          { _id: 'static-eng', name: 'Engineering', code: 'ENG' },
          { _id: 'static-hr', name: 'Human Resources', code: 'HR' },
          { _id: 'static-mkt', name: 'Marketing & Sales', code: 'MKT' },
          { _id: 'static-fin', name: 'Finance', code: 'FIN' },
          { _id: 'static-ops', name: 'Operations', code: 'OPS' },
        ];
        setDepartments(fallback);
        setDepartmentId(fallback[0]._id);
      } finally {
        setIsLoadingDepts(false);
      }
    }
    loadDepartments();
  }, []);

  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', score: 0, color: 'bg-white/10' };
    if (password.length < 6) return { label: 'Weak', score: 1, color: 'bg-red-500' };
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z\d]/.test(password);
    
    if (hasLetters && hasNumbers && hasSpecial && password.length >= 8) {
      return { label: 'Very Strong', score: 4, color: 'bg-green-500' };
    }
    if (hasLetters && hasNumbers && password.length >= 8) {
      return { label: 'Strong', score: 3, color: 'bg-indigo-500' };
    }
    return { label: 'Medium', score: 2, color: 'bg-yellow-500' };
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!firstName || !lastName || !phone) {
        setErrorMsg('Please fill in your name and phone number.');
        return;
      }
      if (firstName.trim().length < 2) {
        setErrorMsg('First Name must be at least 2 characters.');
        return;
      }
      if (lastName.trim().length < 2) {
        setErrorMsg('Last Name must be at least 2 characters.');
        return;
      }
      const digitsOnly = phone.replace(/[^0-9]/g, '');
      if (digitsOnly.length < 10) {
        setErrorMsg('Contact Number must be a valid phone number with at least 10 digits.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!role || (role !== 'candidate' && !departmentId)) {
        setErrorMsg('Please select your target role and department.');
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password || !confirmPassword) {
      setErrorMsg('All credential fields are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (role !== 'candidate' && !email.endsWith('@fwcit.com')) {
      setErrorMsg('Registration is restricted to @fwcit.com domain email accounts only.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        firstName,
        lastName,
        phone,
        role,
        departmentId: departmentId.startsWith('static-') ? undefined : departmentId, // omit mock prefix
        email: email.toLowerCase(),
        password,
      };

      const response = await api.post('/auth/register', payload);
      setRegisteredEmail(email.toLowerCase());
      setSuccessMsg(response.data.message || 'Onboarding registration completed successfully.');
      if (response.data.devVerificationUrl) {
        setDevVerifyUrl(response.data.devVerificationUrl);
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      const errMsg = err.response?.data?.message || 'Registration failed. Please try again.';
      setErrorMsg(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pwdStrength = getPasswordStrength();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-radial from-[#1e1b4b] via-[#090514] to-[#020105] overflow-hidden px-4 py-12">
      {/* Background radial glow effect */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] mb-3">
            <Award className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Employee Self-Onboarding
          </h1>
          <p className="text-indigo-300/50 mt-0.5 text-xs font-semibold">
            FWC IT Services Portal Setup
          </p>
        </div>

        {/* Success State */}
        {successMsg ? (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-center animate-fade-in">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 mb-5">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {role === 'candidate' ? 'Registration Successful!' : 'Verification Required'}
            </h2>
            <p className="text-indigo-200/60 text-sm max-w-md mx-auto mb-6">
              {role === 'candidate'
                ? 'Your candidate account has been set up successfully. You can log in immediately.'
                : <>Your onboarding request was created. We have simulated sending an activation link to:<br /><strong className="text-indigo-300 font-semibold">{registeredEmail}</strong></>
              }
            </p>

            {devVerifyUrl && (
              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 text-left mb-6">
                <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1.5 tracking-wider">
                  Developer Quick Activation Link
                </span>
                <a
                  href={devVerifyUrl}
                  className="text-xs text-indigo-200 hover:text-indigo-100 break-all font-mono underline block"
                >
                  {devVerifyUrl}
                </a>
              </div>
            )}

            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm py-3 px-6 rounded-xl shadow-[0_4px_20px_rgba(99,102,241,0.25)] transition-all duration-150"
            >
              Return to Login Portal
            </Link>
          </div>
        ) : (
          /* Main Multi-Step Form Card */
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
            
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-8 px-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-200 ${
                      step === s
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                        : step > s
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-white/5 text-white/20'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 rounded-full transition-all duration-200 ${
                        step > s ? 'bg-indigo-500/40' : 'bg-white/5'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-xs mb-5 animate-pulse">
                {errorMsg}
              </div>
            )}

            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4 animate-slide-in">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Personal Details</h3>
                  <p className="text-indigo-200/40 text-xs mb-4">Let's start with your official name and contact.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-indigo-200/70 mb-1.5">First Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300/30">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Priya"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-200/70 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      placeholder="Sharma"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-200/70 mb-1.5">Contact Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300/30">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="tel"
                      placeholder="+91-9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/10 transition-all duration-150 flex items-center justify-center mt-6"
                >
                  Next Details <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            )}

            {/* STEP 2: Work details */}
            {step === 2 && (
              <div className="space-y-4 animate-slide-in">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Corporate Details</h3>
                  <p className="text-indigo-200/40 text-xs mb-4">Choose your structural role and department assignment.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-200/70 mb-1.5">System Access Role</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300/30">
                      <Briefcase className="h-4 w-4" />
                    </span>
                    <select
                      value={role}
                      onChange={(e) => {
                        setRole(e.target.value);
                        if (e.target.value === 'candidate') {
                          setDepartmentId('');
                        }
                      }}
                      className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="employee">Employee (Self-Service)</option>
                      <option value="manager">Manager (Team Management)</option>
                      <option value="hr_recruiter">HR Recruiter (Recruitment Operations)</option>
                      <option value="candidate">Candidate (Job Applicant Portal)</option>
                    </select>
                  </div>
                </div>

                {role !== 'candidate' && (
                  <div>
                    <label className="block text-xs font-semibold text-indigo-200/70 mb-1.5">Department Assignment</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      disabled={isLoadingDepts}
                      className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingDepts ? (
                        <option>Loading departments...</option>
                      ) : (
                        departments.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex-1 border border-white/10 hover:border-white/20 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-all duration-150 flex items-center justify-center"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/10 transition-all duration-150 flex items-center justify-center"
                  >
                    Next Steps <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Credentials */}
            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-4 animate-slide-in" autoComplete="off">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Account Credentials</h3>
                  <p className="text-indigo-200/40 text-xs mb-4">Complete your account with secure access details.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-200/70 mb-1.5">Corporate Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300/30">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      placeholder="username@fwcit.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-indigo-200/70 mb-1.5">Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300/30">
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Min 6 chars"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-200/70 mb-1.5">Confirm Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="pt-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-indigo-200/40 mb-1">
                      <span>Password Security:</span>
                      <span className="text-indigo-300">{pwdStrength.label}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex">
                      {[1, 2, 3, 4].map((idx) => (
                        <div
                          key={idx}
                          className={`h-full flex-1 mr-0.5 last:mr-0 rounded-full transition-all duration-200 ${
                            pwdStrength.score >= idx ? pwdStrength.color : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] font-bold text-indigo-300/60 hover:text-white flex items-center transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                    {showPassword ? 'Hide Passwords' : 'Reveal Passwords'}
                  </button>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={isSubmitting}
                    className="flex-1 border border-white/10 hover:border-white/20 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-all duration-150 flex items-center justify-center disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-lg transition-all duration-150 flex items-center justify-center disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Register Now'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Link back to login */}
            <div className="mt-6 text-center text-xs font-medium text-indigo-200/40">
              Already have an active account?{' '}
              <Link
                href="/login"
                className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
              >
                Sign in here
              </Link>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
