'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, BookOpen, X, Check, TrendingUp, TrendingDown } from 'lucide-react'
import { Subject, COLOR_OPTIONS } from '@/types'
import { calcPercentage, calcCanBunk, calcNeedToAttend, getStatusColor, calcStatus } from '@/lib/attendance'

export default function SubjectsPage() {
  const supabase = createClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editStats, setEditStats] = useState<{ attended: number; total: number } | null>(null)
  const [form, setForm] = useState({
    subject_name: '',
    color: COLOR_OPTIONS[0],
    initial_attended: 0,
    initial_missed: 0,
    edit_attended: 0,
    edit_total: 0,
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', user!.id).order('created_at')
    const subIds = (subs || []).map((s: any) => s.id)
    const { data: recs } = subIds.length > 0
      ? await supabase.from('attendance_records').select('*').in('subject_id', subIds)
      : { data: [] as any[] }
    setSubjects(subs || [])
    setRecords(recs || [])
    setLoading(false)
  }

  const getSubjectStats = (subjectId: string) => {
    const subRecs = records.filter(r => r.subject_id === subjectId && r.status !== 'cancelled')
    const attended = subRecs.filter(r => r.status === 'present').length
    const total = subRecs.length
    return { attended, total, percentage: calcPercentage(attended, total) }
  }

  const handleSubmit = async () => {
    if (!form.subject_name.trim()) return toast.error('Enter subject name')
    if (editId && form.edit_attended > form.edit_total) {
      return toast.error('Attended count cannot exceed total classes')
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (editId) {
      const { error } = await supabase
        .from('subjects')
        .update({ subject_name: form.subject_name, color: form.color })
        .eq('id', editId)
      if (error) { toast.error(error.message); setLoading(false); return }

      // Handle attendance count corrections
      const newAttended = Math.max(0, form.edit_attended)
      const newTotal = Math.max(newAttended, form.edit_total)
      const prevAttended = editStats?.attended ?? 0
      const prevTotal = editStats?.total ?? 0

      if (newAttended !== prevAttended || newTotal !== prevTotal) {
        const { data: currentRecs } = await supabase
          .from('attendance_records')
          .select('id, date, status')
          .eq('subject_id', editId)
          .neq('status', 'cancelled')

        const currPresent = (currentRecs || []).filter(r => r.status === 'present')
        const currAbsent = (currentRecs || []).filter(r => r.status === 'absent')
        const deltaPresent = newAttended - currPresent.length
        const deltaAbsent = (newTotal - newAttended) - currAbsent.length

        const usedDates = new Set((currentRecs || []).map(r => r.date as string))
        const getFreeDate = (): string | null => {
          const base = new Date('2010-01-01')
          for (let i = 0; i < 36500; i++) {
            const d = new Date(base)
            d.setDate(d.getDate() + i)
            const ds = d.toISOString().split('T')[0]
            if (!usedDates.has(ds)) { usedDates.add(ds); return ds }
          }
          return null
        }

        if (deltaPresent > 0) {
          const recs = []
          for (let i = 0; i < deltaPresent; i++) {
            const date = getFreeDate()
            if (date) recs.push({ subject_id: editId, date, status: 'present' })
          }
          if (recs.length) await supabase.from('attendance_records').insert(recs)
        } else if (deltaPresent < 0) {
          const toDelete = [...currPresent]
            .sort((a, b) => (a.date < b.date ? -1 : 1))
            .slice(0, Math.abs(deltaPresent))
            .map(r => r.id)
          if (toDelete.length) await supabase.from('attendance_records').delete().in('id', toDelete)
        }

        if (deltaAbsent > 0) {
          const recs = []
          for (let i = 0; i < deltaAbsent; i++) {
            const date = getFreeDate()
            if (date) recs.push({ subject_id: editId, date, status: 'absent' })
          }
          if (recs.length) await supabase.from('attendance_records').insert(recs)
        } else if (deltaAbsent < 0) {
          const toDelete = [...currAbsent]
            .sort((a, b) => (a.date < b.date ? -1 : 1))
            .slice(0, Math.abs(deltaAbsent))
            .map(r => r.id)
          if (toDelete.length) await supabase.from('attendance_records').delete().in('id', toDelete)
        }
      }

      toast.success('Subject updated')
    } else {
      const { data: newSub, error } = await supabase
        .from('subjects')
        .insert({ user_id: user!.id, subject_name: form.subject_name, color: form.color })
        .select().single()
      if (error) { toast.error(error.message); setLoading(false); return }

      const initial_total = form.initial_attended + form.initial_missed
      if (newSub && initial_total > 0) {
        const today = new Date()
        const initialRecords = []
        for (let i = 0; i < initial_total; i++) {
          const d = new Date(today)
          d.setDate(d.getDate() - (initial_total - i))
          initialRecords.push({
            subject_id: newSub.id,
            date: d.toISOString().split('T')[0],
            status: i < form.initial_attended ? 'present' : 'absent',
          })
        }
        await supabase.from('attendance_records').insert(initialRecords)
      }
      toast.success('Subject added!')
    }

    setForm({ subject_name: '', color: COLOR_OPTIONS[0], initial_attended: 0, initial_missed: 0, edit_attended: 0, edit_total: 0 })
    setEditStats(null)
    setShowForm(false)
    setEditId(null)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject and all its records?')) return
    await supabase.from('attendance_records').delete().eq('subject_id', id)
    await supabase.from('timetable').delete().eq('subject_id', id)
    await supabase.from('subjects').delete().eq('id', id)
    toast.success('Subject deleted')
    fetchData()
  }

  const openEdit = (sub: Subject) => {
    const { attended, total } = getSubjectStats(sub.id)
    setEditStats({ attended, total })
    setForm({ subject_name: sub.subject_name, color: sub.color, initial_attended: 0, initial_missed: 0, edit_attended: attended, edit_total: total })
    setEditId(sub.id)
    setShowForm(true)
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Subjects</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Manage your enrolled subjects</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setEditStats(null); setForm({ subject_name: '', color: COLOR_OPTIONS[0], initial_attended: 0, initial_missed: 0, edit_attended: 0, edit_total: 0 }) }}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Subject</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-md"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">{editId ? 'Edit Subject' : 'Add Subject'}</h2>
                <button onClick={() => { setShowForm(false); setEditId(null); setEditStats(null) }}
                  className="p-1.5 rounded-lg text-slate-500" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Subject Name</label>
                  <input
                    type="text"
                    value={form.subject_name}
                    onChange={e => setForm({ ...form, subject_name: e.target.value })}
                    placeholder="e.g. DBMS, DSA, AI/ML"
                    className="w-full px-4 py-3 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 outline-none"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c}
                        onClick={() => setForm({ ...form, color: c })}
                        className="w-7 h-7 rounded-lg transition-all duration-150"
                        style={{
                          background: c,
                          boxShadow: form.color === c ? `0 0 0 2px #060910, 0 0 0 4px ${c}` : 'none',
                          transform: form.color === c ? 'scale(1.1)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {!editId ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1.5 block">✅ Attended</label>
                        <input
                          type="number" min={0}
                          value={form.initial_attended}
                          onChange={e => setForm({ ...form, initial_attended: +e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm text-slate-200 outline-none font-mono"
                          style={{ border: '1px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.05)' }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1.5 block">❌ Missed</label>
                        <input
                          type="number" min={0}
                          value={form.initial_missed}
                          onChange={e => setForm({ ...form, initial_missed: +e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm text-slate-200 outline-none font-mono"
                          style={{ border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.05)' }}
                        />
                      </div>
                    </div>
                    {(form.initial_attended + form.initial_missed) > 0 && (
                      <p className="text-xs text-slate-500 text-center">
                        Total: <span className="text-white font-mono font-semibold">{form.initial_attended + form.initial_missed}</span> classes conducted
                      </p>
                    )}
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-slate-400">Attendance Count</label>
                      {editStats && (
                        <span className="text-xs font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>
                          current: {editStats.attended}/{editStats.total}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1.5 block">✅ Attended</label>
                        <input
                          type="number" min={0}
                          value={form.edit_attended}
                          onChange={e => setForm({ ...form, edit_attended: +e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm text-slate-200 outline-none font-mono"
                          style={{ border: '1px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.05)' }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1.5 block">📚 Total Classes</label>
                        <input
                          type="number" min={0}
                          value={form.edit_total}
                          onChange={e => setForm({ ...form, edit_total: +e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm text-slate-200 outline-none font-mono"
                          style={{ border: '1px solid rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.05)' }}
                        />
                      </div>
                    </div>
                    {form.edit_attended > form.edit_total ? (
                      <p className="text-xs text-red-400 mt-2">Attended can\'t exceed total classes</p>
                    ) : (form.edit_attended !== (editStats?.attended ?? 0) || form.edit_total !== (editStats?.total ?? 0)) && (
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        New: <span className="text-white font-mono font-semibold">{form.edit_attended}/{form.edit_total}</span>
                        {' → '}
                        <span style={{ color: getStatusColor(calcStatus(calcPercentage(form.edit_attended, form.edit_total))) }}>
                          {calcPercentage(form.edit_attended, form.edit_total)}%
                        </span>
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
                >
                  <Check className="w-4 h-4" />
                  {editId ? 'Save Changes' : 'Add Subject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="h-5 w-32 bg-slate-800 rounded mb-3" />
              <div className="h-10 w-20 bg-slate-800 rounded mb-3" />
              <div className="h-2 w-full bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-400 font-medium mb-2">No subjects yet</h3>
          <p className="text-slate-600 text-sm">Add your first subject to start tracking</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {subjects.map((sub, i) => {
            const { attended, total, percentage } = getSubjectStats(sub.id)
            const status = calcStatus(percentage)
            const color = getStatusColor(status)
            const canBunk = calcCanBunk(attended, total)
            const needToAttend = calcNeedToAttend(attended, total)

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass rounded-2xl p-5 glass-hover group"
                style={{ borderLeft: `3px solid ${sub.color}` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{sub.subject_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-slate-500">{attended}/{total} classes</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${color}12`, color }}>
                        {status === 'safe' ? '✓ Safe' : status === 'warn' ? '⚠ Warning' : '✗ Critical'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(sub)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(sub.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-end justify-between mb-3">
                  <span className="text-4xl font-bold font-num" style={{ color }}>{percentage}%</span>
                  <span className="text-xs text-slate-500 font-mono pb-1">target 80%</span>
                </div>
                <div className="w-full h-2 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ delay: i * 0.07 + 0.3, duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
                <div className="p-3 rounded-xl text-xs flex items-start gap-2"
                  style={{ background: status === 'danger' ? 'rgba(248,113,113,0.06)' : 'rgba(74,222,128,0.06)' }}>
                  {status === 'danger' ? (
                    <>
                      <TrendingDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-red-300">Must attend next <strong className="font-mono">{needToAttend}</strong> classes to recover to 80%</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-green-300">Can safely bunk <strong className="font-mono">{canBunk}</strong> more {canBunk === 1 ? 'class' : 'classes'}</span>
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}