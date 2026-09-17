// Ported 1:1 from the original index.html MENU_CONFIG.
export interface NavItem {
  id: string
  icon: string
  label: string
}

export const MENU_CONFIG: Record<string, NavItem[]> = {
  super_admin: [
    { id: 'principal-dashboard', icon: 'fa-user-shield', label: 'Principal Dashboard' },
    { id: 'dashboard', icon: 'fa-border-all', label: 'Council Dashboard' },
    { id: 'tasks', icon: 'fa-clipboard-check', label: 'Tasks' },
    { id: 'events', icon: 'fa-calendar', label: 'Events' },
    { id: 'members', icon: 'fa-user-group', label: 'Leadership & Members' },
    { id: 'meetings', icon: 'fa-handshake', label: 'Meetings' },
    { id: 'grievances', icon: 'fa-shield', label: 'Grievance Command' }
  ],
  lead: [
    { id: 'dashboard', icon: 'fa-border-all', label: 'Council Dashboard' },
    { id: 'tasks', icon: 'fa-clipboard-check', label: 'Tasks' },
    { id: 'events', icon: 'fa-calendar', label: 'Events' },
    { id: 'members', icon: 'fa-user-group', label: 'Members' },
    { id: 'meetings', icon: 'fa-handshake', label: 'Meetings' },
    { id: 'grievances', icon: 'fa-shield', label: 'Grievances' }
  ],
  member: [
    { id: 'dashboard', icon: 'fa-border-all', label: 'Council Dashboard' },
    { id: 'tasks', icon: 'fa-clipboard-check', label: 'My Tasks' },
    { id: 'events', icon: 'fa-calendar', label: 'Events' },
    { id: 'members', icon: 'fa-user-group', label: 'Directory' },
    { id: 'meetings', icon: 'fa-handshake', label: 'Meetings' },
    { id: 'grievances', icon: 'fa-shield', label: 'Grievances' }
  ],
  default: [
    { id: 'dashboard', icon: 'fa-border-all', label: 'Council Dashboard' },
    { id: 'tasks', icon: 'fa-clipboard-check', label: 'My Tasks' },
    { id: 'events', icon: 'fa-calendar', label: 'Events' },
    { id: 'members', icon: 'fa-user-group', label: 'Directory' }
  ]
}

// Phase 1 only implements these pages against the live backend. Finance is
// intentionally excluded: in the original frontend loadFinances() is a stub
// that always returns [] and the Finance page itself is marked "Future
// Module" -- it is disabled in the current app, not just unmigrated.
// Teams/Analytics/Chat/Power Suite are local-storage-only features (no
// backend calls) and are slated for Phase 2.
export const PHASE1_PAGES = new Set(['principal-dashboard', 'dashboard', 'tasks', 'events', 'members', 'meetings', 'grievances'])
