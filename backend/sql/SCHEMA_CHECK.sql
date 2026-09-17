-- Run this in Supabase SQL Editor to inspect the existing schema.
-- This script does NOT modify data or tables.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'scms_profiles','scms_teams','scms_team_members','scms_tasks','scms_events',
    'scms_event_media','scms_event_feedback','scms_meetings','scms_documents',
    'scms_finance_requests','scms_approvals','scms_grievances','scms_achievements',
    'scms_calendar_items'
  )
order by table_name, ordinal_position;
