import { SubjectStats, Subject, AttendanceRecord } from '@/types'

export function calcPercentage(attended: number, total: number): number {
  if (total === 0) return 0
  return Math.round((attended / total) * 100)
}

export function calcStatus(percentage: number): 'safe' | 'warn' | 'danger' {
  if (percentage >= 85) return 'safe'
  if (percentage >= 80) return 'warn'
  return 'danger'
}

export function calcCanBunk(attended: number, total: number, req = 80): number {
  const canSkip = Math.floor((attended * 100 - req * total) / req)
  return Math.max(0, canSkip)
}

export function calcNeedToAttend(attended: number, total: number, req = 80): number {
  if (calcPercentage(attended, total) >= req) return 0
  const needed = Math.ceil((req * total - 100 * attended) / (100 - req))
  return Math.max(0, needed)
}

export function simulateAttendance(
  attended: number,
  total: number,
  additionalPresent: number,
  additionalAbsent: number
): number {
  const newAttended = attended + additionalPresent
  const newTotal = total + additionalPresent + additionalAbsent
  return calcPercentage(newAttended, newTotal)
}

export function buildSubjectStats(
  subjects: Subject[],
  records: AttendanceRecord[],
  req = 80
): SubjectStats[] {
  return subjects.map((subject) => {
    const subjectRecords = records.filter(
      (r) => r.subject_id === subject.id && r.status !== 'cancelled'
    )
    const attended = subjectRecords.filter((r) => r.status === 'present').length
    const total = subjectRecords.length
    const percentage = calcPercentage(attended, total)

    return {
      subject,
      attended,
      total,
      percentage,
      status: calcStatus(percentage),
      canBunk: calcCanBunk(attended, total, req),
      needToAttend: calcNeedToAttend(attended, total, req),
    }
  })
}

export function getOverallStats(stats: SubjectStats[]) {
  const totalAttended = stats.reduce((sum, s) => sum + s.attended, 0)
  const totalClasses = stats.reduce((sum, s) => sum + s.total, 0)
  const percentage = calcPercentage(totalAttended, totalClasses)

  return {
    totalAttended,
    totalClasses,
    percentage,
    status: calcStatus(percentage),
  }
}

export function getStatusColor(status: 'safe' | 'warn' | 'danger') {
  return {
    safe: '#4ade80',
    warn: '#facc15',
    danger: '#f87171',
  }[status]
}

export function getStatusBg(status: 'safe' | 'warn' | 'danger') {
  return {
    safe: 'rgba(74,222,128,0.08)',
    warn: 'rgba(250,204,21,0.08)',
    danger: 'rgba(248,113,113,0.08)',
  }[status]
}

export function getStatusBorder(status: 'safe' | 'warn' | 'danger') {
  return {
    safe: 'rgba(74,222,128,0.25)',
    warn: 'rgba(250,204,21,0.25)',
    danger: 'rgba(248,113,113,0.25)',
  }[status]
}

export function getTodayDay(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}   