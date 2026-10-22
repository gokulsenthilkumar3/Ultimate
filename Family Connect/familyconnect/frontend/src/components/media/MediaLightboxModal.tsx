import React, { useEffect } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: string;
  mediaName: string;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({ 
  isOpen, 
  onClose, 
  mediaUrl, 
  mediaType, 
  mediaName 
}) => {

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = mediaName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            className="relative w-full max-w-5xl max-h-[90vh] flex flex-col items-center justify-center pointer-events-none"
          >
            {/* Toolbar */}
            <div className="absolute top-0 right-0 p-4 flex space-x-4 pointer-events-auto z-10">
              <button 
                onClick={handleDownload}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
                title="Download"
              >
                <Download size={24} />
              </button>
              <button 
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
                title="Close (Esc)"
              >
                <X size={24} />
              </button>
            </div>

            {/* Media Content */}
            <div className="w-full max-h-[85vh] flex items-center justify-center overflow-hidden pointer-events-auto">
              {mediaType === 'photo' ? (
                <img 
                  src={mediaUrl} 
                  alt={mediaName} 
                  className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <div className="bg-white p-12 rounded-2xl flex flex-col items-center shadow-2xl w-full max-w-md">
                  <FileText size={80} className="text-[var(--color-navy)] mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{mediaName}</h3>
                  <p className="text-gray-500 text-sm mb-8 text-center">
                    This document type cannot be previewed in the browser.
                  </p>
                  <button 
                    onClick={handleDownload}
                    className="bg-[var(--color-saffron)] hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-lg transition-colors w-full flex items-center justify-center"
                  >
                    <Download size={18} className="mr-2" /> Download File
                  </button>
                </div>
              )}
            </div>
            
            {mediaType === 'photo' && (
              <div className="absolute bottom-[-40px] left-0 right-0 text-center pointer-events-auto">
                <p className="text-white/80 font-medium">{mediaName}</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
