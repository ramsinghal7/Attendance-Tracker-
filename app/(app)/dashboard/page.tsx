import { createClient } from '@/lib/supabase/server'
import { buildSubjectStats, getOverallStats, getTodayDay } from '@/lib/attendance'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at')

  const subjectIds = (subjects || []).map((s: any) => s.id)

  const { data: records } = subjectIds.length > 0
    ? await supabase.from('attendance_records').select('*').in('subject_id', subjectIds)
    : { data: [] }

  const { data: timetable } = await supabase
    .from('timetable')
    .select('*, subject:subjects(*)')
    .in('subject_id', subjectIds.length > 0 ? subjectIds : ['none'])

  const req = profile?.attendance_requirement || 80
  const stats = buildSubjectStats(subjects || [], records || [], req)
  const overall = getOverallStats(stats)
  const todayDay = getTodayDay()
  const todayClasses = (timetable || []).filter((t: any) => t.day_of_week === todayDay && t.subject)

  return (
    <DashboardClient
      stats={stats}
      overall={overall}
      todayClasses={todayClasses}
      records={records || []}
      userName={profile?.name || 'Student'}
      req={req}
    />
  )
}