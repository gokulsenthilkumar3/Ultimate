import React from 'react';
import { Users, Network, Image as ImageIcon, CalendarDays, Plus } from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { UpcomingEvents } from '../components/dashboard/UpcomingEvents';
import { useFamilyStore, selectMembers, selectRelationships, selectDocuments } from '../store/familyStore';
import { Button } from '../components/common/Button';
import { Link } from 'react-router-dom';
import type { Member } from '../types/family';

export const DashboardPage: React.FC = () => {
  const activeTree = useFamilyStore((s) => s.activeTree);
  const members = useFamilyStore(selectMembers);
  const relationships = useFamilyStore(selectRelationships);
  const documents = useFamilyStore(selectDocuments);

  const stats = [
    {
      title: 'Total Members',
      value: members.length,
      icon: <Users size={24} />,
    },
    {
      title: 'Relationships',
      value: relationships.length,
      icon: <Network size={24} />,
    },
    {
      title: 'Photos & Memories',
      value: documents.length,
      icon: <ImageIcon size={24} />,
    },
    {
      title: 'Upcoming Events',
      value: members.filter((m: Member) => m.birthDate).length, // Number of known birthdays
      icon: <CalendarDays size={24} />,
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to {activeTree?.name || 'Your Family Tree'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening in your family network.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => console.log('Invite')}>
            Invite Family
          </Button>
          <Link to="/tree">
            <Button variant="primary" leftIcon={<Plus size={18} />}>
              Add Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on lg) */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          {/* Quick Tree Preview (Mock) */}
          <div className="bg-gradient-to-br from-[var(--color-navy)] to-blue-900 rounded-xl p-8 text-white relative overflow-hidden shadow-lg h-64 flex flex-col justify-center">
            {/* Background Pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <Network size={400} className="absolute -right-20 -bottom-20 text-white transform -rotate-12" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">Explore Your Roots</h2>
              <p className="text-blue-200 mb-6 max-w-md">
                Your family tree has grown by 15% this year. Discover connections and add new stories to your lineage.
              </p>
              <Link to="/tree">
                <Button variant="primary" className="bg-white text-[var(--color-navy)] hover:bg-gray-100">
                  Open Tree Canvas
                </Button>
              </Link>
            </div>
          </div>

          <ActivityFeed />
        </div>

        {/* Right Column (1/3 width on lg) */}
        <div className="col-span-1 space-y-6">
          <UpcomingEvents />
        </div>
      </div>
    </div>
  );
};
