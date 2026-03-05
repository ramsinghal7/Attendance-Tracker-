'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, X, Check, Calendar } from 'lucide-react'
import { Subject, DAYS } from '@/types'

interface TimetableEntry {
  id: string
  subject_id: string
  day_of_week: string
  start_time: string
  end_time: string
  subject: Subject
}

export default function TimetablePage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    subject_id: '',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
  })
  const todayDay = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', user!.id)
    const subIds = (subs || []).map((s: any) => s.id)
    const { data: tt } = subIds.length > 0
      ? await supabase.from('timetable').select('*, subject:subjects(*)').in('subject_id', subIds).order('start_time')
      : { data: [] }
    setSubjects(subs || [])
    setEntries(tt || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!form.subject_id) return toast.error('Select a subject')
    if (form.start_time >= form.end_time) return toast.error('End time must be after start time')
    const { error } = await supabase.from('timetable').insert(form)
    if (error) return toast.error(error.message)
    toast.success('Class added to timetable!')
    setShowForm(false)
    setForm({ subject_id: '', day_of_week: 'Monday', start_time: '09:00', end_time: '10:00' })
    fetchData()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('timetable').delete().eq('id', id)
    toast.success('Removed from timetable')
    fetchData()
  }

  const entriesByDay = DAYS.reduce((acc, day) => {
    acc[day] = entries.filter(e => e.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
    return acc
  }, {} as Record<string, TimetableEntry[]>)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Weekly Timetable</h1>
          <p className="text-slate-500 text-sm mt-0.5">Set up once — repeats every week automatically</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
        >
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-md"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Add Class</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Subject</label>
                  <div className="grid grid-cols-2 gap-2">
                    {subjects.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setForm({ ...form, subject_id: sub.id })}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                        style={{
                          border: `1px solid ${form.subject_id === sub.id ? sub.color + '50' : 'rgba(255,255,255,0.07)'}`,
                          background: form.subject_id === sub.id ? sub.color + '15' : 'rgba(255,255,255,0.02)',
                          color: form.subject_id === sub.id ? sub.color : '#94a3b8',
                        }}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sub.color }} />
                        {sub.subject_name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Day</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map(day => (
                      <button
                        key={day}
                        onClick={() => setForm({ ...form, day_of_week: day })}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: form.day_of_week === day ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${form.day_of_week === day ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}`,
                          color: form.day_of_week === day ? '#4ade80' : '#64748b',
                        }}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['start_time', 'end_time'] as const).map((field) => (
                    <div key={field}>
                      <label className="text-xs text-slate-400 mb-1.5 block">
                        {field === 'start_time' ? 'Start Time' : 'End Time'}
                      </label>
                      <input
                        type="time"
                        value={form[field]}
                        onChange={e => setForm({ ...form, [field]: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-sm text-slate-200 outline-none font-mono"
                        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', colorScheme: 'dark' }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAdd}
                  className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
                >
                  <Check className="w-4 h-4" />
                  Add to Timetable
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {DAYS.map((day, di) => {
            const dayEntries = entriesByDay[day] || []
            const isToday = day === todayDay
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: di * 0.06 }}
                className="glass rounded-2xl overflow-hidden"
                style={isToday ? { borderColor: 'rgba(74,222,128,0.2)' } : {}}
              >
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{
                    background: isToday ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.01)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: isToday ? '#4ade80' : '#cbd5e1' }}>{day}</span>
                    {isToday && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-600">{dayEntries.length} {dayEntries.length === 1 ? 'class' : 'classes'}</span>
                </div>
                {dayEntries.length === 0 ? (
                  <div className="px-5 py-4 text-center">
                    <p className="text-xs text-slate-600">No classes</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-4">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm group/entry"
                        style={{
                          background: entry.subject?.color + '10',
                          border: `1px solid ${entry.subject?.color + '25'}`,
                        }}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.subject?.color }} />
                        <span className="font-medium" style={{ color: entry.subject?.color }}>{entry.subject?.subject_name}</span>
                        <span className="text-slate-500 text-xs font-mono">{entry.start_time}–{entry.end_time}</span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="opacity-0 group-hover/entry:opacity-100 transition-opacity ml-1 text-slate-600 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}