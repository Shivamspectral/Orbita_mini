


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."ff_handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ begin insert into public.ff_profiles(user_id,student_id,division,full_name,role) values (new.id, coalesce(new.raw_user_meta_data->>'student_id',''), coalesce(new.raw_user_meta_data->>'division',''), coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)), case when lower(coalesce(new.email,''))='hod@college.demo' then 'hod' else 'student' end) on conflict (user_id) do nothing; return new; end; $$;


ALTER FUNCTION "public"."ff_handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ff_is_hod"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ select exists(select 1 from public.ff_profiles where user_id=auth.uid() and role='hod'); $$;


ALTER FUNCTION "public"."ff_is_hod"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ begin insert into public.scms_profiles(user_id,email,full_name,role_name,council_id) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),'Committee Member',coalesce(new.raw_user_meta_data->>'council_id','siddhant-scoe-2026')) on conflict(user_id) do update set email=excluded.email; return new; end; $$;


ALTER FUNCTION "public"."scms_handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_is_principal_or_treasury"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ select exists(select 1 from public.scms_profiles where user_id=auth.uid() and role_name in ('Principal','Super Admin','Treasurer')); $$;


ALTER FUNCTION "public"."scms_is_principal_or_treasury"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_is_privileged"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ select exists(select 1 from public.scms_profiles where user_id=auth.uid() and role_name in ('Principal','Super Admin','Admin')); $$;


ALTER FUNCTION "public"."scms_is_privileged"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_kv_get"("p_token" "text", "p_key" "text") RETURNS TABLE("payload" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_council text;
begin
  if p_key not in ('scms_main','scms_features','scms_power','scms_chat') then
    raise exception 'invalid_key';
  end if;

  select sm.council_id into v_council from public.scms_session_member(p_token) sm;

  return query
  select k.payload, k.updated_at
  from public.scms_kv k
  where k.council_id = v_council and k.key = p_key;
end;
$$;


