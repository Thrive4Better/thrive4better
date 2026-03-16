import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

export default function SlideOver({ open, onClose, title, children, wide }: SlideOverProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-white shadow-xl flex flex-col h-full animate-slide-in ${wide ? 'w-[600px]' : 'w-[480px]'}`}
        style={{ animation: 'slideIn 0.2s ease-out' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-sage-pale">
          <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-sage-pale transition-colors">
            <X size={20} className="text-mid-gray" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
