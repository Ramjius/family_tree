'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      router.push('/')
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!name || !email || !password) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: name
          })

        if (profileError) console.log('Profile creation skipped:', profileError.message)

        // Force redirect after successful sign up
        window.location.href = '/'
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Attempting sign in...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('Sign in response:', { data, error })

      if (error) throw error

      if (data.session) {
        console.log('Session created, redirecting...')
        // Force redirect after successful sign in
        window.location.href = '/'
      } else {
        console.log('No session created')
        setError('Sign in failed - no session created')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Users className="w-10 h-10 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-800">Family Tree</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setAuthMode('signin')
              setError('')
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              authMode === 'signin'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setAuthMode('signup')
              setError('')
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              authMode === 'signup'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}>
          {authMode === 'signup' && (
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={authMode === 'signin' ? handleSignIn : handleSignUp}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Preserve your family memories securely
        </p>
      </div>
    </div>
  )
}