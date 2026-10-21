'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/packages/ui/components/Button';
import { Input } from '@/packages/ui/components/Input';
import { useToast, ToastContainer } from '@/packages/ui/components/Toast';
import { resetPassword, validateEmail } from '@/packages/utils/firebase-auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const auth = getAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setEmailError('');
    setLoading(true);
    
    try {
      const result = await resetPassword(auth, email);
      
      if (result.success) {
        setEmailSent(true);
        showToast('Password reset email sent! Check your inbox.', 'success');
      } else {
        showToast(result.error || 'Failed to send reset email', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Sign In</span>
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!emailSent ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
                <p className="text-gray-600">
                  No worries! Enter your email and we'll send you reset instructions.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      error={emailError}
                      className="pl-10"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !email}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              {/* Emulator Notice */}
              {auth.app.options.projectId === 'finsync-super-2025' && (
                <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800 text-center">
                    🔧 Emulator Mode: Password reset email mocked
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="inline-block p-3 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
                <p className="text-gray-600 mb-6">
                  We've sent password reset instructions to:
                </p>
                <p className="font-medium text-gray-900 mb-6 bg-gray-50 p-3 rounded-lg">
                  {email}
                </p>
                <p className="text-sm text-gray-600 mb-6">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>
                
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/login')}
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                  
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setEmail('');
                    }}
                    className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Didn't receive the email? Try again
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Help Text */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              <strong>Need help?</strong> Contact our support team at{' '}
              <a href="mailto:support@finsyncsuper.com" className="text-blue-600 hover:text-blue-700">
                support@finsyncsuper.com
              </a>
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 For your security, we'll never ask for your password via email or phone
          </p>
        </div>
      </div>
    </div>
  );
}
