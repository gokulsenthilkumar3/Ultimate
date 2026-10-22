import React from 'react';
import { Modal } from '../common/Modal';
import { MemberForm } from './MemberForm';
import { useFamilyStore } from '../../store/familyStore';
import { useUIStore } from '../../store/uiStore';
import apiClient from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose }) => {
  const { addMember, activeTree } = useFamilyStore();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

  const handleSubmit = async (data: any) => {
    try {
      const payload = {
        treeId: activeTree?.id,
        name: data.name,
        gender: data.gender,
        birthDate: data.birthDate,
        birthLocation: data.birthLocation,
        deathDate: data.deathDate,
        bio: data.bio,
      };

      const response = await apiClient.post('/members', payload);
      
      // Optimistically update the store
      addMember(response.data);
      
      // Tell React Query to refetch the tree data in the background
      if (activeTree?.id) {
        queryClient.invalidateQueries({ queryKey: ['tree', activeTree.id] });
      }

      // Note: If relationshipToRoot is selected, we would also create a Relationship entry here
      
      addToast({
        type: 'success',
        message: `${data.name} was added to the family tree.`
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to add member:', error);
      addToast({
        type: 'error',
        message: `Failed to add ${data.name}. Please try again.`
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Family Member"
      maxWidth="lg"
    >
      <MemberForm onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  );
};
