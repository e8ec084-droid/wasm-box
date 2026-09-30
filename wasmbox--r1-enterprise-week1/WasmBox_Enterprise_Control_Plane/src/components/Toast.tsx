import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info' }) => {
  return (
    <div 
      id="app-toast-notification"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-[#E5E5E7] text-xs text-[#1D1D1F] shadow-lg select-none"
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-[#00A651] shrink-0" />
      ) : (
        <Info className="w-4 h-4 text-[#0066FF] shrink-0" />
      )}
      <span className="font-sans font-medium text-xs text-[#1D1D1F]">{message}</span>
    </div>
  );
};
