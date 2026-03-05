'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        toast.success('Welcome back! 👋')
        router.push('/attendance')
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { name: form.name } },
        })
        if (error) throw error
        if (data.user) {
          await supabase.from('users').insert({
            id: data.user.id,
            email: form.email,
            name: form.name,
            attendance_requirement: 80,
          })
        }
        toast.success('Account created! You can now sign in.')
        setIsLogin(true)
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060910] gradient-bg bg-grid flex items-center justify-center p-4">
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            <GraduationCap className="w-8 h-8 text-green-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Smart Attendance</h1>
          <p className="text-slate-500 text-sm mt-1">Track smarter. Score better.</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {['Sign In', 'Sign Up'].map((label, i) => (
              <button
                key={label}
                onClick={() => setIsLogin(i === 0)}
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                style={{
                  background: (i === 0) === isLogin ? 'rgba(74,222,128,0.12)' : 'transparent',
                  color: (i === 0) === isLogin ? '#4ade80' : '#64748b',
                  border: (i === 0) === isLogin ? '1px solid rgba(74,222,128,0.2)' : '1px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <InputField
                icon={<User className="w-4 h-4" />}
                type="text"
                placeholder="Your full name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />
            )}
            <InputField
              icon={<Mail className="w-4 h-4" />}
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              required
            />
            <InputField
              icon={<Lock className="w-4 h-4" />}
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              required
              suffix={
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: 'rgba(74,222,128,0.15)',
                border: '1px solid rgba(74,222,128,0.3)',
                color: loading ? '#6b7280' : '#4ade80',
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-green-400 rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
        <p className="text-center text-slate-600 text-xs mt-6">
          Maintain your 80% — never get detained again.
        </p>
      </motion.div>
    </div>
  )
}

function InputField({ icon, type, placeholder, value, onChange, required, suffix }: {
  icon: React.ReactNode
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  suffix?: React.ReactNode
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <span className="text-slate-500">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
      />
      {suffix}
    </div>
  )
}