'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { FlaskConical, TrendingUp, TrendingDown, Plus, Minus, Sparkles, RotateCcw } from 'lucide-react'
import { Subject } from '@/types'
import { buildSubjectStats, simulateAttendance, getStatusColor, calcStatus, getStatusBg } from '@/lib/attendance'

interface SubjectStats {
  subject: Subject
  attended: number
  total: number
  percentage: number
  status: 'safe' | 'warn' | 'danger'
  canBunk: number
  needToAttend: number
}

export default function SimulatorPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<SubjectStats[]>([])
  const [loading, setLoading] = useState(true)
  const [simValues, setSimValues] = useState<Record<string, { present: number; absent: number }>>({})
  const [req, setReq] = useState(80)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('users').select('attendance_requirement').eq('id', user!.id).single()
    const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', user!.id)
    const subIds = (subs || []).map((s: any) => s.id)
    const { data: recs } = subIds.length > 0
      ? await supabase.from('attendance_records').select('*').in('subject_id', subIds)
      : { data: [] }
    const r = profile?.attendance_requirement || 80
    setReq(r)
    const s = buildSubjectStats(subs || [], recs || [], r)
    setStats(s)
    const initSim: Record<string, { present: number; absent: number }> = {}
    s.forEach(st => { initSim[st.subject.id] = { present: 0, absent: 0 } })
    setSimValues(initSim)
    setLoading(false)
  }

  const updateSim = (subjectId: string, field: 'present' | 'absent', delta: number) => {
    setSimValues(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: Math.max(0, (prev[subjectId]?.[field] || 0) + delta)
      }
    }))
  }

  const resetAll = () => {
    const reset: Record<string, { present: number; absent: number }> = {}
    stats.forEach(s => { reset[s.subject.id] = { present: 0, absent: 0 } })
    setSimValues(reset)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FlaskConical className="w-6 h-6 text-purple-400" />
            Simulator
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">What-if scenario planner</p>
        </div>
        <button
          onClick={resetAll}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      <div className="rounded-2xl p-4 mb-6 flex items-start gap-3"
        style={{ background: 'rgba(192,132,252,0.07)', border: '1px solid rgba(192,132,252,0.15)' }}>
        <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-purple-300">
          Adjust how many classes you plan to attend or skip — see your projected attendance instantly.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-40 animate-pulse" />)}
        </div>
      ) : stats.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FlaskConical className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No subjects to simulate</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stats.map((s, i) => {
            const sim = simValues[s.subject.id] || { present: 0, absent: 0 }
            const simPct = simulateAttendance(s.attended, s.total, sim.present, sim.absent)
            const simStatus = calcStatus(simPct)
            const simColor = getStatusColor(simStatus)
            const changed = sim.present > 0 || sim.absent > 0
            const delta = simPct - s.percentage

            return (
              <motion.div
                key={s.subject.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl p-5"
                style={{ borderLeft: `3px solid ${s.subject.color}` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.subject.color }} />
                    <span className="font-semibold text-slate-200">{s.subject.subject_name}</span>
                    <span className="text-xs text-slate-500 font-mono">{s.attended}/{s.total}</span>
                  </div>
                  {changed && (
                    <button
                      onClick={() => setSimValues(prev => ({ ...prev, [s.subject.id]: { present: 0, absent: 0 } }))}
                      className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {/* Attend counter */}
                    <div>
                      <p className="text-xs text-slate-500 mb-2">If I attend next... classes</p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateSim(s.subject.id, 'present', -1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90"
                          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-2xl font-bold font-num text-green-400">{sim.present}</span>
                          <p className="text-xs text-slate-500">attend</p>
                        </div>
                        <button onClick={() => updateSim(s.subject.id, 'present', 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90"
                          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bunk counter */}
                    <div>
                      <p className="text-xs text-slate-500 mb-2">If I bunk next... classes</p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateSim(s.subject.id, 'absent', -1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90"
                          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-2xl font-bold font-num text-red-400">{sim.absent}</span>
                          <p className="text-xs text-slate-500">bunk</p>
                        </div>
                        <button onClick={() => updateSim(s.subject.id, 'absent', 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90"
                          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Result */}
                  <div
                    className="rounded-xl p-4 flex flex-col items-center justify-center"
                    style={{
                      background: changed ? getStatusBg(simStatus) : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${changed ? simColor + '30' : 'rgba(255,255,255,0.06)'}`,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <p className="text-xs text-slate-500 mb-2">Projected Attendance</p>
                    <motion.span
                      key={simPct}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="text-4xl font-bold font-num"
                      style={{ color: simColor }}
                    >
                      {simPct}%
                    </motion.span>

                    {changed && (
                      <div className="flex items-center gap-1 mt-2">
                        {delta > 0
                          ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                          : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                        <span className="text-sm font-semibold font-mono"
                          style={{ color: delta > 0 ? '#4ade80' : '#f87171' }}>
                          {delta > 0 ? '+' : ''}{delta}%
                        </span>
                        <span className="text-xs text-slate-500">vs current</span>
                      </div>
                    )}
                    {!changed && <p className="text-xs text-slate-600 mt-1">Current: {s.percentage}%</p>}

                    <div className="mt-3 text-center">
                      {simStatus === 'danger'
                        ? <p className="text-xs text-red-300">⚠ Will fall below {req}%!</p>
                        : simStatus === 'warn'
                        ? <p className="text-xs text-yellow-300">Close to danger zone</p>
                        : <p className="text-xs text-green-300">✓ Safe territory</p>}
                    </div>

                    <div className="w-full h-1.5 rounded-full mt-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <motion.div
                        animate={{ width: `${Math.min(simPct, 100)}%` }}
                        transition={{ duration: 0.4 }}
                        className="h-full rounded-full"
                        style={{ background: simColor }}
                      />
                    </div>
                  </div>
                </div>

                {changed && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 rounded-xl text-xs"
                    style={{ background: 'rgba(192,132,252,0.07)', border: '1px solid rgba(192,132,252,0.15)' }}
                  >
                    <span className="text-purple-300">
                      🤖 If you attend <strong className="text-white">{sim.present}</strong> and bunk <strong className="text-white">{sim.absent}</strong> classes,
                      your <strong className="text-white">{s.subject.subject_name}</strong> attendance will be{' '}
                      <strong style={{ color: simColor }}>{simPct}%</strong>
                      {simStatus === 'danger'
                        ? ` — ⚠ BELOW ${req}%! Attend more classes.`
                        : simStatus === 'warn'
                        ? ` — borderline, be careful!`
                        : ` — safe zone ✓`}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}