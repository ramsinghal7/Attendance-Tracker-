'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, BookOpen, Calendar,
  ClipboardList, FlaskConical, LogOut,
  GraduationCap,
} from 'lucide-react'

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
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-56 h-screen sticky top-0 flex-shrink-0"
        style={{
          background: 'rgba(8,12,20,0.95)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile bottom navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom"
        style={{
          background: 'rgba(6,9,16,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl min-w-0 transition-all duration-200 relative"
              >
                {active && (
                  <motion.div
                    layoutId="bottomNavActive"
                    className="absolute -top-1 w-6 h-0.5 rounded-full bg-green-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: active ? '#4ade80' : '#475569' }}
                />
                <span
                  className="text-[10px] font-medium leading-tight"
                  style={{ color: active ? '#4ade80' : '#475569' }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}