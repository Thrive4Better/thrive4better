import type { ReactElement } from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot, User, Minimize2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';

// ── Types ──

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ── Simple Markdown Renderer ──

function renderMarkdown(text: string) {
  // Split into lines and process
  const lines = text.split('\n');
  const elements: ReactElement[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={elements.length} className={cn('my-1.5 space-y-0.5', listType === 'ul' ? 'list-disc' : 'list-decimal', 'list-inside')}>
          {listItems.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">{renderInline(item)}</li>
          ))}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h4 key={i} className="text-sm font-semibold mt-2 mb-1">{renderInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h3 key={i} className="text-sm font-bold mt-2 mb-1">{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(<h2 key={i} className="text-base font-bold mt-2 mb-1">{renderInline(line.slice(2))}</h2>);
    }
    // Unordered list
    else if (line.match(/^[\-\*]\s/)) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(line.replace(/^[\-\*]\s/, ''));
    }
    // Ordered list
    else if (line.match(/^\d+\.\s/)) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(line.replace(/^\d+\.\s/, ''));
    }
    // Empty line
    else if (line.trim() === '') {
      flushList();
    }
    // Normal paragraph
    else {
      flushList();
      elements.push(<p key={i} className="text-sm leading-relaxed my-1">{renderInline(line)}</p>);
    }
  }
  flushList();

  return <>{elements}</>;
}

