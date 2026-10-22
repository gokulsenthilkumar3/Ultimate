import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Search, Filter } from 'lucide-react';
import { useFamilyStore, selectMembers } from '../store/familyStore';
import { MemberCard } from '../components/profile/MemberCard';
import { AddMemberModal } from '../components/profile/AddMemberModal';
import apiClient from '../api/client';
import type { Member } from '../types/family';

export const MembersPage: React.FC = () => {
  const activeTree = useFamilyStore((s) => s.activeTree);
  const setMembers = useFamilyStore((s) => s.setMembers);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterGeneration, setFilterGeneration] = useState('');

  const { isLoading } = useQuery({
    queryKey: ['members', activeTree?.id],
    queryFn: async () => {
      if (!activeTree) return [];
      const res = await apiClient.get(`/members?treeId=${activeTree.id}`);
      setMembers(res.data);
      return res.data;
    },
    enabled: !!activeTree,
  });

  const members = useFamilyStore(selectMembers);

  const filtered = members.filter((m: Member) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = !filterGender || m.gender === filterGender;
    return matchesSearch && matchesGender;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Members</h1>
          <p className="text-gray-500 text-sm mt-1">{members.length} members in this tree</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-saffron)] text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
        >
          <UserPlus size={18} />
          <span>Add Member</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm bg-transparent"
            aria-label="Search members"
          />
        </div>

        <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Filter size={16} className="text-gray-400" />
          <label htmlFor="filter-gender" className="sr-only">Filter by gender</label>
          <select
            id="filter-gender"
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="outline-none text-sm bg-transparent"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Filter size={16} className="text-gray-400" />
          <label htmlFor="filter-generation" className="sr-only">Filter by generation</label>
          <select
            id="filter-generation"
            value={filterGeneration}
            onChange={(e) => setFilterGeneration(e.target.value)}
            className="outline-none text-sm bg-transparent"
          >
            <option value="">All Generations</option>
            <option value="1">1st Generation</option>
            <option value="2">2nd Generation</option>
            <option value="3">3rd Generation</option>
          </select>
        </div>
      </div>

      {/* Members Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">No members found</p>
          <p className="text-gray-300 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((member: Member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}

      <AddMemberModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};
