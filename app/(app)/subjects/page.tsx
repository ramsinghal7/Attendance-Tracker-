'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, BookOpen, X, Check, TrendingUp, TrendingDown, Upload, FileText, RefreshCw } from 'lucide-react'
import { Subject, COLOR_OPTIONS } from '@/types'
import { calcPercentage, calcCanBunk, calcNeedToAttend, getStatusColor, calcStatus } from '@/lib/attendance'

export default function SubjectsPage() {
  const supabase = createClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<any[]>([])
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    subject_name: '',
    color: COLOR_OPTIONS[0],
    initial_attended: 0,
    initial_missed: 0,
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

  const handlePdfUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file')
      return
    }

    setPdfParsing(true)
    toast.loading('Reading your attendance PDF...', { id: 'pdf-parse' })

    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const response = await fetch('/api/parse-attendance', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setPdfPreview(data.subjects)
      setShowPdfPreview(true)
      toast.success(`Found ${data.subjects.length} subjects!`, { id: 'pdf-parse' })
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse PDF', { id: 'pdf-parse' })
    } finally {
      setPdfParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const insertAttendanceRecords = async (subjectId: string, attended: number, total: number) => {
    const records = []
    const today = new Date()
    for (let i = 0; i < total; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - (total - i))
      records.push({
        subject_id: subjectId,
        date: d.toISOString().split('T')[0],
        status: i < attended ? 'present' : 'absent',
      })
    }
    await supabase.from('attendance_records').insert(records)
  }

  const handleSyncSubjects = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    toast.loading('Syncing subjects...', { id: 'sync' })

    let synced = 0
    for (const item of pdfPreview) {
      const existing = subjects.find(s =>
        s.subject_name.toLowerCase().includes(item.subject_name.toLowerCase()) ||
        item.subject_name.toLowerCase().includes(s.subject_name.toLowerCase())
      )

      if (existing) {
        await supabase.from('attendance_records').delete().eq('subject_id', existing.id)
        await insertAttendanceRecords(existing.id, item.attended, item.conducted)
      } else {
        const color = COLOR_OPTIONS[synced % COLOR_OPTIONS.length]
        const { data: newSub } = await supabase
          .from('subjects')
          .insert({ user_id: user!.id, subject_name: item.subject_name, color })
          .select().single()
        if (newSub) {
          await insertAttendanceRecords(newSub.id, item.attended, item.conducted)
        }
      }
      synced++
    }

    toast.success(`Synced ${synced} subjects!`, { id: 'sync' })
    setShowPdfPreview(false)
    setPdfPreview([])
    fetchData()
  }

  const handleSubmit = async () => {
    if (!form.subject_name.trim()) return toast.error('Enter subject name')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (editId) {
      const { error } = await supabase
        .from('subjects')
        .update({ subject_name: form.subject_name, color: form.color })
        .eq('id', editId)
      if (error) { toast.error(error.message); setLoading(false); return }
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

    setForm({ subject_name: '', color: COLOR_OPTIONS[0], initial_attended: 0, initial_missed: 0 })
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
    setForm({ subject_name: sub.subject_name, color: sub.color, initial_attended: 0, initial_missed: 0 })
    setEditId(sub.id)
    setShowForm(true)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* PDF Preview Modal */}
      <AnimatePresence>
        {showPdfPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    PDF Parsed Successfully!
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Review and sync to your tracker</p>
                </div>
                <button
                  onClick={() => { setShowPdfPreview(false); setPdfPreview([]) }}
                  className="p-1.5 rounded-lg text-slate-500"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {pdfPreview.map((item, i) => {
                  const pct = Math.round((item.attended / item.conducted) * 100)
                  const color = pct >= 85 ? '#4ade80' : pct >= 80 ? '#facc15' : '#f87171'
                  const existing = subjects.find(s =>
                    s.subject_name.toLowerCase().includes(item.subject_name.toLowerCase()) ||
                    item.subject_name.toLowerCase().includes(s.subject_name.toLowerCase())
                  )
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-200">{item.subject_name}</p>
                          {existing ? (
                            <span className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(250,204,21,0.1)', color: '#facc15' }}>
                              update
                            </span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                              new
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">{item.attended}/{item.conducted} classes</p>
                      </div>
                      <span className="text-sm font-bold font-num" style={{ color }}>{pct}%</span>
                    </motion.div>
                  )
                })}
              </div>

              <div
                className="p-3 rounded-xl mb-4 text-xs text-slate-400"
                style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}
              >
                🔄 <span className="text-yellow-400 font-medium">update</span> = existing subject will be refreshed
                &nbsp;&nbsp;
                ✨ <span className="text-green-400 font-medium">new</span> = will be created
              </div>

              <button
                onClick={handleSyncSubjects}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
              >
                <RefreshCw className="w-4 h-4" />
                Sync All to Tracker
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Subjects</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your enrolled subjects</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePdfUpload}
            disabled={pdfParsing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}
          >
            {pdfParsing
              ? <div className="w-4 h-4 border-2 border-blue-600 border-t-blue-400 rounded-full animate-spin" />
              : <Upload className="w-4 h-4" />}
            {pdfParsing ? 'Reading...' : 'Upload PDF'}
          </button>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm({ subject_name: '', color: COLOR_OPTIONS[0], initial_attended: 0, initial_missed: 0 }) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
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
                <button onClick={() => { setShowForm(false); setEditId(null) }}
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

                {!editId && (
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

      {/* Subject grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
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
          <p className="text-slate-600 text-sm mb-4">Add manually or upload your college attendance PDF</p>
          <button
            onClick={handlePdfUpload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium mx-auto"
            style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}
          >
            <Upload className="w-4 h-4" />
            Upload Attendance PDF
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
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
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    transition={{ delay: i * 0.07 + 0.3, duration: 0.8, ease: 'easeOut' as const }}
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