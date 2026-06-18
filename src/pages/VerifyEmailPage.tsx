import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react';

export function VerifyEmailPage() {
  const { navigate } = useApp();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace('#', '') || window.location.search);
    const token = params.get('token');
    const email = params.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new verification email.');
      return;
    }

    verifyEmail(token, email);
  }, []);

  async function verifyEmail(token: string, email: string) {
    try {
      // Get the user by email
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

      if (listError || !users) {
        setStatus('error');
        setMessage('Failed to verify email. Please try again later.');
        return;
      }

      const user = users.find(u => u.email === email);
      if (!user) {
        setStatus('error');
        setMessage('Account not found. Please register again.');
        return;
      }

      const metadata = user.user_metadata || {};
      const storedToken = metadata.email_verification_token;
      const expiresAt = metadata.email_verification_expires;

      // Check if token matches
      if (storedToken !== token) {
        setStatus('error');
        setMessage('Invalid verification token. Please request a new verification email.');
        return;
      }

      // Check if token expired
      if (expiresAt && new Date(expiresAt) < new Date()) {
        setStatus('expired');
        setMessage('Verification link has expired. Please request a new one.');
        return;
      }

      // Already verified?
      if (metadata.email_verified) {
        setStatus('success');
        setMessage('Your email is already verified!');
        return;
      }

      // Mark as verified
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...metadata,
          email_verified: true,
          email_verification_token: null,
          email_verification_expires: null,
        },
      });

      if (updateError) {
        setStatus('error');
        setMessage('Failed to verify email. Please try again later.');
        return;
      }

      setStatus('success');
      setMessage('Your email has been verified successfully! You can now log in to your account.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An unexpected error occurred.');
    }
  }

  async function resendVerification() {
    const params = new URLSearchParams(window.location.hash.replace('#', '') || window.location.search);
    const email = params.get('email');

    if (!email) {
      setMessage('Email not found. Please try logging in again.');
      return;
    }

    setStatus('loading');
    setMessage('Sending new verification email...');

    try {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const user = users?.find(u => u.email === email);

      if (!user) {
        setStatus('error');
        setMessage('Account not found.');
        return;
      }

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
    } catch (err) {
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
            status === 'success' ? 'bg-green-100' :
            'bg-red-100'
          }`}>
            {status === 'loading' && <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}
            {status === 'success' && <CheckCircle className="w-8 h-8 text-green-500" />}
            {(status === 'error' || status === 'expired') && <XCircle className="w-8 h-8 text-red-500" />}
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2 font-['Space_Grotesk']">
            {status === 'loading' ? 'Verifying Email...' :
             status === 'success' ? 'Email Verified!' :
             status === 'expired' ? 'Link Expired' : 'Verification Failed'}
          </h1>

          <p className="text-sm text-gray-600 mb-6">{message}</p>

          {status === 'success' && (
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
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                <Mail className="w-4 h-4" /> Resend Verification Email
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
