import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useFamilyStore, selectMembers } from '../../store/familyStore';
import { useUIStore } from '../../store/uiStore';
import apiClient from '../../api/client';
import type { Member } from '../../types/family';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose }) => {
  const activeTree = useFamilyStore((s) => s.activeTree);
  const members = useFamilyStore(selectMembers);
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    type: 'life_event',
    memberId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTree) return;
    setLoading(true);
    try {
      await apiClient.post('/timeline', {
        ...formData,
        treeId: activeTree.id,
        date: new Date(formData.date).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['timeline', activeTree.id] });
      addToast({ type: 'success', message: 'Event added successfully!' });
      onClose();
      setFormData({ title: '', description: '', date: '', type: 'life_event', memberId: '' });
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to add event.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Timeline Event" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            id="event-title"
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Wedding ceremony"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[var(--color-saffron)] focus:border-[var(--color-saffron)]"
          />
        </div>

        <div>
          <label htmlFor="event-date" className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            id="event-date"
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[var(--color-saffron)] focus:border-[var(--color-saffron)]"
          />
        </div>

        <div>
          <label htmlFor="event-type" className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
          <select
            id="event-type"
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[var(--color-saffron)] focus:border-[var(--color-saffron)]"
          >
            <option value="life_event">Life Event</option>
            <option value="birth">Birth</option>
            <option value="death">Death</option>
            <option value="marriage">Marriage</option>
            <option value="migration">Migration</option>
            <option value="achievement">Achievement</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="event-member" className="block text-sm font-medium text-gray-700 mb-1">Related Member (Optional)</label>
          <select
            id="event-member"
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

        <div>
          <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            id="event-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe this event..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[var(--color-saffron)] focus:border-[var(--color-saffron)]"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Event'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
