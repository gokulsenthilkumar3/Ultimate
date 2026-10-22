import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Network, Users, Shield, CalendarHeart } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] font-sans">
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-3xl mr-2">🌳</span>
          <span className="text-xl font-bold text-[var(--color-navy)]">FamilyConnect</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/auth" className="text-gray-600 hover:text-[var(--color-saffron)] font-medium">Log in</Link>
          <Link to="/auth">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        <h1 className="text-5xl lg:text-7xl font-extrabold text-[var(--color-navy)] tracking-tight max-w-4xl text-balance">
          One place for all your <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-saffron)] to-rose-500">
            family stories & memories
          </span>
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-2xl text-balance">
          Celebrate your heritage, map out multi-generational connections, and build a beautiful, interactive family tree that lives forever.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link to="/auth">
            <Button variant="primary" size="lg" className="px-8 py-4 text-lg">
              Create Your Free Tree
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="secondary" size="lg" className="px-8 py-4 text-lg bg-white">
              View Demo
            </Button>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-white py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[var(--color-navy)] mb-16">
            Everything you need to preserve your legacy
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                <Network size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Interactive Trees</h3>
              <p className="text-gray-600">Infinite zoom canvas to map out connections across generations effortlessly.</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Cultural Labels</h3>
              <p className="text-gray-600">Custom relationships that honor Indian family values like "Dadi" or "Bade Papa".</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                <Shield size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Privacy First</h3>
              <p className="text-gray-600">Granular access controls. Your family's data remains entirely yours.</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
                <CalendarHeart size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Smart Calendar</h3>
              <p className="text-gray-600">Never miss a birthday, anniversary, or festival with automated reminders.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
