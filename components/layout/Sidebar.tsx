'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, BookOpen, Calendar,
  ClipboardList, FlaskConical, LogOut,
  GraduationCap, Menu, X,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Subjects', href: '/subjects', icon: BookOpen },
  { label: 'Timetable', href: '/timetable', icon: Calendar },
  { label: 'Attendance', href: '/attendance', icon: ClipboardList },
  { label: 'Simulator', href: '/simulator', icon: FlaskConical },
]

export default function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/auth/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-6 px-4">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)' }}
        >
          <GraduationCap className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Attendance</p>
          <p className="text-xs text-slate-500 leading-none mt-0.5">Tracker AI</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ label, href, icon: Icon }, i) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <motion.div
              key={href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 + 0.1 }}
            >
              <Link
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: active ? 'rgba(74,222,128,0.08)' : 'transparent',
                  border: active ? '1px solid rgba(74,222,128,0.15)' : '1px solid transparent',
                  color: active ? '#4ade80' : '#64748b',
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400"
                  />
                )}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      <div
        className="mt-4 p-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-green-400 flex-shrink-0"
            style={{ background: 'rgba(74,222,128,0.1)' }}
          >
            {userName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">{userName || 'Student'}</p>
            <p className="text-xs text-slate-600">80% target</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside
        className="hidden lg:flex flex-col w-56 h-screen sticky top-0 flex-shrink-0"
        style={{
          background: 'rgba(8,12,20,0.95)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <SidebarContent />
      </aside>

      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(6,9,16,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.12)' }}
          >
            <GraduationCap className="w-3.5 h-3.5 text-green-400" />
          </div>
          <span className="text-sm font-bold text-white">Attendance Tracker</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-slate-400"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          className="lg:hidden fixed inset-0 z-40"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-64"
            style={{
              background: 'rgba(8,12,20,0.98)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <SidebarContent />
          </div>
        </motion.div>
      )}
    </>
  )
}