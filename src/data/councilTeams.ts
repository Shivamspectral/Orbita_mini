// Ported verbatim from the original index.html's COUNCIL_TEAMS (~line 2576)
// and TEAM_ACTIVITY (~line 2620). This is static presentational data baked
// into the original frontend -- it is NOT fetched from the backend, and is
// not mock/placeholder data standing in for a real endpoint.
//
// This is the same roster as `officialRoster.ts`, reshaped per-team: the
// roster is a flat list of people (one row each, with a `team` label), while
// this is nine team records each owning its lead and its committee members.
// The two are kept separate on purpose because the original keeps them
// separate and each view uses a different shape. Spellings, casing
// inconsistencies ('Comp' vs 'COMP' vs 'Mech' vs 'MECH') and the name
// 'Harhkumar Rajput' are reproduced exactly as they appear in the original.
//
// Note: teams have no `name`/`title` field in the original. That matters for
// TaskModal's team <select>, which falls back to the raw `id` -- see the
// comment there.

/** [name, class, branch, role] -- positional, as in the original. */
export type TeamMemberRow = [string, string, string, string]

/** [name, department] -- positional, as in the original. */
export type FacultyCoordinatorRow = [string, string]

export interface CouncilTeam {
  id: string
  leadRole: string
  lead: string
  class: string
  branch: string
  icon: string
  colorClass: string
  faculty: string | null
  facultyDept: string | null
  /** Only some teams carry this; the rest fall back to the single `faculty`. */
  facultyCoordinators?: FacultyCoordinatorRow[]
  members: TeamMemberRow[]
}

