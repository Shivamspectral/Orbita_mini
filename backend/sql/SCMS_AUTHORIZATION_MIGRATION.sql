-- Orbita Mini authorization architecture
-- Run once against the existing Supabase database.
-- Human role_name values remain descriptive; authority_level is the stable security field.

ALTER TABLE public.scms_members
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'COUNCIL_MEMBER',
  ADD COLUMN IF NOT EXISTS authority_level text NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN IF NOT EXISTS committee_id text,
  ADD COLUMN IF NOT EXISTS login_enabled boolean NOT NULL DEFAULT true;

-- Preserve the existing Principal/super-admin flag as the highest stable authority.
UPDATE public.scms_members
SET account_type = 'SUPER_ADMIN', authority_level = 'SUPER_ADMIN'
WHERE is_super_admin = true;

-- Normalize allowed authority values. New/updated accounts should use only these values:
-- MEMBER, LEAD, SUPER_ADMIN. Committee names/titles must not be used for authorization.
ALTER TABLE public.scms_members
  DROP CONSTRAINT IF EXISTS scms_members_authority_level_check;
ALTER TABLE public.scms_members
  ADD CONSTRAINT scms_members_authority_level_check
  CHECK (authority_level IN ('MEMBER','LEAD','SUPER_ADMIN'));

ALTER TABLE public.scms_members
  DROP CONSTRAINT IF EXISTS scms_members_account_type_check;
ALTER TABLE public.scms_members
  ADD CONSTRAINT scms_members_account_type_check
  CHECK (account_type IN ('COUNCIL_MEMBER','SUPER_ADMIN'));

-- Make sure the super-admin flag and stable authority cannot disagree.
UPDATE public.scms_members
SET is_super_admin = true
WHERE authority_level = 'SUPER_ADMIN';

-- Students/general users are not council login accounts. If any student rows exist,
-- explicitly remove login eligibility by keeping them at MEMBER but marking account type
-- outside the allowed login set is intentionally NOT possible under the check above.
-- Therefore student rows should not be inserted into scms_members at all.

COMMENT ON COLUMN public.scms_members.authority_level IS 'Stable security tier: MEMBER, LEAD, or SUPER_ADMIN. Do not encode committee names here.';
COMMENT ON COLUMN public.scms_members.committee_id IS 'Stable application/team reference; committee display names may change.';
COMMENT ON COLUMN public.scms_members.account_type IS 'Login class. Only COUNCIL_MEMBER and SUPER_ADMIN accounts can authenticate.';


-- Recreate the custom-login RPC so disabled/non-council accounts never receive a session.
CREATE OR REPLACE FUNCTION public.scms_login(p_email text, p_password text)
RETURNS TABLE(token text, member_id integer, name text, council_id text, is_super_admin boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare
  v_member public.scms_members%rowtype;
  v_token text;
begin
  select * into v_member
  from public.scms_members m
  where lower(m.email)=lower(p_email)
    and m.password=p_password
    and coalesce(m.login_enabled,true)=true
    and coalesce(m.account_type,'COUNCIL_MEMBER') in ('COUNCIL_MEMBER','SUPER_ADMIN')
    and coalesce(m.authority_level,'MEMBER') in ('MEMBER','LEAD','SUPER_ADMIN');

  if v_member.member_id is null then
    raise exception 'invalid_credentials';
  end if;

  insert into public.scms_sessions(member_id) values(v_member.member_id)
  returning scms_sessions.token into v_token;

  return query select v_token,v_member.member_id,v_member.name,v_member.council_id,v_member.is_super_admin;
end;
$$;

ALTER FUNCTION public.scms_login(text,text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.scms_login(text,text) TO service_role;

COMMENT ON COLUMN public.scms_members.login_enabled IS 'Whether this account may sign in to Orbita SCMS. General students should not be inserted as login accounts; if present, set this false.';
-- Custom scms_members authentication uses integer member IDs. These stable
-- ownership fields keep authorization independent of scms_profiles/auth.users,
-- which is important because the current custom-login system does not require
-- a Supabase Auth user for every council member.
ALTER TABLE public.scms_tasks
  ADD COLUMN IF NOT EXISTS assigned_member_id integer,
  ADD COLUMN IF NOT EXISTS created_by_member_id integer;
ALTER TABLE public.scms_events
  ADD COLUMN IF NOT EXISTS created_by_member_id integer;
ALTER TABLE public.scms_meetings
  ADD COLUMN IF NOT EXISTS created_by_member_id integer;
ALTER TABLE public.scms_grievances
  ADD COLUMN IF NOT EXISTS submitted_member_id integer,
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS scms_tasks_assigned_member_id_idx ON public.scms_tasks(assigned_member_id);
CREATE INDEX IF NOT EXISTS scms_tasks_created_by_member_id_idx ON public.scms_tasks(created_by_member_id);
CREATE INDEX IF NOT EXISTS scms_events_created_by_member_id_idx ON public.scms_events(created_by_member_id);
CREATE INDEX IF NOT EXISTS scms_meetings_created_by_member_id_idx ON public.scms_meetings(created_by_member_id);
CREATE INDEX IF NOT EXISTS scms_grievances_submitted_member_id_idx ON public.scms_grievances(submitted_member_id);

COMMENT ON COLUMN public.scms_tasks.assigned_member_id IS 'Stable scms_members.member_id used by custom-login authorization; assigned_user_id remains a legacy Supabase Auth bridge.';
COMMENT ON COLUMN public.scms_tasks.created_by_member_id IS 'Stable scms_members.member_id used by custom-login authorization.';
COMMENT ON COLUMN public.scms_events.created_by_member_id IS 'Stable scms_members.member_id used by custom-login authorization.';
COMMENT ON COLUMN public.scms_meetings.created_by_member_id IS 'Stable scms_members.member_id used by custom-login authorization.';
COMMENT ON COLUMN public.scms_grievances.submitted_member_id IS 'Stable scms_members.member_id used for server-side grievance privacy.';
COMMENT ON COLUMN public.scms_grievances.is_anonymous IS 'If true, submitted_member_id and submitted_by are intentionally NULL and normal members may only see the grievance without identity.';

-- Existing rows retain their current identity. New anonymous submissions are
-- handled by FastAPI by setting both submitter fields to NULL.

