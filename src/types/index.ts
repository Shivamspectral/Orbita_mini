// Types mirror the FastAPI resource responses exactly (see
// backend/app/routers/resources.py list_rows()). Do not add fields that
// don't exist in the API response -- the original frontend treats missing
// fields as optional/blank, and so do we.

export type Role = 'super_admin' | 'lead' | 'member' | 'committee_member' | string

export interface User {
  id: number
  member_id?: number
  name: string
  role: Role
  role_name: string
  email?: string
}

export interface Task {
  id: number
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
  assigned_to?: number | null
  assigned_name?: string
  assigned_team?: string
  category?: string
  created_by?: number | null
}

export interface EventItem {
  id: number
  title: string
  description?: string
  date?: string
  time?: string
  location?: string
  type?: string
  priority?: string
  organizer?: string
  is_public?: boolean
  registration_enabled?: boolean
  feedback_prompt?: string
  photos?: { name: string; type: string; data: string }[]
  created_by?: number | null
}

export interface Meeting {
  id: number
  title: string
  date?: string
  time?: string
  location?: string
  type?: string
  agenda?: string
  status?: string
  created_by?: number | null
}

export interface Member {
  id: number
  member_id?: number
  name: string
  role_name: string
  team?: string
  class?: string
  branch?: string
  department?: string
  authority_level?: string
  email?: string
}

export interface Grievance {
  id: number
  subject: string
  description?: string
  status: string
  is_anonymous?: boolean
  created_by?: number | null
  priority?: string
}
