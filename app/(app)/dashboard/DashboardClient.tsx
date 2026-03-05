'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BookOpen, Target, Zap, Calendar } from 'lucide-react'
import { SubjectStats, AttendanceRecord } from '@/types'
import { getStatusColor, getStatusBg, getStatusBorder } from '@/lib/attendance'
import Link from 'next/link'
import { format } from 'date-fns'

interface Props {
  stats: SubjectStats[]
  overall: { totalAttended: number; totalClasses: number; percentage: number; status: 'safe' | 'warn' | 'danger' }
  todayClasses: any[]
  records: AttendanceRecord[]
  userName: string
  req: number
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' }
  })
}

export default function DashboardClient({ stats, overall, todayClasses, records, userName, req }: Props) {
  const dangerSubjects = stats.filter(s => s.status === 'danger')
  const todayStr = format(new Date(), 'EEEE, MMM d')

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayRecords = records.filter(r => r.date === dateStr && r.status !== 'cancelled')
    const present = dayRecords.filter(r => r.status === 'present').length
    const total = dayRecords.length
    return {
      day: format(d, 'EEE'),
      present,
      absent: total - present,
    }
  })

  const pieData = stats.map(s => ({
    name: s.subject.subject_name,
    value: s.attended,
    color: s.subject.color,
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Hey, {userName.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 text-sm mt-0.5">{todayStr}</p>
        </div>
        <div
          className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
          style={{
            background: getStatusBg(overall.status),
            border: `1px solid ${getStatusBorder(overall.status)}`,
            color: getStatusColor(overall.status),
          }}
        >
          {overall.status === 'safe'
            ? <CheckCircle className="w-4 h-4" />
            : <AlertTriangle className="w-4 h-4" />}
          {overall.status === 'safe' ? 'On Track' : overall.status === 'warn' ? 'Warning' : 'Critical'}
        </div>
      </motion.div>

      {dangerSubjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-xl flex items-center gap-3"
          style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <div className="badge-pulse w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">
            <span className="font-semibold">{dangerSubjects.length} subject{dangerSubjects.length > 1 ? 's' : ''}</span>
            {' '}below 80%: {dangerSubjects.map(s => s.subject.subject_name).join(', ')}
          </p>
          <Link href="/attendance" className="ml-auto text-xs text-red-400 hover:text-red-300 whitespace-nowrap underline underline-offset-2">
            Mark Now →
          </Link>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Overall', value: `${overall.percentage}%`, icon: Target, color: getStatusColor(overall.status), sub: `${req}% required` },
          { label: 'Attended', value: overall.totalAttended, icon: CheckCircle, color: '#60a5fa', sub: 'total lectures' },
          { label: 'Subjects', value: stats.length, icon: BookOpen, color: '#c084fc', sub: 'being tracked' },
          { label: 'Safe', value: stats.filter(s => s.status === 'safe').length, icon: Zap, color: '#4ade80', sub: 'above 85%' },
        ].map(({ label, value, icon: Icon, color, sub }, i) => (
          <motion.div
            key={label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="glass rounded-2xl p-5 glass-hover"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-medium">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold font-num" style={{ color }}>{value}</p>
            <p className="text-xs text-slate-600 mt-1">{sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Subject Overview</h2>
            <Link href="/subjects" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Manage →</Link>
          </div>
          <div className="space-y-3">
            {stats.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm mb-3">No subjects yet</p>
                <Link href="/subjects" className="text-xs text-green-400 underline underline-offset-2">Add your first subject</Link>
              </div>
            ) : (
              stats.map((s, i) => <SubjectCard key={s.subject.id} stats={s} index={i} req={req} />)
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-300">Today's Classes</h2>
              <Link href="/attendance" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Mark →</Link>
            </div>
            <div className="space-y-2">
              {todayClasses.length === 0 ? (
                <div className="glass rounded-xl p-4 text-center">
                  <Calendar className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No classes today</p>
                </div>
              ) : (
                todayClasses.map((cls: any, i: number) => (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: cls.subject?.color || '#4ade80' }} />
                    <div>
                      <p className="text-xs font-medium text-slate-200">{cls.subject?.subject_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{cls.start_time} – {cls.end_time}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {pieData.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Attendance Share</h2>
              <div className="glass rounded-2xl p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-1">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-xs text-slate-500">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {records.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={last7Days} barSize={20}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="present" name="Present" fill="#4ade80" radius={[4, 4, 0, 0]} opacity={0.8} />
              <Bar dataKey="absent" name="Absent" fill="#f87171" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  )
}

function SubjectCard({ stats, index, req }: { stats: SubjectStats; index: number; req: number }) {
  const { subject, attended, total, percentage, status, canBunk, needToAttend } = stats
  const color = getStatusColor(status)

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="glass rounded-2xl p-4 glass-hover"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: subject.color }} />
          <span className="text-sm font-semibold text-slate-200">{subject.subject_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">{attended}/{total}</span>
          <span className="text-sm font-bold font-num" style={{ color }}>{percentage}%</span>
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        {status === 'danger' ? (
          <>
            <TrendingDown className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="text-red-400">Attend next <span className="font-semibold font-mono">{needToAttend}</span> classes to reach {req}%</span>
          </>
        ) : (
          <>
            <TrendingUp className="w-3 h-3 text-green-400 flex-shrink-0" />
            <span className="text-slate-500">Can bunk <span className="font-semibold font-mono text-green-400">{canBunk}</span> more safely</span>
          </>
        )}
      </div>
    </motion.div>
  )
}