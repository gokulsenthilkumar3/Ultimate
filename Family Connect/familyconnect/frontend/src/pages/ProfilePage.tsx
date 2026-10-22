import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Briefcase, Mail, Phone, Calendar, FileText, Image as ImageIcon } from 'lucide-react';
import { useFamilyStore, selectMembers, selectDocuments } from '../store/familyStore';
import { useFamilyData } from '../hooks/useFamilyData';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';
import { GenerateBioModal } from '../components/profile/GenerateBioModal';
import { Sparkles } from 'lucide-react';
import apiClient from '../api/client';
import type { Member, FamilyDocument } from '../types/family';

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const members = useFamilyStore(selectMembers);
  const documents = useFamilyStore(selectDocuments);
  const updateMember = useFamilyStore((s) => s.updateMember);
  const currentUserRole = useFamilyStore((s) => s.currentUserRole);
  const { isLoading } = useFamilyData();
  const [isBioModalOpen, setIsBioModalOpen] = React.useState(false);
  
  const member = members.find((m: Member) => m.id === id);
  const memberDocs = documents.filter((doc: FamilyDocument) => doc.memberId === id);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading member profile...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Member Not Found</h2>
          <Button variant="tertiary" className="mt-4" onClick={() => navigate('/members')}>
            Return to Directory
          </Button>
        </div>
      </div>
    );
  }

  const handleBioGenerated = async (newBio: string) => {
    try {
      await apiClient.put(`/members/${member.id}`, { bio: newBio });
      updateMember(member.id, { bio: newBio });
    } catch (err) {
      console.error('Failed to save generated bio', err);
      alert('Failed to save generated bio. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Button 
        variant="tertiary" 
        leftIcon={<ArrowLeft size={16} />} 
        onClick={() => navigate('/members')}
        className="-ml-4 mb-2"
      >
        Back to Directory
      </Button>

      {/* Hero Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-48 bg-gradient-to-r from-[var(--color-navy)] to-[var(--color-saffron)] opacity-90 relative">
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
        
        <div className="px-8 pb-8 relative">
          <div className="flex justify-between items-end -mt-16 mb-4">
            <div className="p-1 bg-white rounded-full">
              <Avatar src={member.photoUrl} name={member.name} size="2xl" />
            </div>
            <div className="flex space-x-3">
              <Button variant="secondary">Edit Profile</Button>
            </div>
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{member.name}</h1>
            <p className="text-gray-500 capitalize mt-1">
              {member.relationshipToRoot || 'Family Member'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-6">
            {(member.birthDate || member.deathDate) && (
              <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg text-sm">
                <Calendar size={16} className="mr-2 text-gray-400" />
                {member.birthDate ? new Date(member.birthDate).getFullYear() : '?'} - 
                {!member.isAlive && member.deathDate ? new Date(member.deathDate).getFullYear() : 'Present'}
              </div>
            )}
            
            {member.birthLocation && (
              <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg text-sm">
                <MapPin size={16} className="mr-2 text-gray-400" />
                {member.birthLocation}
              </div>
            )}
            
            {member.occupation && (
              <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg text-sm">
                <Briefcase size={16} className="mr-2 text-gray-400" />
                {member.occupation}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (About & Details) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">About</h2>
              {currentUserRole !== 'viewer' && (
                <Button 
                  variant="tertiary" 
                  size="sm" 
                  className="text-purple-600 hover:bg-purple-50"
                  leftIcon={<Sparkles size={16} />}
                  onClick={() => setIsBioModalOpen(true)}
                >
                  Generate AI Bio
                </Button>
              )}
            </div>
            
            {member.bio ? (
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{member.bio}</p>
            ) : (
              <p className="text-gray-400 italic">No bio added yet.</p>
            )}
          </div>
        </div>
        
        {/* Right Column (Contact & Meta) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Info</h2>
            <div className="space-y-3">
              {member.phone ? (
                <div className="flex items-center text-gray-600 text-sm">
                  <Phone size={16} className="mr-3 text-gray-400" />
                  {member.phone}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No phone number</p>
              )}
              {member.email && (
                <div className="flex items-center text-gray-600 text-sm">
                  <Mail size={16} className="mr-3 text-gray-400" />
                  {member.email}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Media & Documents */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <ImageIcon size={20} className="mr-2 text-[var(--color-saffron)]" />
            Media & Documents
          </h2>
        </div>
        
        <div className="p-6">
          {memberDocs.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No media uploaded for this member yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {memberDocs.map((doc: FamilyDocument) => (
                <div key={doc.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                  {doc.type === 'photo' ? (
                    <img 
                      src={`${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}${doc.fileUrl}`}
                      alt={doc.fileName}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                      <FileText size={32} className="mb-2" />
                      <span className="text-[10px] uppercase font-bold text-center px-2">{doc.type.replace('_', ' ')}</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate" title={doc.fileName}>{doc.fileName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isBioModalOpen && (
        <GenerateBioModal
          isOpen={isBioModalOpen}
          onClose={() => setIsBioModalOpen(false)}
          memberId={member.id}
          onBioGenerated={handleBioGenerated}
        />
      )}
    </div>
  );
};