ALTER FUNCTION "public"."scms_kv_get"("p_token" "text", "p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_kv_set"("p_token" "text", "p_key" "text", "p_payload" "jsonb") RETURNS TABLE("payload" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_council text;
begin
  if p_key not in ('scms_main','scms_features','scms_power','scms_chat') then
    raise exception 'invalid_key';
  end if;

  if p_payload is null then
    raise exception 'invalid_payload';
  end if;

  select sm.council_id into v_council from public.scms_session_member(p_token) sm;

  return query
  insert into public.scms_kv (council_id, key, payload)
  values (v_council, p_key, p_payload)
  on conflict (council_id, key) do update set payload = excluded.payload
  returning scms_kv.payload, scms_kv.updated_at;
end;
$$;


ALTER FUNCTION "public"."scms_kv_set"("p_token" "text", "p_key" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_kv_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$ begin new.updated_at=now(); return new; end; $$;


ALTER FUNCTION "public"."scms_kv_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_login"("p_email" "text", "p_password" "text") RETURNS TABLE("token" "text", "member_id" integer, "name" "text", "council_id" "text", "is_super_admin" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."scms_login"("p_email" "text", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_logout"("p_token" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  delete from public.scms_sessions where token = p_token;
$$;


ALTER FUNCTION "public"."scms_logout"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_my_council"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ select council_id from public.scms_profiles where user_id=auth.uid() limit 1 $$;


ALTER FUNCTION "public"."scms_my_council"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_session_member"("p_token" "text") RETURNS TABLE("member_id" integer, "council_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_member_id int;
  v_council   text;
begin
  select s.member_id, m.council_id
    into v_member_id, v_council
  from public.scms_sessions s
  join public.scms_members m on m.member_id = s.member_id
  where s.token = p_token and s.expires_at > now();

  if v_member_id is null then
    raise exception 'invalid_or_expired_session';
  end if;

  return query select v_member_id, v_council;
end;
$$;


ALTER FUNCTION "public"."scms_session_member"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scms_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$ begin new.updated_at=now(); return new; end; $$;


ALTER FUNCTION "public"."scms_set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ff_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "rating" integer,
    "yes_no" boolean,
    "text_response" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ff_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ff_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'Scheduled'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ff_cycles_status_check" CHECK (("status" = ANY (ARRAY['Scheduled'::"text", 'Open'::"text", 'Closed'::"text"])))
);


ALTER TABLE "public"."ff_cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ff_profiles" (
    "user_id" "uuid" NOT NULL,
    "student_id" "text",
    "division" "text",
    "full_name" "text",
    "department" "text" DEFAULT 'Computer Engineering'::"text",
    "year_level" "text" DEFAULT 'TY'::"text",
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ff_profiles_role_check" CHECK (("role" = ANY (ARRAY['student'::"text", 'hod'::"text"])))
);


ALTER TABLE "public"."ff_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ff_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "position" integer DEFAULT 1 NOT NULL,
    "question_text" "text" NOT NULL,
    "response_type" "text" DEFAULT 'rating_1_5'::"text" NOT NULL,
    "required" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ff_questions_response_type_check" CHECK (("response_type" = ANY (ARRAY['rating_1_5'::"text", 'yes_no'::"text", 'text'::"text"])))
);


ALTER TABLE "public"."ff_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ff_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "student_user_id" "uuid" NOT NULL,
    "faculty_id" integer NOT NULL,
    "division" "text" NOT NULL,
    "comment" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ff_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_achievements" (
    "achievement_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "achieved_on" "date",
    "media_path" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scms_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_approvals" (
    "approval_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "stage" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "requested_by" "uuid",
    "decided_by" "uuid",
    "decision_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decided_at" timestamp with time zone,
    CONSTRAINT "approval_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."scms_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_calendar_items" (
    "calendar_item_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "item_type" "text" DEFAULT 'event'::"text" NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "reference_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scms_calendar_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_documents" (
    "document_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "category" "text",
    "storage_path" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scms_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_event_feedback" (
    "feedback_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "user_id" "uuid",
    "rating" integer,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "scms_event_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."scms_event_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_event_media" (
    "media_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "storage_path" "text" NOT NULL,
    "caption" "text",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scms_event_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_events" (
    "event_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "venue" "text",
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "feedback_enabled" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_member_id" integer
);


ALTER TABLE "public"."scms_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scms_events"."created_by_member_id" IS 'Stable scms_members.member_id used by custom-login authorization.';



CREATE TABLE IF NOT EXISTS "public"."scms_finance_requests" (
    "request_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "amount" numeric(14,2) NOT NULL,
    "budget_code" "text",
    "status" "text" DEFAULT 'pending_principal'::"text" NOT NULL,
    "requested_by" "uuid",
    "principal_decided_by" "uuid",
    "treasury_decided_by" "uuid",
    "decision_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "finance_status" CHECK (("status" = ANY (ARRAY['pending_principal'::"text", 'principal_approved'::"text", 'principal_rejected'::"text", 'treasury_approved'::"text", 'treasury_rejected'::"text"]))),
    CONSTRAINT "scms_finance_requests_amount_check" CHECK (("amount" >= (0)::numeric))
);


ALTER TABLE "public"."scms_finance_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_grievances" (
    "grievance_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "submitted_by" "uuid",
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "assigned_to" "uuid",
    "resolution" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_member_id" integer,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "grievance_status" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_review'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."scms_grievances" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scms_grievances"."submitted_member_id" IS 'Stable scms_members.member_id used for server-side grievance privacy.';



COMMENT ON COLUMN "public"."scms_grievances"."is_anonymous" IS 'If true, submitted_member_id and submitted_by are intentionally NULL and normal members may only see the grievance without identity.';



CREATE TABLE IF NOT EXISTS "public"."scms_kv" (
    "council_id" "text" NOT NULL,
    "key" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scms_kv" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_meetings" (
    "meeting_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "agenda" "text",
    "scheduled_at" timestamp with time zone,
    "location" "text",
    "minutes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_member_id" integer
);


ALTER TABLE "public"."scms_meetings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scms_meetings"."created_by_member_id" IS 'Stable scms_members.member_id used by custom-login authorization.';



CREATE TABLE IF NOT EXISTS "public"."scms_members" (
    "member_id" integer NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "name" "text" NOT NULL,
    "role_name" "text" DEFAULT 'Committee Member'::"text" NOT NULL,
    "email" "text" NOT NULL,
    "password" "text" NOT NULL,
    "is_super_admin" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_type" "text" DEFAULT 'COUNCIL_MEMBER'::"text" NOT NULL,
    "authority_level" "text" DEFAULT 'MEMBER'::"text" NOT NULL,
    "committee_id" "text",
    "login_enabled" boolean DEFAULT true NOT NULL,
    CONSTRAINT "scms_members_account_type_check" CHECK (("account_type" = ANY (ARRAY['COUNCIL_MEMBER'::"text", 'SUPER_ADMIN'::"text"]))),
    CONSTRAINT "scms_members_authority_level_check" CHECK (("authority_level" = ANY (ARRAY['MEMBER'::"text", 'LEAD'::"text", 'SUPER_ADMIN'::"text"])))
);


ALTER TABLE "public"."scms_members" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scms_members"."account_type" IS 'Login class. Only COUNCIL_MEMBER and SUPER_ADMIN accounts can authenticate.';



COMMENT ON COLUMN "public"."scms_members"."authority_level" IS 'Stable security tier: MEMBER, LEAD, or SUPER_ADMIN. Do not encode committee names here.';



COMMENT ON COLUMN "public"."scms_members"."committee_id" IS 'Stable application/team reference; committee display names may change.';



COMMENT ON COLUMN "public"."scms_members"."login_enabled" IS 'Whether this account may sign in to Orbita SCMS. General students should not be inserted as login accounts; if present, set this false.';



CREATE TABLE IF NOT EXISTS "public"."scms_profiles" (
    "user_id" "uuid" NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text",
    "role_name" "text" DEFAULT 'Committee Member'::"text" NOT NULL,
    "is_super_admin" boolean DEFAULT false NOT NULL,
    "avatar_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "scms_profiles_role_chk" CHECK (("role_name" = ANY (ARRAY['Student'::"text", 'Committee Member'::"text", 'Team Lead'::"text", 'Treasurer'::"text", 'Principal'::"text", 'Super Admin'::"text", 'Admin'::"text"])))
);


ALTER TABLE "public"."scms_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_sessions" (
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(24), 'hex'::"text") NOT NULL,
    "member_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '12:00:00'::interval) NOT NULL
);


ALTER TABLE "public"."scms_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_tasks" (
    "task_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "assigned_user_id" "uuid",
    "assigned_team_id" "uuid",
    "due_at" timestamp with time zone,
    "created_by" "uuid",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_member_id" integer,
    "created_by_member_id" integer,
    CONSTRAINT "task_priority" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "task_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."scms_tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scms_tasks"."assigned_member_id" IS 'Stable scms_members.member_id used by custom-login authorization; assigned_user_id remains a legacy Supabase Auth bridge.';



COMMENT ON COLUMN "public"."scms_tasks"."created_by_member_id" IS 'Stable scms_members.member_id used by custom-login authorization.';



CREATE TABLE IF NOT EXISTS "public"."scms_team_members" (
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_in_team" "text" DEFAULT 'Member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scms_team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scms_teams" (
    "team_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "council_id" "text" DEFAULT 'siddhant-scoe-2026'::"text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "lead_user_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scms_teams" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ff_answers"
    ADD CONSTRAINT "ff_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ff_answers"
    ADD CONSTRAINT "ff_answers_submission_id_question_id_key" UNIQUE ("submission_id", "question_id");



ALTER TABLE ONLY "public"."ff_cycles"
    ADD CONSTRAINT "ff_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ff_profiles"
    ADD CONSTRAINT "ff_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."ff_profiles"
    ADD CONSTRAINT "ff_profiles_student_id_key" UNIQUE ("student_id");



ALTER TABLE ONLY "public"."ff_questions"
    ADD CONSTRAINT "ff_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ff_submissions"
    ADD CONSTRAINT "ff_submissions_cycle_id_student_user_id_faculty_id_key" UNIQUE ("cycle_id", "student_user_id", "faculty_id");



ALTER TABLE ONLY "public"."ff_submissions"
    ADD CONSTRAINT "ff_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scms_achievements"
    ADD CONSTRAINT "scms_achievements_pkey" PRIMARY KEY ("achievement_id");



ALTER TABLE ONLY "public"."scms_approvals"
    ADD CONSTRAINT "scms_approvals_pkey" PRIMARY KEY ("approval_id");



ALTER TABLE ONLY "public"."scms_calendar_items"
    ADD CONSTRAINT "scms_calendar_items_pkey" PRIMARY KEY ("calendar_item_id");



ALTER TABLE ONLY "public"."scms_documents"
    ADD CONSTRAINT "scms_documents_pkey" PRIMARY KEY ("document_id");



ALTER TABLE ONLY "public"."scms_event_feedback"
    ADD CONSTRAINT "scms_event_feedback_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."scms_event_feedback"
    ADD CONSTRAINT "scms_event_feedback_pkey" PRIMARY KEY ("feedback_id");



ALTER TABLE ONLY "public"."scms_event_media"
    ADD CONSTRAINT "scms_event_media_pkey" PRIMARY KEY ("media_id");



ALTER TABLE ONLY "public"."scms_events"
    ADD CONSTRAINT "scms_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."scms_finance_requests"
    ADD CONSTRAINT "scms_finance_requests_pkey" PRIMARY KEY ("request_id");



ALTER TABLE ONLY "public"."scms_grievances"
    ADD CONSTRAINT "scms_grievances_pkey" PRIMARY KEY ("grievance_id");



ALTER TABLE ONLY "public"."scms_kv"
    ADD CONSTRAINT "scms_kv_pkey" PRIMARY KEY ("council_id", "key");



ALTER TABLE ONLY "public"."scms_meetings"
    ADD CONSTRAINT "scms_meetings_pkey" PRIMARY KEY ("meeting_id");



ALTER TABLE ONLY "public"."scms_members"
    ADD CONSTRAINT "scms_members_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."scms_members"
    ADD CONSTRAINT "scms_members_pkey" PRIMARY KEY ("member_id");



ALTER TABLE ONLY "public"."scms_profiles"
    ADD CONSTRAINT "scms_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."scms_sessions"
    ADD CONSTRAINT "scms_sessions_pkey" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."scms_tasks"
    ADD CONSTRAINT "scms_tasks_pkey" PRIMARY KEY ("task_id");



ALTER TABLE ONLY "public"."scms_team_members"
    ADD CONSTRAINT "scms_team_members_pkey" PRIMARY KEY ("team_id", "user_id");



ALTER TABLE ONLY "public"."scms_teams"
    ADD CONSTRAINT "scms_teams_council_id_name_key" UNIQUE ("council_id", "name");



ALTER TABLE ONLY "public"."scms_teams"
    ADD CONSTRAINT "scms_teams_pkey" PRIMARY KEY ("team_id");



CREATE INDEX "ff_answers_submission_idx" ON "public"."ff_answers" USING "btree" ("submission_id");



CREATE INDEX "ff_questions_cycle_position_idx" ON "public"."ff_questions" USING "btree" ("cycle_id", "position");



CREATE INDEX "ff_submissions_cycle_faculty_idx" ON "public"."ff_submissions" USING "btree" ("cycle_id", "faculty_id");



CREATE INDEX "scms_events_created_by_member_id_idx" ON "public"."scms_events" USING "btree" ("created_by_member_id");



CREATE INDEX "scms_grievances_submitted_member_id_idx" ON "public"."scms_grievances" USING "btree" ("submitted_member_id");



CREATE INDEX "scms_meetings_created_by_member_id_idx" ON "public"."scms_meetings" USING "btree" ("created_by_member_id");



CREATE INDEX "scms_sessions_expires_at_idx" ON "public"."scms_sessions" USING "btree" ("expires_at");



CREATE INDEX "scms_sessions_member_id_idx" ON "public"."scms_sessions" USING "btree" ("member_id");



CREATE INDEX "scms_tasks_assigned_member_id_idx" ON "public"."scms_tasks" USING "btree" ("assigned_member_id");



CREATE INDEX "scms_tasks_created_by_member_id_idx" ON "public"."scms_tasks" USING "btree" ("created_by_member_id");



CREATE OR REPLACE TRIGGER "trg_scms_kv_updated_at" BEFORE UPDATE ON "public"."scms_kv" FOR EACH ROW EXECUTE FUNCTION "public"."scms_kv_set_updated_at"();



ALTER TABLE ONLY "public"."ff_answers"
    ADD CONSTRAINT "ff_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."ff_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ff_answers"
    ADD CONSTRAINT "ff_answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."ff_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ff_profiles"
    ADD CONSTRAINT "ff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ff_questions"
    ADD CONSTRAINT "ff_questions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."ff_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ff_submissions"
    ADD CONSTRAINT "ff_submissions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."ff_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ff_submissions"
    ADD CONSTRAINT "ff_submissions_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scms_achievements"
    ADD CONSTRAINT "scms_achievements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_approvals"
    ADD CONSTRAINT "scms_approvals_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_approvals"
    ADD CONSTRAINT "scms_approvals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_calendar_items"
    ADD CONSTRAINT "scms_calendar_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_documents"
    ADD CONSTRAINT "scms_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_event_feedback"
    ADD CONSTRAINT "scms_event_feedback_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."scms_events"("event_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scms_event_feedback"
    ADD CONSTRAINT "scms_event_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scms_event_media"
    ADD CONSTRAINT "scms_event_media_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."scms_events"("event_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scms_event_media"
    ADD CONSTRAINT "scms_event_media_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_events"
    ADD CONSTRAINT "scms_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_finance_requests"
    ADD CONSTRAINT "scms_finance_requests_principal_decided_by_fkey" FOREIGN KEY ("principal_decided_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_finance_requests"
    ADD CONSTRAINT "scms_finance_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_finance_requests"
    ADD CONSTRAINT "scms_finance_requests_treasury_decided_by_fkey" FOREIGN KEY ("treasury_decided_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_grievances"
    ADD CONSTRAINT "scms_grievances_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_grievances"
    ADD CONSTRAINT "scms_grievances_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_meetings"
    ADD CONSTRAINT "scms_meetings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_profiles"
    ADD CONSTRAINT "scms_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scms_sessions"
    ADD CONSTRAINT "scms_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."scms_members"("member_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scms_tasks"
    ADD CONSTRAINT "scms_tasks_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."scms_teams"("team_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_tasks"
    ADD CONSTRAINT "scms_tasks_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_tasks"
    ADD CONSTRAINT "scms_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_team_members"
    ADD CONSTRAINT "scms_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."scms_teams"("team_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scms_team_members"
    ADD CONSTRAINT "scms_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scms_teams"
    ADD CONSTRAINT "scms_teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scms_teams"
    ADD CONSTRAINT "scms_teams_lead_user_id_fkey" FOREIGN KEY ("lead_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE "public"."ff_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ff_answers_select_own_or_hod" ON "public"."ff_answers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ff_submissions" "s"
  WHERE (("s"."id" = "ff_answers"."submission_id") AND (("s"."student_user_id" = "auth"."uid"()) OR "public"."ff_is_hod"())))));



CREATE POLICY "ff_answers_student_insert" ON "public"."ff_answers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ff_submissions" "s"
  WHERE (("s"."id" = "ff_answers"."submission_id") AND ("s"."student_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."ff_cycles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ff_cycles_hod_delete" ON "public"."ff_cycles" FOR DELETE TO "authenticated" USING ("public"."ff_is_hod"());



CREATE POLICY "ff_cycles_hod_insert" ON "public"."ff_cycles" FOR INSERT TO "authenticated" WITH CHECK ("public"."ff_is_hod"());



CREATE POLICY "ff_cycles_hod_update" ON "public"."ff_cycles" FOR UPDATE TO "authenticated" USING ("public"."ff_is_hod"()) WITH CHECK ("public"."ff_is_hod"());



CREATE POLICY "ff_cycles_select_authenticated" ON "public"."ff_cycles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."ff_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ff_profiles_select_self_or_hod" ON "public"."ff_profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."ff_is_hod"()));



ALTER TABLE "public"."ff_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ff_questions_hod_delete" ON "public"."ff_questions" FOR DELETE TO "authenticated" USING ("public"."ff_is_hod"());



CREATE POLICY "ff_questions_hod_insert" ON "public"."ff_questions" FOR INSERT TO "authenticated" WITH CHECK ("public"."ff_is_hod"());



CREATE POLICY "ff_questions_hod_update" ON "public"."ff_questions" FOR UPDATE TO "authenticated" USING ("public"."ff_is_hod"()) WITH CHECK ("public"."ff_is_hod"());



CREATE POLICY "ff_questions_select_authenticated" ON "public"."ff_questions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."ff_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ff_submissions_student_insert" ON "public"."ff_submissions" FOR INSERT TO "authenticated" WITH CHECK ((("student_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."ff_profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."role" = 'student'::"text"))))));



CREATE POLICY "ff_submissions_student_select_own" ON "public"."ff_submissions" FOR SELECT TO "authenticated" USING ((("student_user_id" = "auth"."uid"()) OR "public"."ff_is_hod"()));



ALTER TABLE "public"."scms_achievements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_achievements_manage" ON "public"."scms_achievements" TO "authenticated" USING (("public"."scms_is_privileged"() OR ("created_by" = "auth"."uid"()))) WITH CHECK (("public"."scms_is_privileged"() OR ("created_by" = "auth"."uid"())));



CREATE POLICY "scms_achievements_public" ON "public"."scms_achievements" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."scms_approvals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_approvals_manage" ON "public"."scms_approvals" TO "authenticated" USING (("public"."scms_is_privileged"() OR ("requested_by" = "auth"."uid"()))) WITH CHECK (("public"."scms_is_privileged"() OR ("requested_by" = "auth"."uid"())));



CREATE POLICY "scms_approvals_select" ON "public"."scms_approvals" FOR SELECT TO "authenticated" USING (("council_id" = "public"."scms_my_council"()));



ALTER TABLE "public"."scms_calendar_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_calendar_manage" ON "public"."scms_calendar_items" TO "authenticated" USING (("public"."scms_is_privileged"() OR ("created_by" = "auth"."uid"()))) WITH CHECK (("council_id" = "public"."scms_my_council"()));



CREATE POLICY "scms_calendar_select" ON "public"."scms_calendar_items" FOR SELECT TO "authenticated" USING (("council_id" = "public"."scms_my_council"()));



CREATE POLICY "scms_docs_manage" ON "public"."scms_documents" TO "authenticated" USING (("public"."scms_is_privileged"() OR ("uploaded_by" = "auth"."uid"()))) WITH CHECK (("council_id" = "public"."scms_my_council"()));



CREATE POLICY "scms_docs_select" ON "public"."scms_documents" FOR SELECT TO "authenticated" USING (("council_id" = "public"."scms_my_council"()));



ALTER TABLE "public"."scms_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scms_event_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scms_event_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scms_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_events_manage" ON "public"."scms_events" TO "authenticated" USING (("public"."scms_is_privileged"() OR ("created_by" = "auth"."uid"()))) WITH CHECK (("public"."scms_is_privileged"() OR ("created_by" = "auth"."uid"())));



CREATE POLICY "scms_events_public" ON "public"."scms_events" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "scms_feedback_rw" ON "public"."scms_event_feedback" TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."scms_is_privileged"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."scms_is_privileged"()));



CREATE POLICY "scms_finance_insert" ON "public"."scms_finance_requests" FOR INSERT TO "authenticated" WITH CHECK ((("council_id" = "public"."scms_my_council"()) AND ("requested_by" = "auth"."uid"())));



ALTER TABLE "public"."scms_finance_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_finance_select" ON "public"."scms_finance_requests" FOR SELECT TO "authenticated" USING (("council_id" = "public"."scms_my_council"()));



CREATE POLICY "scms_finance_update" ON "public"."scms_finance_requests" FOR UPDATE TO "authenticated" USING (("public"."scms_is_principal_or_treasury"() OR ("requested_by" = "auth"."uid"()))) WITH CHECK (("public"."scms_is_principal_or_treasury"() OR ("requested_by" = "auth"."uid"())));



ALTER TABLE "public"."scms_grievances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_grievances_insert" ON "public"."scms_grievances" FOR INSERT TO "authenticated" WITH CHECK ((("submitted_by" = "auth"."uid"()) AND ("council_id" = "public"."scms_my_council"())));



CREATE POLICY "scms_grievances_select" ON "public"."scms_grievances" FOR SELECT TO "authenticated" USING ((("submitted_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()) OR "public"."scms_is_privileged"()));



CREATE POLICY "scms_grievances_update" ON "public"."scms_grievances" FOR UPDATE TO "authenticated" USING ((("submitted_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()) OR "public"."scms_is_privileged"())) WITH CHECK ((("submitted_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()) OR "public"."scms_is_privileged"()));



ALTER TABLE "public"."scms_kv" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_media_manage" ON "public"."scms_event_media" TO "authenticated" USING (("public"."scms_is_privileged"() OR ("uploaded_by" = "auth"."uid"()))) WITH CHECK (("public"."scms_is_privileged"() OR ("uploaded_by" = "auth"."uid"())));



CREATE POLICY "scms_media_public" ON "public"."scms_event_media" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."scms_meetings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_meetings_rw" ON "public"."scms_meetings" TO "authenticated" USING ((("council_id" = "public"."scms_my_council"()) AND ("public"."scms_is_privileged"() OR ("created_by" = "auth"."uid"())))) WITH CHECK ((("council_id" = "public"."scms_my_council"()) AND ("public"."scms_is_privileged"() OR ("created_by" = "auth"."uid"()))));



ALTER TABLE "public"."scms_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scms_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_profiles_insert" ON "public"."scms_profiles" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."scms_is_privileged"()));



CREATE POLICY "scms_profiles_select" ON "public"."scms_profiles" FOR SELECT TO "authenticated" USING (("council_id" = "public"."scms_my_council"()));



CREATE POLICY "scms_profiles_update" ON "public"."scms_profiles" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."scms_is_privileged"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."scms_is_privileged"()));



ALTER TABLE "public"."scms_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scms_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_tasks_delete" ON "public"."scms_tasks" FOR DELETE TO "authenticated" USING (("public"."scms_is_privileged"() OR ("created_by" = "auth"."uid"())));



CREATE POLICY "scms_tasks_insert" ON "public"."scms_tasks" FOR INSERT TO "authenticated" WITH CHECK ((("council_id" = "public"."scms_my_council"()) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "scms_tasks_select" ON "public"."scms_tasks" FOR SELECT TO "authenticated" USING (("council_id" = "public"."scms_my_council"()));



CREATE POLICY "scms_tasks_update" ON "public"."scms_tasks" FOR UPDATE TO "authenticated" USING ((("council_id" = "public"."scms_my_council"()) AND ("public"."scms_is_privileged"() OR ("assigned_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."scms_team_members" "tm"
  WHERE (("tm"."team_id" = "scms_tasks"."assigned_team_id") AND ("tm"."user_id" = "auth"."uid"()))))))) WITH CHECK (("council_id" = "public"."scms_my_council"()));



ALTER TABLE "public"."scms_team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scms_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scms_teams_manage" ON "public"."scms_teams" TO "authenticated" USING (("public"."scms_is_privileged"() OR ("lead_user_id" = "auth"."uid"()))) WITH CHECK (("public"."scms_is_privileged"() OR ("lead_user_id" = "auth"."uid"())));



CREATE POLICY "scms_teams_select" ON "public"."scms_teams" FOR SELECT TO "authenticated" USING (("council_id" = "public"."scms_my_council"()));



CREATE POLICY "scms_tm_manage" ON "public"."scms_team_members" TO "authenticated" USING (("public"."scms_is_privileged"() OR (EXISTS ( SELECT 1
   FROM "public"."scms_teams" "t"
  WHERE (("t"."team_id" = "scms_team_members"."team_id") AND ("t"."lead_user_id" = "auth"."uid"())))))) WITH CHECK (("public"."scms_is_privileged"() OR (EXISTS ( SELECT 1
   FROM "public"."scms_teams" "t"
  WHERE (("t"."team_id" = "scms_team_members"."team_id") AND ("t"."lead_user_id" = "auth"."uid"()))))));



CREATE POLICY "scms_tm_select" ON "public"."scms_team_members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."scms_teams" "t"
  WHERE (("t"."team_id" = "scms_team_members"."team_id") AND ("t"."council_id" = "public"."scms_my_council"())))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."ff_handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."ff_handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ff_handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ff_is_hod"() TO "anon";
GRANT ALL ON FUNCTION "public"."ff_is_hod"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ff_is_hod"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."scms_handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."scms_handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."scms_is_principal_or_treasury"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."scms_is_principal_or_treasury"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."scms_is_privileged"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."scms_is_privileged"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."scms_kv_get"("p_token" "text", "p_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."scms_kv_get"("p_token" "text", "p_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."scms_kv_set"("p_token" "text", "p_key" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."scms_kv_set"("p_token" "text", "p_key" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."scms_kv_set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."scms_login"("p_email" "text", "p_password" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."scms_login"("p_email" "text", "p_password" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."scms_logout"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."scms_logout"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."scms_my_council"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."scms_my_council"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."scms_session_member"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."scms_session_member"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."scms_set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."ff_answers" TO "anon";
GRANT ALL ON TABLE "public"."ff_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."ff_answers" TO "service_role";



GRANT ALL ON TABLE "public"."ff_cycles" TO "anon";
GRANT ALL ON TABLE "public"."ff_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."ff_cycles" TO "service_role";



GRANT ALL ON TABLE "public"."ff_profiles" TO "anon";
GRANT ALL ON TABLE "public"."ff_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."ff_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ff_questions" TO "anon";
GRANT ALL ON TABLE "public"."ff_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."ff_questions" TO "service_role";



GRANT ALL ON TABLE "public"."ff_submissions" TO "anon";
GRANT ALL ON TABLE "public"."ff_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."ff_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."scms_achievements" TO "anon";
GRANT ALL ON TABLE "public"."scms_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."scms_approvals" TO "anon";
GRANT ALL ON TABLE "public"."scms_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."scms_calendar_items" TO "anon";
GRANT ALL ON TABLE "public"."scms_calendar_items" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_calendar_items" TO "service_role";



GRANT ALL ON TABLE "public"."scms_documents" TO "anon";
GRANT ALL ON TABLE "public"."scms_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_documents" TO "service_role";



GRANT ALL ON TABLE "public"."scms_event_feedback" TO "anon";
GRANT ALL ON TABLE "public"."scms_event_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_event_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."scms_event_media" TO "anon";
GRANT ALL ON TABLE "public"."scms_event_media" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_event_media" TO "service_role";



GRANT ALL ON TABLE "public"."scms_events" TO "anon";
GRANT ALL ON TABLE "public"."scms_events" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_events" TO "service_role";



GRANT ALL ON TABLE "public"."scms_finance_requests" TO "anon";
GRANT ALL ON TABLE "public"."scms_finance_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_finance_requests" TO "service_role";



GRANT ALL ON TABLE "public"."scms_grievances" TO "anon";
GRANT ALL ON TABLE "public"."scms_grievances" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_grievances" TO "service_role";



GRANT ALL ON TABLE "public"."scms_kv" TO "anon";
GRANT ALL ON TABLE "public"."scms_kv" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_kv" TO "service_role";



GRANT ALL ON TABLE "public"."scms_meetings" TO "anon";
GRANT ALL ON TABLE "public"."scms_meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_meetings" TO "service_role";



GRANT ALL ON TABLE "public"."scms_members" TO "anon";
GRANT ALL ON TABLE "public"."scms_members" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_members" TO "service_role";



GRANT ALL ON TABLE "public"."scms_profiles" TO "anon";
GRANT ALL ON TABLE "public"."scms_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."scms_sessions" TO "anon";
GRANT ALL ON TABLE "public"."scms_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."scms_tasks" TO "anon";
GRANT ALL ON TABLE "public"."scms_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."scms_team_members" TO "anon";
GRANT ALL ON TABLE "public"."scms_team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_team_members" TO "service_role";



GRANT ALL ON TABLE "public"."scms_teams" TO "anon";
GRANT ALL ON TABLE "public"."scms_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."scms_teams" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







