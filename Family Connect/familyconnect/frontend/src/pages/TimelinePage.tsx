import React, { useState } from 'react';
import { Plus, Plane, Trophy, Users, Heart, Star, MapPin } from 'lucide-react';
import { useFamilyStore, selectEvents } from '../store/familyStore';
import { Button } from '../components/common/Button';
import { AddEventModal } from '../components/timeline/AddEventModal';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const getEventIcon = (type: string) => {
  switch (type) {
    case 'migration': return <Plane size={20} />;
    case 'achievement': return <Trophy size={20} />;
    case 'marriage': return <Heart size={20} />;
    case 'gathering': return <Users size={20} />;
    default: return <Star size={20} />;
  }
};

const getEventColor = (type: string) => {
  switch (type) {
    case 'migration': return 'bg-blue-100 text-blue-600 border-blue-200';
    case 'achievement': return 'bg-amber-100 text-amber-600 border-amber-200';
    case 'marriage': return 'bg-pink-100 text-pink-600 border-pink-200';
    case 'gathering': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
    default: return 'bg-[var(--color-cream)] text-[var(--color-saffron)] border-[var(--color-saffron)]';
  }
};

export const TimelinePage: React.FC = () => {
  const events = useFamilyStore(selectEvents);
  const currentUserRole = useFamilyStore((s) => s.currentUserRole);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Family Timeline</h1>
          <p className="text-gray-500 text-sm mt-1">
            Chronological journey of your family's milestones and memories.
          </p>
        </div>
        {currentUserRole !== 'viewer' && (
          <Button 
            variant="primary" 
            leftIcon={<Plus size={18} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Milestone
          </Button>
        )}
      </div>

      <div className="relative flex-1">
        {/* The continuous vertical line */}
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gray-200 transform -translate-x-1/2 rounded-full" />

        <div className="space-y-12 py-6">
          {events.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
              <Star size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Your timeline is empty</h3>
              <p className="text-gray-500 max-w-sm text-center mt-2 mb-6">
                Document important births, marriages, and milestones to create a beautiful family history.
              </p>
              {currentUserRole !== 'viewer' && (
                <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                  Add First Milestone
                </Button>
              )}
            </div>
          ) : (
            events.map((event, index) => {
              const dateObj = new Date(event.date);
              const isEven = index % 2 === 0;

              return (
                <motion.div 
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={`relative flex items-center ${isEven ? 'md:flex-row-reverse' : ''}`}
                >
                  {/* Left/Right Card spacer for desktop */}
                  <div className="hidden md:block md:w-1/2" />

                  {/* Icon floating on the line */}
                  <div className="absolute left-8 md:left-1/2 transform -translate-x-1/2 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-white shadow-sm z-10">
                    <div className={`w-full h-full rounded-full flex items-center justify-center border ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="w-full pl-20 md:pl-0 md:w-1/2 flex">
                    <div className={`w-full md:w-[90%] bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow
                      ${isEven ? 'md:mr-auto' : 'md:ml-auto'}
                    `}>
                      <span className="text-sm font-bold text-[var(--color-saffron)] block mb-1">
                        {format(dateObj, 'MMMM d, yyyy')}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                      
                      {event.location && (
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <MapPin size={14} className="mr-1" />
                          {event.location}
                        </div>
                      )}
                      
                      {event.description && (
                        <p className="text-gray-600 leading-relaxed text-sm">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <AddEventModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
