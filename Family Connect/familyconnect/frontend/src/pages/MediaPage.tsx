import React, { useState, useMemo } from 'react';
import { Upload, Image as ImageIcon, FileText } from 'lucide-react';
import { useFamilyStore, selectMembers, selectDocuments } from '../store/familyStore';
import { Button } from '../components/common/Button';
import { UploadMediaModal } from '../components/media/UploadMediaModal';
import { MediaLightboxModal } from '../components/media/MediaLightboxModal';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
} as const;

export const MediaPage: React.FC = () => {
  const documents = useFamilyStore(selectDocuments);
  const members = useFamilyStore(selectMembers);
  const currentUserRole = useFamilyStore((s) => s.currentUserRole);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  
  // Lightbox State
  const [lightboxData, setLightboxData] = useState<{isOpen: boolean, url: string, type: string, name: string}>({
    isOpen: false,
    url: '',
    type: '',
    name: ''
  });

  const filteredDocs = useMemo(() => {
    if (filterType === 'all') return documents;
    return documents.filter(doc => {
      if (filterType === 'photos') return doc.type === 'photo';
      if (filterType === 'documents') return doc.type !== 'photo';
      return true;
    });
  }, [documents, filterType]);

  const getMemberName = (id?: string) => {
    if (!id) return null;
    const member = members.find(m => m.id === id);
    return member ? member.name : null;
  };

  // Helper to resolve image URL
  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    // Assuming backend is running on 3000 locally
    return `${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}${url}`;
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Media & Memories</h1>
          <p className="text-gray-500 text-sm mt-1">
            Preserve your family's precious photos, certificates, and historical documents.
          </p>
        </div>
        {currentUserRole !== 'viewer' && (
          <Button 
            variant="primary" 
            leftIcon={<Upload size={18} />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Media
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filterType === 'all' ? 'bg-[var(--color-navy)] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All Media
        </button>
        <button
          onClick={() => setFilterType('photos')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filterType === 'photos' ? 'bg-[var(--color-navy)] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Photos Only
        </button>
        <button
          onClick={() => setFilterType('documents')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filterType === 'documents' ? 'bg-[var(--color-navy)] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Certificates & Documents
        </button>
      </div>

      {filteredDocs.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="flex space-x-4 mb-4 text-gray-300">
            <ImageIcon size={48} />
            <FileText size={48} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No media found</h3>
          <p className="text-gray-500 max-w-sm text-center mt-2 mb-6">
            Upload photos, birth certificates, or family recipes to start building your gallery.
          </p>
          {currentUserRole !== 'viewer' && (
            <Button variant="primary" onClick={() => setIsUploadModalOpen(true)}>
              Upload First Item
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div 
          className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {filteredDocs.map((doc) => (
            <motion.div 
              variants={itemVariants}
              key={doc.id} 
              className="break-inside-avoid bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setLightboxData({
                isOpen: true,
                url: getImageUrl(doc.fileUrl),
                type: doc.type,
                name: doc.fileName
              })}
            >
              {doc.type === 'photo' ? (
                <div className="relative">
                  <img 
                    src={getImageUrl(doc.fileUrl)} 
                    alt={doc.fileName} 
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors shadow-lg">
                      View Full
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-gray-50 flex flex-col items-center justify-center border-b border-gray-100 text-gray-400 group-hover:text-[var(--color-saffron)] transition-colors">
                  <FileText size={48} className="mb-2" />
                  <span className="text-sm font-medium uppercase tracking-wider">{doc.type.replace('_', ' ')}</span>
                </div>
              )}
              
              <div className="p-4 bg-gradient-to-br from-white to-gray-50/50">
                <p className="text-sm font-medium text-gray-900 truncate" title={doc.fileName}>
                  {doc.fileName}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                  </p>
                  {doc.memberId && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 truncate max-w-[100px]" title={getMemberName(doc.memberId) || ''}>
                      {getMemberName(doc.memberId)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <UploadMediaModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />

      <MediaLightboxModal
        isOpen={lightboxData.isOpen}
        onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
        mediaUrl={lightboxData.url}
        mediaType={lightboxData.type}
        mediaName={lightboxData.name}
      />
    </div>
  );
};
