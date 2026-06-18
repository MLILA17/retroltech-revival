import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react';

export function VerifyEmailPage() {
  const { navigate } = useApp();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'already_verified'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Parse URL parameters from hash or query string
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(hash || window.location.search);
    const token = params.get('token');
    const emailParam = params.get('email');

    if (!token || !emailParam) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new verification email.');
      return;
    }

    setEmail(emailParam);
    verifyEmail(token, emailParam);
  }, []);

  async function verifyEmail(token: string, email: string) {
    try {
      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: { token, email },
      });

      if (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Failed to verify email. Please try again later.');
        return;
      }

      if (data.status === 'already_verified') {
        setStatus('already_verified');
        setMessage('Your email is already verified!');
        return;
      }

      if (data.status === 'expired') {
        setStatus('expired');
        setMessage('Verification link has expired. Please request a new one.');
        return;
      }

      if (data.status === 'invalid_token') {
        setStatus('error');
        setMessage('Invalid verification token. Please request a new verification email.');
        return;
      }

      if (data.success) {
        setStatus('success');
        setMessage('Your email has been verified successfully! You can now log in to your account.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Verification exception:', err);
      setStatus('error');
      setMessage(err.message || 'An unexpected error occurred.');
    }
  }

  async function resendVerification() {
    if (!email) {
      setMessage('Email not found. Please try logging in again.');
      return;
    }

    setStatus('loading');
    setMessage('Sending new verification email...');

    try {
      // First get the user by email from our system
      const { data: { user } } = await supabase.auth.getUser();

      // If user is logged in, use their ID
      if (user) {
        const { error } = await supabase.functions.invoke('send-verification-email', {
          body: { email, userId: user.id },
        });

        if (error) {
          setStatus('error');
          setMessage('Failed to send verification email. Please try again.');
          return;
        }

        setStatus('success');
        setMessage('A new verification email has been sent. Please check your inbox.');
      } else {
        // User not logged in - ask them to login first or register again
        setStatus('error');
        setMessage('Please log in to request a new verification email.');
      }
    } catch (err) {
      console.error('Resend error:', err);
      setStatus('error');
      setMessage('Failed to send verification email.');
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate({ name: 'home' })}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-green-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
            status === 'loading' ? 'bg-blue-100' :
            status === 'success' || status === 'already_verified' ? 'bg-green-100' :
            'bg-red-100'
          }`}>
            {status === 'loading' && <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}
            {(status === 'success' || status === 'already_verified') && <CheckCircle className="w-8 h-8 text-green-500" />}
            {(status === 'error' || status === 'expired') && <XCircle className="w-8 h-8 text-red-500" />}
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2 font-['Space_Grotesk']">
            {status === 'loading' ? 'Verifying Email...' :
             status === 'success' ? 'Email Verified!' :
             status === 'already_verified' ? 'Already Verified' :
             status === 'expired' ? 'Link Expired' : 'Verification Failed'}
          </h1>

          <p className="text-sm text-gray-600 mb-6">{message}</p>

          {(status === 'success' || status === 'already_verified') && (
            <button
              onClick={() => navigate({ name: 'auth' })}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Continue to Login
            </button>
          )}

          {(status === 'error' || status === 'expired') && (
            <div className="space-y-3">
              <button
                onClick={resendVerification}
                disabled={status === 'loading'}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" /> Resend Verification Email
                  </>
                )}
              </button>
              <button
                onClick={() => navigate({ name: 'auth' })}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
