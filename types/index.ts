export interface User {
  id: string
  email: string
  name: string
  attendance_requirement: number
  created_at: string
}

export interface Subject {
  id: string
  user_id: string
  subject_name: string
  color: string
  created_at: string
}

export interface TimetableEntry {
  id: string
  subject_id: string
  day_of_week: string
  start_time: string
  end_time: string
  subject?: Subject
}

export interface AttendanceRecord {
  id: string
  subject_id: string
  date: string
  status: 'present' | 'absent' | 'cancelled'
  created_at: string
  subject?: Subject
}

export interface SubjectStats {
  subject: Subject
  attended: number
  total: number
  percentage: number
  status: 'safe' | 'warn' | 'danger'
  canBunk: number
  needToAttend: number
}

export type AttendanceStatus = 'present' | 'absent' | 'cancelled'

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const COLOR_OPTIONS = [
  '#4ade80', '#60a5fa', '#f87171', '#facc15',
  '#c084fc', '#f9a8d4', '#22d3ee', '#fb923c',
  '#a3e635', '#818cf8'
]