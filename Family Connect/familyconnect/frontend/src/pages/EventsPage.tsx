import React from 'react';
import { Plus, MapPin } from 'lucide-react';
import { useFamilyStore, selectMembers } from '../store/familyStore';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { format } from 'date-fns';
import { getUpcomingBirthdays } from '../utils/events';
import { motion } from 'framer-motion';

// Container variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
} as const;

// Item variants for individual cards
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
} as const;

export const EventsPage: React.FC = () => {
  const members = useFamilyStore(selectMembers);
  
  const allEvents = getUpcomingBirthdays(members);
  


  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">Upcoming birthdays, anniversaries, and gatherings.</p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={18} />}>
          Add Event
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white p-6 md:p-8">
          <motion.div 
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {allEvents.length === 0 ? (
              <motion.div variants={itemVariants} className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-500 font-medium">No upcoming events found.</p>
                <p className="text-sm text-gray-400 mt-2">Add birth dates to family members to see their birthdays here!</p>
              </motion.div>
            ) : (
              allEvents.map((event, index) => {
              const date = new Date(event.date);
              return (
                <motion.div variants={itemVariants} key={event.id} className="flex space-x-6 relative group">
                  {/* Vertical connector line */}
                  {index !== allEvents.length - 1 && (
                    <div className="absolute top-14 left-7 -ml-px h-full w-0.5 bg-gray-200 group-hover:bg-[var(--color-saffron)] transition-colors duration-300" />
                  )}
                  
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-gray-50 to-white rounded-2xl flex flex-col items-center justify-center border border-gray-200 shadow-sm z-10 group-hover:scale-110 group-hover:border-[var(--color-saffron)] group-hover:shadow-md transition-all duration-300">
                    <span className="text-[10px] font-bold text-[var(--color-saffron)] uppercase tracking-wider">
                      {format(date, 'MMM')}
                    </span>
                    <span className="text-xl font-black text-gray-900 leading-none mt-0.5">
                      {format(date, 'd')}
                    </span>
                  </div>
                  
                  {/* Event Content Card */}
                  <div className="flex-1 pt-1 pb-6">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                        <Badge type={event.type as any} />
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{event.description}</p>
                      )}
                      
                      {event.location && (
                        <div className="flex items-center text-xs font-medium text-gray-500 mt-3 bg-gray-50 inline-flex px-2 py-1 rounded-md border border-gray-100">
                          <MapPin size={12} className="mr-1 text-[var(--color-saffron)]" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
              })
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
