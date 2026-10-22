import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Bell, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useFamilyStore } from '../store/familyStore';
import { useUIStore } from '../store/uiStore';
import apiClient from '../api/client';
import { Button } from '../components/common/Button';
import { motion, AnimatePresence } from 'framer-motion';

export const SettingsPage: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const { activeTree, currentUserRole } = useFamilyStore();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [isInviting, setIsInviting] = useState(false);

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: <User size={18} /> },
    { id: 'access', label: 'Family Access', icon: <Users size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ];

  const { data: accessList, isLoading: isAccessLoading } = useQuery({
    queryKey: ['access', activeTree?.id],
    queryFn: async () => {
      if (!activeTree?.id) return null;
      const response = await apiClient.get(`/trees/${activeTree.id}/access`);
      return response.data;
    },
    enabled: !!activeTree?.id && activeTab === 'access',
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTree?.id || !inviteEmail) return;

    setIsInviting(true);
    try {
      await apiClient.post(`/trees/${activeTree.id}/invite`, {
        email: inviteEmail,
        role: inviteRole
      });
      
      queryClient.invalidateQueries({ queryKey: ['access', activeTree.id] });
      setInviteEmail('');
      addToast({ type: 'success', message: 'User invited successfully!' });
    } catch (error: any) {
      addToast({ 
        type: 'error', 
        message: error.response?.data?.error || 'Failed to invite user' 
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account preferences and tree settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 flex-1">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-[var(--color-navy)] shadow-sm border border-gray-100'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-[var(--color-saffron)]' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Profile Information</h2>
              
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    disabled 
                    value={currentUser?.email || 'user@example.com'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your email is managed by your authentication provider.</p>
                </div>
              </div>
              
              <div className="pt-6 mt-6 border-t border-gray-100">
                <Button variant="secondary" onClick={logout} className="text-red-600 border-red-200 hover:bg-red-50">
                  Log Out
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div 
              key="notifications"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Email Notifications</h2>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-[var(--color-saffron)] rounded border-gray-300 focus:ring-[var(--color-saffron)] transition-all" defaultChecked />
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-[var(--color-saffron)] transition-colors">Upcoming Birthdays</p>
                    <p className="text-xs text-gray-500">Get notified 7 days before a family member's birthday.</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" className="form-checkbox h-5 w-5 text-[var(--color-saffron)] rounded border-gray-300 focus:ring-[var(--color-saffron)] transition-all" defaultChecked />
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-[var(--color-saffron)] transition-colors">Tree Updates</p>
                    <p className="text-xs text-gray-500">When someone adds a new member or photo to your tree.</p>
                  </div>
                </label>
              </div>
              
              <Button variant="primary" className="mt-4">Save Preferences</Button>
            </motion.div>
          )}
          
          {activeTab === 'access' && (
            <motion.div 
              key="access"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Family Access</h2>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Invite a Family Member</h3>
                {currentUserRole === 'admin' ? (
                  <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="email" 
                      required
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-[var(--color-saffron)] focus:border-[var(--color-saffron)]"
                    />
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg w-32 bg-white"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button type="submit" variant="primary" disabled={isInviting}>
                      {isInviting ? 'Sending...' : 'Invite'}
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-gray-500">Only admins can invite new members to this family tree.</p>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Current Access List</h3>
                {isAccessLoading ? (
                  <p className="text-sm text-gray-500">Loading access list...</p>
                ) : (
                  <div className="space-y-3">
                    {accessList?.map((access: any) => (
                      <div key={access.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-white hover:shadow-md transition-shadow">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{access.user.name}</p>
                          <p className="text-xs text-gray-500">{access.user.email}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded uppercase tracking-wider ${
                          access.role === 'admin' ? 'bg-red-100 text-red-700' :
                          access.role === 'editor' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {access.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
