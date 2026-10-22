import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import { useUIStore } from '../store/uiStore';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const addToast = useUIStore(state => state.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    setLoading(true);
    try {
      if (isLogin) {
        const response = await apiClient.post('/auth/login', { email, password });
        login(response.data.user, response.data.token);
      } else {
        const response = await apiClient.post('/auth/register', { email, password, name });
        login(response.data.user, response.data.token);
      }
      
      addToast({
        message: 'Successfully authenticated',
        type: 'success'
      });
      navigate('/dashboard');
    } catch (error: any) {
      addToast({
        message: error.response?.data?.error || 'Authentication Failed: An error occurred during authentication',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <span className="text-4xl mb-2 block">🌳</span>
          <h2 className="text-3xl font-extrabold text-[var(--color-navy)]">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="font-medium text-[var(--color-saffron)] hover:text-[#e65c2b]"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input 
                id="name" 
                name="name"
                type="text" 
                required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[var(--color-saffron)] focus:border-[var(--color-saffron)]"
              />
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input 
              id="email" 
              name="email"
              type="email" 
              required 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[var(--color-saffron)] focus:border-[var(--color-saffron)]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              id="password" 
              name="password"
              type="password" 
              required 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[var(--color-saffron)] focus:border-[var(--color-saffron)]"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </Button>
        </form>
      </div>
    </div>
  );
};
