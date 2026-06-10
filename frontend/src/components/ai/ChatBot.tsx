'use client';

import React, { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Brain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBot() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! I am HRBot. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice synthesis/recognition states
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Set greeting message dynamically based on role
  useEffect(() => {
    if (user) {
      let greetContent = 'Hello! I am HRBot, your personal FWC assistant. How can I help you today?';
      if (user.role === 'candidate') {
        greetContent = 'Hello! I am HRBot, your candidate assistant. Ask me about available job roles, interview procedures, or company work location.';
      } else if (user.role === 'employee') {
        greetContent = 'Hello! I am HRBot, your personal FWC assistant. Ask me about your remaining leave balance, salary slip, or attendance summary.';
      } else if (user.role === 'manager') {
        greetContent = 'Hello! I am HRBot, your manager assistant. Ask me about team attendance rates, pending leave approvals, OKR goal status, or candidate offer approvals.';
      } else if (user.role === 'hr_recruiter') {
        greetContent = 'Hello! I am HRBot, your recruitment assistant. Ask me about job openings, candidate screening, resume score distributions, or interview scheduling.';
      } else if (user.role === 'admin') {
        greetContent = 'Hello! I am HRBot, your admin assistant. Ask me about system-wide payroll records, attendance heatmaps, or recruitment metrics.';
      }
      setMessages([
        { role: 'assistant', content: greetContent }
      ]);
    }
  }, [user]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Global event listener to toggle open from other buttons
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  // Initialize Web Speech API Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.lang = 'en-US';
        rec.interimResults = false;

        rec.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        rec.onerror = () => {
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, content: textToSend }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        messages: newMessages
      });

      const reply = response.data.content;
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);

      // Silent speech TTS if enabled
      if (isSpeechEnabled && typeof window !== 'undefined') {
        const synth = window.speechSynthesis;
        if (synth) {
          // Cancel previous utterances
          synth.cancel();
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.rate = 1.0;
          synth.speak(utterance);
        }
      }
    } catch (e) {
      console.error('Chat bot call error:', e);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Apologies, I encountered a connection issue. Please verify that the Express and FastAPI servers are running.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  // Toggle voice capture (STT)
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome/Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-4 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-[0_4px_25px_rgba(99,102,241,0.4)] transition-all hover:scale-105 duration-150 flex items-center justify-center border border-indigo-400/30"
        >
          <MessageSquare className="h-6 w-6 animate-pulse" />
        </button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="bg-[#090514]/95 backdrop-blur-xl border border-white/[0.08] rounded-3xl w-80 sm:w-96 h-[480px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-slide-in">
          
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-white/[0.05] bg-[#020105]/20 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Brain className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-white block leading-tight">HRBot Assistant</span>
                <span className="text-[9px] text-indigo-300/40 uppercase font-bold tracking-wider mt-0.5">Real-time AI Service</span>
              </div>
            </div>
            
            {/* Header Toolbar Controls */}
            <div className="flex items-center space-x-2">
              {/* Voice Read Aloud Toggle */}
              <button
                onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isSpeechEnabled ? 'text-indigo-400 bg-indigo-500/10' : 'text-indigo-200/20 hover:text-white'
                }`}
                title="Toggle Speech Output"
              >
                {isSpeechEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-indigo-200/20 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Panel Chat Logs */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={idx}
                  className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} animate-fade-in`}
                >
                  <div className={`flex items-start space-x-2.5 max-w-[80%] ${isAssistant ? '' : 'flex-row-reverse space-x-reverse'}`}>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isAssistant 
                        ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' 
                        : 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white'
                    }`}>
                      {isAssistant ? <Brain className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-[11px] leading-relaxed font-medium ${
                      isAssistant 
                        ? 'bg-white/[0.02] border border-white/[0.05] text-indigo-200/90 rounded-tl-none' 
                        : 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2 bg-white/[0.01] border border-white/[0.03] rounded-2xl py-2 px-3 text-[10px] text-indigo-300/40">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Panel Input Bar */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-white/[0.05] bg-[#020105]/20 flex items-center space-x-2">
            
            {/* STT Speech Input Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border transition-all ${
                isListening 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' 
                  : 'bg-white/[0.02] border-white/[0.05] text-indigo-300/40 hover:text-white'
              }`}
              title="Voice Input"
            >
              {isListening ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
            </button>

            {/* Input field */}
            <input
              type="text"
              placeholder={isListening ? 'Listening...' : 'Type message here...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2 px-3.5 text-xs text-white placeholder-indigo-200/20 focus:outline-none"
            />

            {/* Submit Send Button */}
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-30 transition-all duration-150"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
