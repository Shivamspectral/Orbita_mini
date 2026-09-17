import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import { apiFetch } from '../services/api'
import type { Task, EventItem, Meeting, Member, Grievance } from '../types'
import { useAuth } from './AuthContext'

interface DataContextValue {
  tasks: Task[]
  events: EventItem[]
  meetings: Meeting[]
  members: Member[]
  grievances: Grievance[]
  loadTasks: () => Promise<void>
  loadEvents: () => Promise<void>
  loadMeetings: () => Promise<void>
  loadMembers: () => Promise<void>
  loadGrievances: () => Promise<void>
  loadAll: () => Promise<void>
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [grievances, setGrievances] = useState<Grievance[]>([])

  const loadTasks = useCallback(async () => {
    const rows = await apiFetch<Task[]>('/tasks')
    setTasks(Array.isArray(rows) ? rows : [])
  }, [])
  const loadEvents = useCallback(async () => {
    const rows = await apiFetch<EventItem[]>('/events')
    setEvents(Array.isArray(rows) ? rows : [])
  }, [])
  const loadMeetings = useCallback(async () => {
    const rows = await apiFetch<Meeting[]>('/meetings')
    setMeetings(Array.isArray(rows) ? rows : [])
  }, [])
  const loadMembers = useCallback(async () => {
    const rows = await apiFetch<Member[]>('/members')
    setMembers(Array.isArray(rows) ? rows : [])
  }, [])
  const loadGrievances = useCallback(async () => {
    if (!user) return
    const rows = await apiFetch<Grievance[]>('/grievances')
    setGrievances(Array.isArray(rows) ? rows : [])
  }, [user])

  // Same as original loadData(): tasks, events, members, meetings, grievances.
  // (Finance is intentionally excluded -- see constants.ts.)
  const loadAll = useCallback(async () => {
    await Promise.all([loadTasks(), loadEvents(), loadMembers(), loadMeetings(), loadGrievances()])
  }, [loadTasks, loadEvents, loadMembers, loadMeetings, loadGrievances])

  return (
    <DataContext.Provider
      value={{ tasks, events, meetings, members, grievances, loadTasks, loadEvents, loadMeetings, loadMembers, loadGrievances, loadAll }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
