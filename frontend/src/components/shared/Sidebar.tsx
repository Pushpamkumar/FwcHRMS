'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
  UserPlus,
  TrendingUp,
  Brain,
  BarChart,
  Settings,
  LogOut,
  Award,
  Briefcase,
  User,
  Calendar,
  FileText,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  ListChecks,
  Menu
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
  UserPlus,
  TrendingUp,
  Brain,
  BarChart,
  Settings,
  Briefcase,
  User,
  Calendar,
  FileText,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  ListChecks
};

export const categorizedConfig = {
  admin: [
    {
      category: 'OVERVIEW',
      items: [
        { label: 'Admin Console', icon: 'LayoutDashboard', href: '/admin', tab: '' },
        { label: 'Employees Directory', icon: 'Users', href: '/admin/employees', tab: '' },
        { label: 'Payroll Engine', icon: 'DollarSign', href: '/admin/payroll', tab: '' },
      ]
    }
  ],
  manager: [
    {
      category: 'OVERVIEW',
      items: [
        { label: 'My Dashboard', icon: 'LayoutDashboard', href: '/manager', tab: '' },
        { label: 'AI Team Insights', icon: 'Brain', href: '/manager', tab: 'insights' },
      ]
    },
    {
      category: 'TEAM',
      items: [
        { label: 'My Team', icon: 'Users', href: '/manager', tab: 'team' },
        { label: 'Attendance Log', icon: 'Clock', href: '/manager', tab: 'attendance' },
        { label: 'Leave Approvals', icon: 'Calendar', href: '/manager', tab: 'leaves', badgeKey: 'pendingLeaves', badgeColor: 'bg-amber-500 text-white' },
        { label: 'Timesheets', icon: 'ListChecks', href: '/manager', tab: 'timesheets', badgeKey: 'timesheets', badgeColor: 'bg-rose-500 text-white' },
      ]
    },
    {
      category: 'PERFORMANCE',
      items: [
        { label: 'OKRs & Goals', icon: 'Clock', href: '/manager', tab: 'okrs' },
        { label: 'Team Performance', icon: 'TrendingUp', href: '/manager', tab: 'performance' },
        { label: 'Appraisals', icon: 'FileText', href: '/manager', tab: 'appraisals' },
        { label: 'Recognition', icon: 'Award', href: '/manager', tab: 'recognition' },
      ]
    },
    {
      category: 'OPERATIONS',
      items: [
        { label: 'Hiring Requests', icon: 'Briefcase', href: '/manager', tab: 'hiring' },
        { label: 'Candidate Offers', icon: 'Award', href: '/manager', tab: 'candidate_offers' },
        { label: 'Team Reports', icon: 'BarChart', href: '/manager', tab: 'reports' },
        { label: 'Escalations', icon: 'ShieldAlert', href: '/manager', tab: 'escalations', badgeKey: 'escalations', badgeColor: 'bg-rose-500 text-white' },
      ]
    },
    {
      category: 'PERSONAL',
      items: [
        { label: 'My Profile', icon: 'User', href: '/manager', tab: 'profile' },
        { label: 'Settings', icon: 'Settings', href: '/manager', tab: 'settings' },
      ]
    }
  ],
  hr_recruiter: [
    {
      category: 'OVERVIEW',
      items: [
        { label: 'Dashboard', icon: 'LayoutDashboard', href: '/recruiter', tab: '' },
        { label: 'AI Screener', icon: 'Brain', href: '/recruiter', tab: 'screener', badgeKey: 'aiScreener', badgeColor: 'bg-sky-500 text-white' },
      ]
    },
    {
      category: 'PIPELINE',
      items: [
        { label: 'Hiring Requests', icon: 'FileText', href: '/recruiter', tab: 'hiring_requests', badgeKey: 'pendingHiringRequests', badgeColor: 'bg-amber-500 text-white' },
        { label: 'Job Openings', icon: 'Briefcase', href: '/recruiter', tab: 'jobs', badgeKey: 'activeJobs', badgeColor: 'bg-rose-500 text-white' },
        { label: 'Candidates', icon: 'Users', href: '/recruiter', tab: 'candidates', badgeKey: 'totalCandidates', badgeColor: 'bg-sky-500 text-white' },
        { label: 'Applications', icon: 'FileText', href: '/recruiter', tab: 'applications' },
        { label: 'Interviews', icon: 'Calendar', href: '/recruiter', tab: 'interviews' },
        { label: 'Offers & Hires', icon: 'Award', href: '/recruiter', tab: 'hires' },
      ]
    },
    {
      category: 'TOOLS',
      items: [
        { label: 'JD Generator', icon: 'Briefcase', href: '/recruiter', tab: 'jdgen' },
        { label: 'Hiring Analytics', icon: 'BarChart', href: '/recruiter', tab: 'analytics' },
      ]
    },
    {
      category: 'ADMIN',
      items: [
        { label: 'Talent Pool', icon: 'Users', href: '/recruiter', tab: 'talentpool' },
        { label: 'Settings', icon: 'Settings', href: '/recruiter', tab: 'settings' },
      ]
    }
  ],
  employee: [
    {
      category: 'MY SPACE',
      items: [
        { label: 'My Dashboard', icon: 'LayoutDashboard', href: '/employee', tab: '' },
        { label: 'My Profile', icon: 'User', href: '/employee', tab: 'profile' },
        { label: 'My Documents', icon: 'FileText', href: '/employee', tab: 'documents' },
      ]
    }
  ],
  candidate: [
    {
      category: 'APPLICANT SPACE',
      items: [
        { label: 'Explore Jobs', icon: 'Briefcase', href: '/candidate', tab: '' },
        { label: 'My Applications', icon: 'FileText', href: '/candidate', tab: 'applications' },
        { label: 'Resume Analyzer', icon: 'Brain', href: '/candidate', tab: 'analyzer' },
        { label: 'Notifications', icon: 'ShieldAlert', href: '/candidate', tab: 'notifications' },
      ]
    }
  ],
};

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || '';
  const { user, logout } = useAuthStore();
  const [badges, setBadges] = useState<any>({});

  useEffect(() => {
    if (!user) return;
    const fetchBadges = async () => {
      try {
        const res = await api.get('/employees/badge-counts');
        setBadges(res.data);
      } catch (err) {
        console.error('Failed to load portal badge counts:', err);
      }
    };
    fetchBadges();
    
    // Poll updates every 30 seconds
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const roleKey = user.role === 'hr_recruiter' ? 'hr_recruiter' : user.role;
  const categories = categorizedConfig[roleKey as keyof typeof categorizedConfig] || [];

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (e) {
      console.error('Logout navigation failed:', e);
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile screen when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`bg-[#090514] h-screen flex flex-col justify-between select-none shrink-0 overflow-y-auto transition-all duration-300 ease-in-out z-50
          /* Desktop layout classes */
          lg:static lg:translate-x-0
          ${isOpen ? 'lg:w-64 lg:border-r border-white/[0.05]' : 'lg:w-0 lg:border-r-0 lg:overflow-hidden'}

          /* Mobile layout classes */
          fixed inset-y-0 left-0 w-64 border-r border-white/[0.05]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand Header */}
        <div>
          <div className="p-6 flex items-center justify-between border-b border-white/[0.05] sidebar-brand-header">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#e8ff47] rounded-xl logo-icon shadow-[0_0_15px_rgba(232,255,71,0.4)]">
                <Award className="h-5 w-5 text-[#0a0a0f]" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-white block leading-tight logo-text">NexHR Portal</span>
                <span className="text-[9px] text-indigo-300/40 uppercase font-bold tracking-wider font-mono">
                  {user.role === 'hr_recruiter' ? 'Recruiter Console' : user.role === 'manager' ? 'Manager Console' : user.role === 'candidate' ? 'Candidate Portal' : 'Enterprise Suite'}
                </span>
              </div>
            </div>
            {/* Toggle button in sidebar (visible on both desktop & mobile when open) */}
            <button
              onClick={onClose}
              className="p-1.5 text-indigo-300/50 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              aria-label="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Categories */}
          <div className="mt-4 px-4 pb-6 space-y-5">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <span className="text-[9px] font-bold text-indigo-300/20 uppercase tracking-widest block pl-3 font-mono">
                  {cat.category}
                </span>
                
                <div className="space-y-0.5">
                  {cat.items.map((item) => {
                    const Icon = iconMap[item.icon] || LayoutDashboard;
                    const itemHref = item.tab ? `${item.href}?tab=${item.tab}` : item.href;
                    const isActive = pathname === item.href && currentTab === item.tab;
                    const badgeValue = (item as any).badgeKey ? badges[(item as any).badgeKey] : null;

                    return (
                      <Link
                        key={item.label}
                        href={itemHref}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 sidebar-nav-item ${
                          isActive
                            ? 'active bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border-l-2 border-indigo-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                            : 'text-indigo-200/40 hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Icon className="h-4.5 w-4.5" />
                          <span>{item.label}</span>
                        </div>
                        
                        {badgeValue !== undefined && badgeValue !== null && badgeValue > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide ${
                            (item as any).badgeColor || 'bg-indigo-500/20 text-indigo-300'
                          }`}>
                            {badgeValue}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Profile Section */}
        <div className="p-4 border-t border-white/[0.05] bg-[#020105]/20 shrink-0">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_2px_10px_rgba(99,102,241,0.2)]">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-xs text-white block truncate">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-[9px] text-indigo-200/30 uppercase font-semibold block truncate mt-0.5">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 py-2.5 rounded-xl text-xs font-semibold transition-all hover:bg-red-500/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Exit Portal</span>
          </button>
        </div>
      </aside>
    </>
  );
}
