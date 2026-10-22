import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useFamilyStore } from '../store/familyStore';
import { useAuthStore } from '../store/authStore';
import type { FamilyTree, Member, Relationship, FamilyEvent, FamilyDocument } from '../types/family';

export const useFamilyData = () => {
  const { isAuthenticated } = useAuthStore();
  const { setActiveTree, setCurrentUserRole, setMembers, setRelationships, setEvents, setDocuments } = useFamilyStore();

  const { data: trees, isLoading: isTreesLoading } = useQuery({
    queryKey: ['trees'],
    queryFn: async () => {
      const response = await apiClient.get('/trees');
      return response.data as FamilyTree[];
    },
    enabled: isAuthenticated,
  });

  const activeTreeId = trees?.[0]?.id;

  const { data: treeDetails, isLoading: isTreeDetailsLoading } = useQuery({
    queryKey: ['tree', activeTreeId],
    queryFn: async () => {
      if (!activeTreeId) return null;
      const response = await apiClient.get(`/trees/${activeTreeId}`);
      return response.data as FamilyTree & { 
        members: Member[], 
        relationships: Relationship[],
        currentUserRole: 'viewer' | 'editor' | 'admin' | 'family_head'
      };
    },
    enabled: !!activeTreeId && isAuthenticated,
  });

  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ['events', activeTreeId],
    queryFn: async () => {
      if (!activeTreeId) return null;
      const response = await apiClient.get(`/events/${activeTreeId}`);
      return response.data as FamilyEvent[];
    },
    enabled: !!activeTreeId && isAuthenticated,
  });

  const { data: documents, isLoading: isDocumentsLoading } = useQuery({
    queryKey: ['documents', activeTreeId],
    queryFn: async () => {
      if (!activeTreeId) return null;
      const response = await apiClient.get(`/documents/${activeTreeId}`);
      return response.data as FamilyDocument[];
    },
    enabled: !!activeTreeId && isAuthenticated,
  });

  // Sync with Zustand store
  useEffect(() => {
    if (trees?.[0]) {
      setActiveTree(trees[0]);
    }
    if (treeDetails?.currentUserRole) {
      setCurrentUserRole(treeDetails.currentUserRole);
    }
    if (treeDetails?.members) {
      setMembers(treeDetails.members);
    }
    if (treeDetails?.relationships) {
      setRelationships(treeDetails.relationships);
    }
    if (events) {
      setEvents(events);
    }
    if (documents) {
      setDocuments(documents);
    }
  }, [trees, treeDetails, events, documents, setActiveTree, setCurrentUserRole, setMembers, setRelationships, setEvents, setDocuments]);

  return {
    isLoading: isTreesLoading || isTreeDetailsLoading || isEventsLoading || isDocumentsLoading,
    activeTreeId
  };
};
