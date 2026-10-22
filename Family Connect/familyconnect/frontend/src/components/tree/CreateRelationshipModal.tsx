import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useFamilyStore, selectMembers } from '../../store/familyStore';
import { useUIStore } from '../../store/uiStore';
import apiClient from '../../api/client';
import type { RelationshipType, Member } from '../../types/family';

interface CreateRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceId: string | null;
  targetId: string | null;
}

export const CreateRelationshipModal: React.FC<CreateRelationshipModalProps> = ({
  isOpen,
  onClose,
  sourceId,
  targetId,
}) => {
  const members = useFamilyStore(selectMembers);
  const activeTree = useFamilyStore((s) => s.activeTree);
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  const [type, setType] = useState<RelationshipType>('spouse');
  const [loading, setLoading] = useState(false);

  const sourceMember = members.find((m: Member) => m.id === sourceId);
  const targetMember = members.find((m: Member) => m.id === targetId);

  if (!sourceMember || !targetMember) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.post('/relationships', {
        treeId: activeTree?.id,
        member1Id: sourceId,
        member2Id: targetId,
        type: type,
      });

      if (activeTree?.id) {
        queryClient.invalidateQueries({ queryKey: ['tree', activeTree.id] });
      }

      addToast({
        type: 'success',
        message: 'Relationship created successfully',
      });
      onClose();
    } catch (error) {
      console.error('Failed to create relationship:', error);
      addToast({
        type: 'error',
        message: 'Failed to create relationship',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Relationship" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            How is <span className="font-bold text-[var(--color-navy)]">{sourceMember.name}</span> related to <span className="font-bold text-[var(--color-navy)]">{targetMember.name}</span>?
          </p>
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RelationshipType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[var(--color-saffron)] focus:border-[var(--color-saffron)]"
          >
            <option value="parent">Parent</option>
            <option value="child">Child</option>
            <option value="spouse">Spouse</option>
            <option value="sibling">Sibling</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            ({sourceMember.name} is the {type} of {targetMember.name})
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
