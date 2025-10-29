import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Stethoscope, Activity } from 'lucide-react';

export function Auth() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'doctor' | 'intern'>('doctor');
  const [department, setDepartment] = useState('cardiology');
  const [error, setError] = useState('');
  const [debugMsg, setDebugMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName, role, department);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const message = err?.message || err?.error?.message || JSON.stringify(err);
      setError(message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function testSupabaseConnection() {
    setDebugMsg(null);
    try {
      // quick read to validate DB connectivity and permissions
      const { data, error } = await (await import('../lib/supabase')).supabase
        .from('patients')
        .select('id')
        .limit(1);
      if (error) throw error;
      setDebugMsg(`Supabase reachable. Found ${Array.isArray(data) ? data.length : 0} rows in patients table.`);
    } catch (err: any) {
      console.error('Supabase connectivity test failed:', err);
      setDebugMsg(`Supabase test failed: ${err?.message || JSON.stringify(err)}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                <Heart className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center mb-2">
              AI-Powered Patient Management
            </h1>
            <p className="text-center text-blue-100">
              Secure Healthcare System
            </p>
          </div>

          <div className="p-8">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                  isLogin
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                  !isLogin
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dr. John Smith"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'doctor' | 'intern')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="doctor">Doctor</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDepartment('cardiology')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          department === 'cardiology'
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <Heart className={`w-6 h-6 mx-auto mb-1 ${department === 'cardiology' ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className="text-xs font-medium">Cardiology</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepartment('oncology')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          department === 'oncology'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <Activity className={`w-6 h-6 mx-auto mb-1 ${department === 'oncology' ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="text-xs font-medium">Oncology</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepartment('surgery')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          department === 'surgery'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <Stethoscope className={`w-6 h-6 mx-auto mb-1 ${department === 'surgery' ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span className="text-xs font-medium">Surgery</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="mt-3">
                <button
                  type="button"
                  onClick={testSupabaseConnection}
                  className="w-full border border-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition"
                >
                  Test Supabase Connection
                </button>
                {debugMsg && (
                  <div className="mt-2 p-2 bg-gray-50 text-sm text-gray-700 rounded">{debugMsg}</div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
