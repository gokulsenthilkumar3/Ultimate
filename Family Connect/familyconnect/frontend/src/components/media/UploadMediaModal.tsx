import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useFamilyStore, selectMembers } from '../../store/familyStore';
import { useUIStore } from '../../store/uiStore';
import apiClient from '../../api/client';
import type { DocumentType, Member } from '../../types/family';

interface UploadMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadMediaModal: React.FC<UploadMediaModalProps> = ({ isOpen, onClose }) => {
  const activeTree = useFamilyStore((s) => s.activeTree);
  const members = useFamilyStore(selectMembers);
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    type: 'photo' as DocumentType,
    memberId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !activeTree) return;
    setLoading(true);
    const submitData = new FormData();
    submitData.append('file', file);
    submitData.append('treeId', activeTree.id);
    submitData.append('type', formData.type);
    if (formData.memberId) submitData.append('memberId', formData.memberId);
    try {
      await apiClient.post('/documents', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['documents', activeTree.id] });
      if (formData.memberId && formData.type === 'photo') {
        queryClient.invalidateQueries({ queryKey: ['members', activeTree.id] });
        queryClient.invalidateQueries({ queryKey: ['tree', activeTree.id] });
      }
      addToast({ type: 'success', message: 'Media uploaded successfully!' });
      onClose();
      setFile(null);
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to upload media. Ensure it is less than 10MB.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Media" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="upload-file" className="block text-sm font-medium text-gray-700 mb-1">Select File *</label>
          <input
            id="upload-file"
            type="file"
            required
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label htmlFor="media-type" className="block text-sm font-medium text-gray-700 mb-1">Media Type *</label>
          <select
            id="media-type"
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as DocumentType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[var(--color-saffron)] focus:border-[var(--color-saffron)]"
          >
            <option value="photo">Photo</option>
            <option value="birth_certificate">Birth Certificate</option>
            <option value="marriage_certificate">Marriage Certificate</option>
            <option value="passport">Passport</option>
            <option value="property_deed">Property Deed</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="tag-member" className="block text-sm font-medium text-gray-700 mb-1">Tag Family Member (Optional)</label>
          <select
            id="tag-member"
            value={formData.memberId}
            onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm"
          >
            <option value="">-- No specific member --</option>
            {members.map((member: Member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading || !file}>
            {loading ? 'Uploading...' : 'Upload Media'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
