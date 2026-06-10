'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/api';
import Sidebar from '../../components/shared/Sidebar';
import ChatBot from '../../components/ai/ChatBot';
import { Loader2, Bell, Search, Sun, Moon } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { initializeAuth, isAuthenticated, isLoading, user } = useAuthStore();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme as 'dark' | 'light');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.body.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
      document.body.classList.remove('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.body.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
      document.body.classList.remove('light-theme');
    }
  };
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/recruitment/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/recruitment/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    try {
      await Promise.all(unread.map(n => api.put(`/recruitment/notifications/${n._id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Client-side guard check (as secondary security backup to Next.js middleware)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090514]">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <span className="text-xs text-indigo-200/50 uppercase tracking-widest font-bold font-mono">
          Securing Connection...
        </span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Let the redirect do its work
  }

  return (
    <div className="min-h-screen flex bg-[#020105] text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header Navigation */}
        <header className="h-16 border-b border-white/[0.05] bg-[#090514]/40 backdrop-blur-md px-8 flex items-center justify-between z-20 shrink-0">
          
          {/* Left search mock */}
          <div className="flex items-center space-x-3 w-72 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-1.5 focus-within:border-indigo-500 transition-colors">
            <Search className="h-4 w-4 text-indigo-200/30" />
            <input
              type="text"
              placeholder="Search employee directory..."
              className="bg-transparent border-none focus:outline-none text-xs text-white placeholder-indigo-200/20 w-full"
            />
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-4">
            
            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-xl transition-all ${
                  showNotifications 
                    ? 'text-white bg-white/10 border border-white/10' 
                    : 'text-indigo-300/50 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center ring-2 ring-[#090514]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-[#090514]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl p-4 z-50 animate-slide-in text-xs max-h-[350px] overflow-y-auto space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                    <span className="font-extrabold text-xs text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2 pr-1">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div 
                          key={n._id} 
                          onClick={() => !n.read && handleMarkAsRead(n._id)}
                          className={`p-3 rounded-xl border transition-all ${
                            n.read 
                              ? 'bg-white/[0.01] border-white/[0.03] text-slate-400 cursor-default' 
                              : 'bg-indigo-600/10 border-indigo-500/20 text-white hover:bg-indigo-600/15 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[11px] block">{n.title}</span>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 ml-2" />}
                          </div>
                          <p className="text-[10px] leading-relaxed text-slate-300 mb-1">{n.message}</p>
                          <span className="text-[8px] text-slate-500 font-mono block">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-[10px] font-mono">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className="p-2 text-indigo-300/50 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent"
              title={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Profile trigger */}
            <div className="h-8 w-8 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center font-bold text-indigo-300 text-xs shadow-inner">
              {user.firstName[0]}{user.lastName[0]}
            </div>

          </div>
        </header>

        {/* Dynamic Page content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#06040c] via-[#020105] to-[#04020a] p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

      </div>
      <ChatBot />
    </div>
  );
}