export const COUNCIL_TEAMS: CouncilTeam[] = [
  {
    id: 'executive',
    leadRole: 'President',
    lead: 'Rupali Tagunde',
    class: 'TE',
    branch: 'AIML',
    icon: 'fa-crown',
    colorClass: 'team-blue',
    faculty: 'Ajeet Mahatme',
    facultyDept: 'Accounts Department',
    members: [
      ['Purnima Patra', 'TE', 'IOT', 'Vice-President'],
      ['Kiran Prasad', 'TE', 'COMP', 'General Secretary'],
      ['Kajal Bodke', 'TE', 'E&TC', 'Joint Secretary'],
      ['Vedant Aware', 'SE', 'AIML', 'Joint Secretary'],
      ['Tushar Gawali', 'SE', 'ELECT', 'Treasurer'],
      ['Aachal Baviskar', 'SE', 'Mech', 'Committee Member'],
      ['Sandhya Kolpe', 'SE', 'Mech', 'Committee Member']
    ]
  },
  {
    id: 'cultural',
    leadRole: 'Cultural Secretary',
    lead: 'Aryan Pentewar',
    class: 'TE',
    branch: 'COMP',
    icon: 'fa-masks-theater',
    colorClass: 'team-purple',
    faculty: 'Rushikesh More',
    facultyDept: 'First Year Department',
    members: [
      ['Prachi Tarale', 'SE', 'Comp', 'Committee Member'],
      ['Sakshi Yadav', 'SE', 'AIDS', 'Committee Member'],
      ['Chandrakant Shinde', 'SE', 'IOT', 'Committee Member'],
      ['Ronic Vasane', 'SE', 'AIDS', 'Committee Member'],
      ['Pratik Galande', 'SE', 'COMP', 'Committee Member']
    ]
  },
  {
    id: 'sports',
    leadRole: 'Sports Secretary',
    lead: 'Prachi Dinkar',
    class: 'TE',
    branch: 'IT',
    icon: 'fa-futbol',
    colorClass: 'team-green',
    faculty: 'Gopinath Kalokhe',
    facultyDept: 'Sports Department',
    members: [
      ['Abhijeet Nimbalkar', 'SE', 'COMP', 'Committee Member'],
      ['Pragati Sarnaik', 'SE', 'AIML', 'Committee Member'],
      ['Pranav Avate', 'SE', 'AIML', 'Committee Member'],
      ['Ajay Kadam', 'SE', 'ELECT', 'Committee Member'],
      ['Ansari Faizan', 'SE', 'AIDS', 'Committee Member']
    ]
  },
  {
    id: 'technical',
    leadRole: 'Technical Secretary',
    lead: 'Samiksha Harap',
    class: 'TE',
    branch: 'ECE',
    icon: 'fa-microchip',
    colorClass: 'team-cyan',
    faculty: 'Swati Deshmukh',
    facultyDept: 'Electronics & Tele-Communication Engineering',
    members: [
      ['Tanmay Yewale', 'SE', 'AIDS', 'Committee Member'],
      ['Ankita Suryavanshi', 'TE', 'AIDS', 'Committee Member'],
      ['Rohan Patil', 'SE', 'CYB', 'Committee Member'],
      ['Shubham Giram', 'SE', 'COMP', 'Committee Member'],
      ['Harhkumar Rajput', 'SE', 'AIDS', 'Committee Member']
    ]
  },
  {
    id: 'social',
    leadRole: 'Social Responsibility Secretary',
    lead: 'Anzar Sayyad',
    class: 'SE',
    branch: 'E&TC',
    icon: 'fa-hand-holding-heart',
    colorClass: 'team-orange',
    // The only team with no faculty coordinator in the selection report.
    faculty: null,
    facultyDept: null,
    members: [
      ['Mohit Chandanmathe', 'TE', 'ENCE', 'Committee Member'],
      ['Gaurav Dhormare', 'BE', 'CIVIL', 'Committee Member'],
      ['Krishna Dixit', 'SE', 'MECH', 'Committee Member'],
      ['Shivam Prajapati', 'TE', 'AIDS', 'Committee Member'],
      ['Dnyaneshwari Birajdar', 'SE', 'AIML', 'Committee Member']
    ]
  },
  {
    id: 'pr',
    leadRole: 'Public Relations & Media Secretary',
    lead: 'Karishma Savalekar',
    class: 'TE',
    branch: 'E&TC',
    icon: 'fa-bullhorn',
    colorClass: 'team-red',
    faculty: 'Rajesh Mahamuni',
    facultyDept: 'Computer Engineering Department',
    facultyCoordinators: [
      ['Mayur Kadam', 'Diploma Mechanical Department'],
      ['Shreyash Ghanvat', 'Civil Engineering Department'],
      ['Rajesh Mahamuni', 'Computer Engineering Department']
    ],
    members: [
      ['Savan Doiphode', 'SE', 'AIML', 'Committee Member'],
      ['Harshvardhan Bhalerao', 'SE', 'E&TC', 'Committee Member'],
      ['Vaibhav Aaglave', 'SE', 'AIML', 'Committee Member'],
      ['Dashrath Koli', 'SE', 'ENCE', 'Committee Member'],
      ['Siddhi Londhe', 'SE', 'AIDS', 'Committee Member']
    ]
  },
  {
    id: 'welfare',
    leadRole: 'Student Welfare Secretary',
    lead: 'Aryan Shirpute',
    class: 'SE',
    branch: 'IOT',
    icon: 'fa-heart-circle-check',
    colorClass: 'team-pink',
    faculty: 'Vaibhav Munde',
    facultyDept: 'Mechanical Engineering Department',
    members: [
      ['Sarthak Misal', 'SE', 'Comp', 'Committee Member'],
      ['Darshan Patil', 'SE', 'ENCE', 'Committee Member'],
      ['Vishal Aswar', 'SE', 'E&TC', 'Committee Member'],
      ['Sankashti Jagdambe', 'SE', 'E&TC', 'Committee Member'],
      ['Anil Rathod', 'SE', 'COMP', 'Committee Member']
    ]
  },
  {
    id: 'women',
    leadRole: "Women's Representative",
    lead: 'Likhitha Teppda',
    class: 'TE',
    branch: 'COMP',
    icon: 'fa-venus',
    colorClass: 'team-rose',
    faculty: 'Nilima Patil',
    facultyDept: 'First Year Department',
    members: [
      ['Payal Pimple', 'SE', 'AIML', 'Committee Member'],
      ['Pratidnya Talekar', 'TE', 'E&TC', 'Committee Member'],
      ['Rutuja Bhaval', 'SE', 'AIDS', 'Committee Member'],
      ['Aishwarya Bhosale', 'SE', 'IT', 'Committee Member'],
      ['Ruksana Khan', 'SE', 'COMP', 'Committee Member']
    ]
  },
  {
    id: 'tnp',
    leadRole: 'Training & Placement Representative',
    lead: 'Bhavesh Mahajan',
    class: 'TE',
    branch: 'E&TC',
    icon: 'fa-briefcase',
    colorClass: 'team-teal',
    faculty: 'Richa Nighote',
    facultyDept: 'TNP Department',
    facultyCoordinators: [
      ['Nilima Patil', 'First Year Department'],
      ['Richa Nighote', 'TNP Department']
    ],
    members: [
      ['Shruti Supekar', 'TE', 'Comp', 'Committee Member'],
      ['Ganesh Harel', 'TE', 'IOT', 'Committee Member'],
      ['Pranali Ghogare', 'SE', 'AIML', 'Committee Member'],
      ['Kaushik Gunkar', 'TE', 'AIDS', 'Committee Member'],
      ['Snehal Aade', 'SE', 'IT', 'Committee Member']
    ]
  }
]

// Static per-team activity copy, used by the workspace Overview and Tasks
// tabs. Teams not listed here fall back to a generic trio (see Teams.tsx).
export const TEAM_ACTIVITY: Record<string, string[]> = {
  executive: ['Executive council review', 'Core council coordination', 'Monthly action tracker'],
  cultural: ['Cultural calendar planning', 'Event rehearsal coordination', 'Inter-department activity'],
  sports: ['Tournament planning', 'Practice & participation', 'Sports equipment tracker'],
  technical: ['Hackathon & technical events', 'Portal and AV support', 'Technical workshop planning'],
  social: ['Community outreach', 'Social responsibility drive', 'Student engagement activities'],
  pr: ['Event publicity', 'Social media calendar', 'Media and documentation'],
  welfare: ['Student grievance follow-up', 'Welfare initiatives', 'Student support coordination'],
  women: ["Women's safety & inclusion", 'Awareness campaigns', 'Student outreach'],
  tnp: ['Placement preparation', 'Training calendar', 'Industry interaction']
}

export function getTeam(id: string): CouncilTeam | undefined {
  return COUNCIL_TEAMS.find((t) => t.id === id)
}
