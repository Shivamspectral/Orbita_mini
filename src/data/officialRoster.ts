// Ported verbatim from the original index.html OFFICIAL_ROSTER. This is
// static presentational data baked into the original frontend (not fetched
// from the backend) -- used by the public landing page's leadership list.
export interface RosterEntry {
  id: number
  name: string
  class: string
  branch: string
  role_name: string
  team: string
  department: string
}

const RAW: [string, string, string, string, string][] = [
  ['Rupali Tagunde', 'TE', 'AIML', 'President', 'Executive Council'],
  ['Purnima Patra', 'TE', 'IOT', 'Vice-President', 'Executive Council'],
  ['Kiran Prasad', 'TE', 'COMP', 'General Secretary', 'Executive Council'],
  ['Kajal Bodke', 'TE', 'E&TC', 'Joint Secretary', 'Executive Council'],
  ['Vedant Aware', 'SE', 'AIML', 'Joint Secretary', 'Executive Council'],
  ['Tushar Gawali', 'SE', 'ELECT', 'Treasurer', 'Executive Council'],
  ['Aachal Baviskar', 'SE', 'Mech', 'Committee Member', 'Executive Council'],
  ['Sandhya Kolpe', 'SE', 'Mech', 'Committee Member', 'Executive Council'],
  ['Ajeet Mahatme', '', '', 'Faculty Coordinator', 'Accounts Department'],
  ['Aryan Pentewar', 'TE', 'COMP', 'Cultural Secretary', 'Cultural'],
  ['Prachi Tarale', 'SE', 'Comp', 'Committee Member', 'Cultural'],
  ['Sakshi Yadav', 'SE', 'AIDS', 'Committee Member', 'Cultural'],
  ['Chandrakant Shinde', 'SE', 'IOT', 'Committee Member', 'Cultural'],
  ['Ronic Vasane', 'SE', 'AIDS', 'Committee Member', 'Cultural'],
  ['Pratik Galande', 'SE', 'COMP', 'Committee Member', 'Cultural'],
  ['Rushikesh More', '', '', 'Faculty Coordinator', 'First Year Department'],
  ['Prachi Dinkar', 'TE', 'IT', 'Sports Secretary', 'Sports'],
  ['Abhijeet Nimbalkar', 'SE', 'COMP', 'Committee Member', 'Sports'],
  ['Pragati Sarnaik', 'SE', 'AIML', 'Committee Member', 'Sports'],
  ['Pranav Avate', 'SE', 'AIML', 'Committee Member', 'Sports'],
  ['Ajay Kadam', 'SE', 'ELECT', 'Committee Member', 'Sports'],
  ['Ansari Faizan', 'SE', 'AIDS', 'Committee Member', 'Sports'],
  ['Gopinath Kalokhe', '', '', 'Faculty Coordinator', 'Sports Department'],
  ['Samiksha Harap', 'TE', 'ECE', 'Technical Secretary', 'Technical'],
  ['Tanmay Yewale', 'SE', 'AIDS', 'Committee Member', 'Technical'],
  ['Ankita Suryavanshi', 'TE', 'AIDS', 'Committee Member', 'Technical'],
  ['Rohan Patil', 'SE', 'CYB', 'Committee Member', 'Technical'],
  ['Shubham Giram', 'SE', 'COMP', 'Committee Member', 'Technical'],
  ['Harhkumar Rajput', 'SE', 'AIDS', 'Committee Member', 'Technical'],
  ['Swati Deshmukh', '', '', 'Faculty Coordinator', 'Electronics & Tele-Communication Engineering'],
  ['Anzar Sayyad', 'SE', 'E&TC', 'Social Responsibility Secretary', 'Social Responsibility'],
  ['Mohit Chandanmathe', 'TE', 'ENCE', 'Committee Member', 'Social Responsibility'],
  ['Gaurav Dhormare', 'BE', 'CIVIL', 'Committee Member', 'Social Responsibility'],
  ['Krishna Dixit', 'SE', 'MECH', 'Committee Member', 'Social Responsibility'],
  ['Shivam Prajapati', 'TE', 'AIDS', 'Committee Member', 'Social Responsibility'],
  ['Dnyaneshwari Birajdar', 'SE', 'AIML', 'Committee Member', 'Social Responsibility'],
  ['Mayur Kadam', '', '', 'Faculty Coordinator', 'Diploma Mechanical Department'],
  ['Shreyash Ghanvat', '', '', 'Faculty Coordinator', 'Civil Engineering Department'],
  ['Karishma Savalekar', 'TE', 'E&TC', 'Public Relations & Media Secretary', 'Public Relations & Media'],
  ['Savan Doiphode', 'SE', 'AIML', 'Committee Member', 'Public Relations & Media'],
  ['Harshvardhan Bhalerao', 'SE', 'E&TC', 'Committee Member', 'Public Relations & Media'],
  ['Vaibhav Aaglave', 'SE', 'AIML', 'Committee Member', 'Public Relations & Media'],
  ['Dashrath Koli', 'SE', 'ENCE', 'Committee Member', 'Public Relations & Media'],
  ['Siddhi Londhe', 'SE', 'AIDS', 'Committee Member', 'Public Relations & Media'],
  ['Rajesh Mahamuni', '', '', 'Faculty Coordinator', 'Computer Engineering Department'],
  ['Aryan Shirpute', 'SE', 'IOT', 'Student Welfare Secretary', 'Student Welfare'],
  ['Sarthak Misal', 'SE', 'Comp', 'Committee Member', 'Student Welfare'],
  ['Darshan Patil', 'SE', 'ENCE', 'Committee Member', 'Student Welfare'],
  ['Vishal Aswar', 'SE', 'E&TC', 'Committee Member', 'Student Welfare'],
  ['Sankashti Jagdambe', 'SE', 'E&TC', 'Committee Member', 'Student Welfare'],
  ['Anil Rathod', 'SE', 'COMP', 'Committee Member', 'Student Welfare'],
  ['Vaibhav Munde', '', '', 'Faculty Coordinator', 'Mechanical Engineering Department'],
  ['Likhitha Teppda', 'TE', 'COMP', "Women's Representative", "Women's Representation"],
  ['Payal Pimple', 'SE', 'AIML', 'Committee Member', "Women's Representation"],
  ['Pratidnya Talekar', 'TE', 'E&TC', 'Committee Member', "Women's Representation"],
  ['Rutuja Bhaval', 'SE', 'AIDS', 'Committee Member', "Women's Representation"],
  ['Aishwarya Bhosale', 'SE', 'IT', 'Committee Member', "Women's Representation"],
  ['Ruksana Khan', 'SE', 'COMP', 'Committee Member', "Women's Representation"],
  ['Nilima Patil', '', '', 'Faculty Coordinator', 'First Year Department'],
  ['Bhavesh Mahajan', 'TE', 'E&TC', 'Training & Placement Representative', 'Training & Placement'],
  ['Shruti Supekar', 'TE', 'Comp', 'Committee Member', 'Training & Placement'],
  ['Ganesh Harel', 'TE', 'IOT', 'Committee Member', 'Training & Placement'],
  ['Pranali Ghogare', 'SE', 'AIML', 'Committee Member', 'Training & Placement'],
  ['Kaushik Gunkar', 'TE', 'AIDS', 'Committee Member', 'Training & Placement'],
  ['Snehal Aade', 'SE', 'IT', 'Committee Member', 'Training & Placement'],
  ['Richa Nighote', '', '', 'Faculty Coordinator', 'TNP Department']
]

export const OFFICIAL_ROSTER: RosterEntry[] = RAW.map((r, i) => ({
  id: i + 1,
  name: r[0],
  class: r[1],
  branch: r[2],
  role_name: r[3],
  team: r[4],
  department: r[4]
}))