function renderInline(text: string): (string | ReactElement)[] {
  const parts: (string | ReactElement)[] = [];
  // Handle bold and inline code
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // Bold
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      // Code
      parts.push(<code key={match.index} className="bg-gray-100 text-xs px-1.5 py-0.5 rounded font-mono">{match[3]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ── Quick Questions ──

const QUICK_QUESTIONS = [
  'What GST obligations apply to NDIS providers?',
  'How do I categorise NDIS income for BAS?',
  'When is my BAS due?',
  'Explain the difference between GST-free and input-taxed',
  'What super rate should I be paying?',
];

// ── Component ──

export default function AccountingChatbot() {
  const { invoices, shifts } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'G\'day! I\'m your NDIS accounting assistant. I can help with GST/BAS questions, transaction categorisation, NDIS-specific accounting, and more.\n\nAsk me anything or try one of the quick questions below.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Build financial context from store data
  const financialContext = useMemo(() => {
    const now = new Date();
    const fyStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;

    // Current FY invoices
    const fyStartDate = new Date(fyStart, 6, 1);
    const fyInvoices = invoices.filter((inv) => {
      try { return new Date(inv.invoiceDate) >= fyStartDate; } catch { return false; }
    });

    const totalRevenue = fyInvoices.reduce((s, inv) => s + inv.subtotal, 0);
    const totalGST = fyInvoices.filter((inv) => inv.gstApplicable).reduce((s, inv) => s + inv.gstAmount, 0);
    const totalGSTFreeRevenue = fyInvoices.filter((inv) => !inv.gstApplicable).reduce((s, inv) => s + inv.subtotal, 0);
    const invoiceCount = fyInvoices.length;
    const paidInvoices = fyInvoices.filter((inv) => inv.status === 'Paid').length;
    const overdueInvoices = fyInvoices.filter((inv) => inv.status === 'Overdue').length;

    // Wage data
    const fyShifts = shifts.filter((sh) => {
      if (sh.status !== 'Completed') return false;
      try { return new Date(sh.date) >= fyStartDate; } catch { return false; }
    });
    const totalWages = fyShifts.reduce((s, sh) => s + sh.totalAmount, 0);

    // Support categories breakdown
    const categories: Record<string, number> = {};
    for (const inv of fyInvoices) {
      for (const item of inv.lineItems) {
        const cat = item.supportCategory || 'Uncategorised';
        categories[cat] = (categories[cat] || 0) + item.amount;
      }
    }

    const catLines = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `  - ${cat}: ${formatCurrency(amt)}`)
      .join('\n');

    return `Business: Thrive 4 Better Pty Ltd (ABN 15 694 748 297)
Industry: NDIS Support Services Provider
Financial Year: ${fyStart}/${fyStart + 1}

Revenue Summary (FY to date):
  - Total revenue: ${formatCurrency(totalRevenue)}
  - GST collected: ${formatCurrency(totalGST)}
  - GST-free revenue: ${formatCurrency(totalGSTFreeRevenue)}
  - Total invoices: ${invoiceCount} (${paidInvoices} paid, ${overdueInvoices} overdue)

Wage Summary (FY to date):
  - Total wages paid: ${formatCurrency(totalWages)}
  - Estimated super liability (11.5%): ${formatCurrency(totalWages * 0.115)}

Revenue by Support Category:
${catLines || '  No category data available'}`;
  }, [invoices, shifts]);

  const sendMessage = async (questionText?: string) => {
    const text = questionText || input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'You need to be logged in to use the accounting assistant. Please refresh the page and log in again.',
          timestamp: new Date(),
        }]);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/accounting-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: text,
          context: financialContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #2D5A3D 0%, #3D7A50 100%)' }}
        title="Accounting Assistant"
      >
        <MessageCircle size={24} className="text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
          <Sparkles size={10} className="text-amber-800" />
        </span>
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl shadow-xl overflow-hidden cursor-pointer"
        style={{ backgroundColor: '#2D5A3D' }}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-white" />
            <span className="text-sm font-medium text-white">Accounting Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
      style={{ backgroundColor: '#FDF8F0' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ background: 'linear-gradient(135deg, #2D5A3D 0%, #3D7A50 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Accounting Assistant</h3>
            <p className="text-xs text-white/70">NDIS & BAS specialist</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={() => { setIsOpen(false); setIsMinimized(false); }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2.5',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* Avatar */}
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
              msg.role === 'user' ? 'bg-forest' : 'bg-white border border-gray-200'
            )}
              style={msg.role === 'assistant' ? { backgroundColor: '#7A9E7E' } : undefined}
            >
              {msg.role === 'user'
                ? <User size={14} className="text-white" />
                : <Bot size={14} className="text-white" />
              }
            </div>

            {/* Message bubble */}
            <div className={cn(
              'max-w-[85%] rounded-2xl px-4 py-3',
              msg.role === 'user'
                ? 'bg-forest text-white rounded-tr-md'
                : 'bg-white border border-gray-200 text-charcoal rounded-tl-md shadow-sm'
            )}
              style={msg.role === 'user' ? { backgroundColor: '#2D5A3D' } : undefined}
            >
              {msg.role === 'assistant' ? (
                <div className="text-sm text-charcoal">{renderMarkdown(msg.content)}</div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className={cn(
                'text-[10px] mt-1.5',
                msg.role === 'user' ? 'text-white/60 text-right' : 'text-mid-gray'
              )}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#7A9E7E' }}
            >
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-forest" />
                <span className="text-sm text-mid-gray">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions (only show when few messages) */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-4 pb-2 shrink-0">
          <p className="text-xs font-medium text-mid-gray mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-charcoal hover:border-forest hover:text-forest transition-colors bg-white"
              >
                {q.length > 40 ? q.slice(0, 40) + '...' : q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 shrink-0 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about GST, BAS, NDIS accounting..."
            rows={1}
            className="flex-1 resize-none text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:border-forest focus:ring-1 focus:ring-forest/20 focus:outline-none placeholder:text-mid-gray/60"
            style={{ minHeight: '40px', maxHeight: '100px' }}
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className={cn(
              'p-2.5 rounded-xl transition-all shrink-0',
              input.trim() && !isLoading
                ? 'bg-forest text-white hover:bg-forest/90 active:scale-95'
                : 'bg-gray-100 text-mid-gray cursor-not-allowed'
            )}
            style={input.trim() && !isLoading ? { backgroundColor: '#2D5A3D' } : undefined}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-mid-gray/60 mt-1.5 text-center">
          AI responses are informational only. Always verify with your accountant.
        </p>
      </div>
    </div>
  );
}
