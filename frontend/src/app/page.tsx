'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  Users,
  CalendarDays,
  FileCheck2,
  Sliders,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';

export default function Home() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  return (
    <div
      className={`min-h-screen flex flex-col justify-between overflow-hidden relative selection:bg-indigo-500/30 transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-[#06040c] via-[#020105] to-[#04020a] text-white'
          : 'bg-gradient-to-br from-[#f0f4ff] via-[#f8f9ff] to-[#eef0ff] text-slate-900'
      }`}
    >
      {/* Background radial glow effect */}
      <div
        className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none transition-colors duration-500 ${
          isDark ? 'bg-indigo-500/5' : 'bg-indigo-300/20'
        }`}
      />
      <div
        className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none transition-colors duration-500 ${
          isDark ? 'bg-purple-500/5' : 'bg-purple-300/20'
        }`}
      />

      {/* Header bar */}
      <header
        className={`max-w-7xl w-full mx-auto px-6 h-20 flex items-center justify-between z-10 shrink-0 border-b transition-colors duration-500 ${
          isDark ? 'border-white/[0.04]' : 'border-slate-200/60'
        }`}
      >
        {/* Professional Logo Block */}
        <div className="flex items-center space-x-3 group cursor-default">
          {/* Icon container — replaced Brain with Building2 */}
          <div className="relative">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl shadow-[0_4px_16px_rgba(99,102,241,0.35)] border border-indigo-400/30 group-hover:shadow-[0_4px_24px_rgba(99,102,241,0.55)] transition-shadow duration-300">
              <Building2 className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            {/* Live pulse dot */}
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-current animate-pulse" />
          </div>

          {/* Brand text */}
          <div className="flex flex-col leading-none">
            <span
              className={`font-extrabold text-[15px] tracking-tight block transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-slate-800'
              }`}
            >
              FWC IT Services
            </span>
            <span className="text-[9.5px] text-indigo-400 font-bold uppercase tracking-[0.18em] mt-0.5">
              AI-HRMS · Enterprise Platform
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="h-1 w-1 rounded-full bg-emerald-400 inline-block" />
              <span
                className={`text-[8px] font-semibold tracking-wider transition-colors duration-300 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                WORKFORCE INTELLIGENCE SYSTEM
              </span>
            </div>
          </div>
        </div>

        {/* Nav actions */}
        <div className="flex items-center space-x-3">
          {/* Day / Night toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`relative h-9 w-9 rounded-xl flex items-center justify-center border transition-all duration-300 hover:scale-105 active:scale-95 ${
              isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-amber-300'
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Sign In button */}
          <Link
            href="/login"
            className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wide border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
              isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
            }`}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main hero display */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col items-center justify-center text-center z-10 space-y-12">

        {/* Badge & Title */}
        <div className="space-y-5 max-w-3xl">
          <div
            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider mx-auto badge-animated transition-colors duration-300 ${
              isDark
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                : 'bg-indigo-50 border-indigo-200 text-indigo-600'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span>Next-Generation Workforce Solution</span>
          </div>

          <h1
            className={`text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight title-animate transition-colors duration-300 ${
              isDark
                ? 'text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-300'
                : 'text-transparent bg-clip-text bg-gradient-to-b from-slate-900 via-indigo-800 to-indigo-600'
            }`}
          >
            Real-Time AI-Powered HR Management
          </h1>

          <p
            className={`group text-xs sm:text-sm max-w-xl mx-auto leading-relaxed cursor-default transition-all duration-500 ${
              isDark
                ? 'text-indigo-200/50 hover:text-indigo-200/70'
                : 'text-slate-500 hover:text-slate-600'
            }`}
          >
            <span className="transition-all duration-300 group-hover:text-indigo-300 hover:!text-indigo-200 hover:drop-shadow-[0_0_8px_rgba(165,180,252,0.6)]">Synchronize</span>{' '}
            <span className="transition-all duration-300 hover:text-purple-300 hover:drop-shadow-[0_0_10px_rgba(192,132,252,0.5)] cursor-pointer">geolocated attendance audits</span>,{' '}
            <span className="transition-all duration-300 hover:text-indigo-300 hover:drop-shadow-[0_0_10px_rgba(165,180,252,0.5)] cursor-pointer">automatic leave deductions</span>,{' '}
            <span className="transition-all duration-300 hover:text-violet-300 hover:drop-shadow-[0_0_10px_rgba(221,214,254,0.5)] cursor-pointer">performance OKRs</span>,{' '}
            and{' '}
            <span className="transition-all duration-300 hover:text-blue-300 hover:drop-shadow-[0_0_10px_rgba(147,197,253,0.5)] cursor-pointer">automated candidate resume screening</span>{' '}
            inside one{' '}
            <span className="transition-all duration-300 hover:text-white hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] font-semibold cursor-pointer">premium dashboard</span>.
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-8 py-4 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 hover:scale-[1.02] active:scale-[0.98] text-xs font-bold tracking-wider uppercase transition-all shadow-[0_4px_25px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_35px_rgba(99,102,241,0.4)] flex items-center space-x-2 w-full sm:w-auto justify-center text-white"
          >
            <span>Login</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/apply/mock-job-id"
            className={`px-8 py-4 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all w-full sm:w-auto justify-center flex items-center space-x-1.5 border ${
              isDark
                ? 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08] text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
          >
            <span>Career Openings</span>
          </Link>
        </div>

        {/* Feature Cards Grid - Loop Marquee */}
        <div className="marquee-container w-full max-w-6xl pt-6">
          <div className="marquee-track">
            {/* First Set */}
            <div className="marquee-content gap-6 px-3">
              {[
                { icon: <Users className="h-5 w-5" />, color: 'indigo', title: 'Employee Self-Service', desc: 'GPS clock-ins, instant leave request applications, and live OKR sliders connecting to your postgres balance databases.' },
                { icon: <CalendarDays className="h-5 w-5" />, color: 'purple', title: 'Management Console', desc: 'Review pending leaves, assign goals, and verify team log coordinates to maintain workspace compliance.' },
                { icon: <Sparkles className="h-5 w-5" />, color: 'green', title: 'Recruitment Kanban', desc: 'Evaluate applications with automatic match scores and skill checklists generated instantly by the AI screening parser.' },
                { icon: <FileCheck2 className="h-5 w-5" />, color: 'blue', title: 'BullMQ Payroll', desc: 'Run monthly payroll batches using asynchronous queue pipelines calculating LOP, PF, PT, and tax variables.' },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`p-6 rounded-3xl space-y-4 w-[290px] md:w-[320px] shrink-0 marquee-card text-left border transition-colors duration-300 ${
                    isDark
                      ? 'bg-white/[0.01] border-white/[0.04]'
                      : 'bg-white border-slate-200/60 shadow-sm'
                  }`}
                >
                  <div className={`p-3 bg-${card.color}-500/10 text-${card.color}-400 rounded-2xl inline-block`}>
                    {card.icon}
                  </div>
                  <h3 className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{card.title}</h3>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-indigo-200/50' : 'text-slate-500'}`}>{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Duplicate Set for Infinite Loop */}
            <div className="marquee-content gap-6 px-3" aria-hidden="true">
              {[
                { icon: <Users className="h-5 w-5" />, color: 'indigo', title: 'Employee Self-Service', desc: 'GPS clock-ins, instant leave request applications, and live OKR sliders connecting to your postgres balance databases.' },
                { icon: <CalendarDays className="h-5 w-5" />, color: 'purple', title: 'Management Console', desc: 'Review pending leaves, assign goals, and verify team log coordinates to maintain workspace compliance.' },
                { icon: <Sparkles className="h-5 w-5" />, color: 'green', title: 'Recruitment Kanban', desc: 'Evaluate applications with automatic match scores and skill checklists generated instantly by the AI screening parser.' },
                { icon: <FileCheck2 className="h-5 w-5" />, color: 'blue', title: 'BullMQ Payroll', desc: 'Run monthly payroll batches using asynchronous queue pipelines calculating LOP, PF, PT, and tax variables.' },
              ].map((card, i) => (
                <div
                  key={`dup-${i}`}
                  className={`p-6 rounded-3xl space-y-4 w-[290px] md:w-[320px] shrink-0 marquee-card text-left border transition-colors duration-300 ${
                    isDark
                      ? 'bg-white/[0.01] border-white/[0.04]'
                      : 'bg-white border-slate-200/60 shadow-sm'
                  }`}
                >
                  <div className={`p-3 bg-${card.color}-500/10 text-${card.color}-400 rounded-2xl inline-block`}>
                    {card.icon}
                  </div>
                  <h3 className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{card.title}</h3>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-indigo-200/50' : 'text-slate-500'}`}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Footer bar */}
      <footer
        className={`max-w-7xl w-full mx-auto px-6 h-16 flex items-center justify-between text-[10px] font-mono border-t z-10 shrink-0 transition-colors duration-300 ${
          isDark
            ? 'text-indigo-200/20 border-white/[0.02]'
            : 'text-slate-400 border-slate-200/60'
        }`}
      >
        <span>© 2026 FWC IT Services. All rights reserved.</span>
        <span>Secure HTTPS Connection (TLS 1.3)</span>
      </footer>
    </div>
  );
}
