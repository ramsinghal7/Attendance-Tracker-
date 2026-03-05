'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Check, X, Ban, CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Subject, AttendanceStatus } from '@/types'
import { format, addDays, subDays } from 'date-fns'

interface TimetableEntry {
  id: string
  subject_id: string
  day_of_week: string
  start_time: string
  end_time: string
  subject: Subject
}

export default function AttendancePage() {
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const dayName = format(selectedDate, 'EEEE')
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr
  const isFuture = selectedDate > new Date()

  useEffect(() => { fetchData() }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', user!.id)
    const subIds = (subs || []).map((s: any) => s.id)
    const { data: tt } = subIds.length > 0
      ? await supabase.from('timetable').select('*, subject:subjects(*)').in('subject_id', subIds).order('start_time')
      : { data: [] }
    const { data: recs } = subIds.length > 0
      ? await supabase.from('attendance_records').select('*').eq('date', dateStr).in('subject_id', subIds)
      : { data: [] }
    setSubjects(subs || [])
    setTimetable(tt || [])
    const recordMap: Record<string, AttendanceStatus> = {}
    ;(recs || []).forEach((r: any) => { 
    recordMap[r.timetable_id || r.subject_id] = r.status 
    })
    setRecords(recordMap)
    setLoading(false)
  }

    const markAttendance = async (subjectId: string, status: AttendanceStatus, timetableId?: string) => {
    setSaving(timetableId || subjectId)
  
     if (timetableId) {
        const { error } = await supabase.from('attendance_records').upsert(
        { subject_id: subjectId, timetable_id: timetableId, date: dateStr, status },
        { onConflict: 'timetable_id,date' }
        )
        if (error) { toast.error(error.message); setSaving(null); return }
        } else {
    const { error } = await supabase.from('attendance_records').upsert(
      { subject_id: subjectId, date: dateStr, status },
      { onConflict: 'subject_id,date' }
        )
        if (error) { toast.error(error.message); setSaving(null); return }
    }

  setRecords(prev => ({ ...prev, [timetableId || subjectId]: status }))
  const labels = { present: '✅ Marked Present', absent: '❌ Marked Absent', cancelled: '🚫 Class Cancelled' }
  toast.success(labels[status])
  setSaving(null)
}

  const todayClasses = timetable.filter(e => e.day_of_week === dayName)
  const markedCount = Object.keys(records).length
  const presentCount = Object.values(records).filter(s => s === 'present').length

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Mark Attendance</h1>
        <p className="text-slate-500 text-sm mt-0.5">Track your daily lecture presence</p>
      </div>

      {/* Date navigator */}
      <div
        className="glass rounded-2xl p-4 mb-6 flex items-center gap-4"
        style={isToday ? { border: '1px solid rgba(74,222,128,0.2)' } : {}}
      >
        <button
          onClick={() => setSelectedDate(d => subDays(d, 1))}
          className="p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-white">{format(selectedDate, 'EEEE')}</p>
          <p className="text-sm text-slate-500 font-mono">{format(selectedDate, 'MMM d, yyyy')}</p>
          {isToday && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
              style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
              Today
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedDate(d => addDays(d, 1))}
          className="p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      {todayClasses.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Classes', value: todayClasses.length, color: '#60a5fa' },
            { label: 'Marked', value: markedCount, color: '#c084fc' },
            { label: 'Present', value: presentCount, color: '#4ade80' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass rounded-xl p-3 text-center">
              <p className="text-xl font-bold font-num" style={{ color }}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Class list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : todayClasses.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CalendarDays className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No classes on {dayName}</p>
          <p className="text-slate-600 text-sm mt-1">Set up your timetable to see classes here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayClasses.map((cls, i) => {
            const currentStatus = records[cls.id]
            const isSaving = saving === cls.id
            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl p-4"
                style={{
                  borderLeft: `3px solid ${
                    currentStatus === 'present' ? '#4ade80' :
                    currentStatus === 'absent' ? '#f87171' :
                    currentStatus === 'cancelled' ? '#64748b' :
                    cls.subject?.color || '#334155'
                  }`,
                }}
              >
                <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: cls.subject?.color + '15', color: cls.subject?.color }}
                    >
                      {cls.subject?.subject_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{cls.subject?.subject_name}</p>
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {cls.start_time} – {cls.end_time}
                      </p>
                    </div>
                  </div>
                  {isFuture ? (
                    <span className="text-xs text-slate-600 italic">Future date</span>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-slate-600 border-t-green-400 rounded-full animate-spin" />
                      ) : (
                        <>
                          <StatusBtn active={currentStatus === 'present'} onClick={() => markAttendance(cls.subject_id, 'present',cls.id)} color="#4ade80" icon={<Check className="w-4 h-4" />} label="Present" />
                          <StatusBtn active={currentStatus === 'absent'} onClick={() => markAttendance(cls.subject_id, 'absent',cls.id)} color="#f87171" icon={<X className="w-4 h-4" />} label="Absent" />
                          <StatusBtn active={currentStatus === 'cancelled'} onClick={() => markAttendance(cls.subject_id, 'cancelled',cls.id)} color="#64748b" icon={<Ban className="w-4 h-4" />} label="Cancelled" />
                        </>
                      )}
                    </div>
                  )}
                </div>
                {currentStatus && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-slate-800"
                  >
                    <p className="text-xs text-slate-500">
                      Marked as{' '}
                      <span style={{
                        color: currentStatus === 'present' ? '#4ade80' : currentStatus === 'absent' ? '#f87171' : '#64748b',
                        fontWeight: 600
                      }}>
                        {currentStatus}
                      </span>
                      {currentStatus === 'cancelled' && " \u2014 won\u0027t affect your attendance count"}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Manual mark for subjects not in timetable */}
      {subjects.filter(s => !todayClasses.find(c => c.subject_id === s.id)).length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">Other Subjects</h2>
          <div className="space-y-2">
            {subjects.filter(s => !todayClasses.find(c => c.subject_id === s.id)).map((sub) => {
              const currentStatus = records[sub.id]
              const isSaving = saving === sub.id
              return (
                <div key={sub.id} className="glass rounded-xl p-3 flex items-center justify-between"
                  style={{ borderLeft: `2px solid ${sub.color}50` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: sub.color }} />
                    <span className="text-sm text-slate-400">{sub.subject_name}</span>
                  </div>
                  {isFuture ? (
                    <span className="text-xs text-slate-600 italic">Future date</span>
                  ) : (
                    <div className="flex gap-1.5">
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-slate-600 border-t-green-400 rounded-full animate-spin" />
                      ) : (
                        <>
                          <StatusBtn active={currentStatus === 'present'} onClick={() => markAttendance(sub.id, 'present')} color="#4ade80" icon={<Check className="w-3 h-3" />} label="Present" />
                          <StatusBtn active={currentStatus === 'absent'} onClick={() => markAttendance(sub.id, 'absent')} color="#f87171" icon={<X className="w-3 h-3" />} label="Absent" />
                          <StatusBtn active={currentStatus === 'cancelled'} onClick={() => markAttendance(sub.id, 'cancelled')} color="#64748b" icon={<Ban className="w-3 h-3" />} label="Cancelled" />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBtn({ active, onClick, color, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 p-2.5 sm:p-2 rounded-lg transition-all duration-150 active:scale-90"
      style={{
        background: active ? color + '20' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.07)'}`,
        color: active ? color : '#475569',
        transform: active ? 'scale(1.05)' : undefined,
      }}
    >
      {icon}
      <span className="text-xs sm:hidden font-medium">{label}</span>
    </button>
  )
}