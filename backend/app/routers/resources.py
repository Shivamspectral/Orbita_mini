from typing import Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.services.supabase import db
from app.core.auth import get_auth
from app.config import COUNCIL_ID
from app.core.permissions import require_access, require_lead, is_lead_or_admin, FINANCE_FUTURE_MESSAGE

router=APIRouter(prefix='/api',tags=['resources'])
TABLES={'tasks':'scms_tasks','events':'scms_events','meetings':'scms_meetings','finances':'scms_finance_requests','grievances':'scms_grievances'}
PK={'tasks':'task_id','events':'event_id','meetings':'meeting_id','finances':'request_id','grievances':'grievance_id'}

async def profile_uuid_by_member(member_id):
    # Legacy bridge for deployments that also have Supabase auth profiles.
    ms=await db.select('scms_members',{'select':'email','member_id':f'eq.{member_id}','limit':'1'})
    if not ms:return None
    ps=await db.select('scms_profiles',{'select':'user_id','email':f'eq.{ms[0]["email"]}','limit':'1'})
    return ps[0]['user_id'] if ps else None

async def member_by_uuid(uid):
    if not uid:return None
    ps=await db.select('scms_profiles',{'select':'email','user_id':f'eq.{uid}','limit':'1'})
    if not ps:return None
    ms=await db.select('scms_members',{'select':'member_id,name,role_name,email','email':f'eq.{ps[0]["email"]}','limit':'1'})
    return ms[0] if ms else None

async def member_by_id(member_id):
    if member_id in (None,''):return None
    ms=await db.select('scms_members',{'select':'member_id,name,role_name,email','member_id':f'eq.{member_id}','limit':'1'})
    return ms[0] if ms else None

def iso_date(v):
    if not v:return ''
    return str(v)[:10]
def iso_time(v):
    if not v:return ''
    s=str(v); return s[11:19] if len(s)>18 else ''

def title_status(v): return str(v or '').replace('_',' ').title()
def db_status(v):
    return {'Pending':'pending','In Progress':'in_progress','Completed':'completed','Cancelled':'cancelled','Approved':'approved','Rejected':'rejected','Pending Treasury':'pending_principal','Open':'open','Resolved':'resolved','Closed':'closed','In Review':'in_review'}.get(str(v),str(v).lower())

async def list_rows(resource,auth):
    table=TABLES[resource]
    params={'select':'*','council_id':f'eq.{auth["council_id"]}'}
    if resource == 'grievances' and not is_lead_or_admin(auth):
        # Privacy is enforced here, before any grievance rows reach the browser.
        params['or'] = f'is_anonymous.eq.true,submitted_member_id.eq.{auth["member_id"]}'
    rows=await db.select(table,params)
    out=[]
    for r in rows or []:
        x=dict(r); x['id']=r[PK[resource]]
        if resource=='tasks':
            x['status']=title_status(r.get('status')); x['priority']=title_status(r.get('priority')); x['due_date']=iso_date(r.get('due_at'))
            am=await member_by_id(r.get('assigned_member_id')) or await member_by_uuid(r.get('assigned_user_id'))
            x['assigned_to']=am['member_id'] if am else None; x['assigned_name']=am['name'] if am else ''
            x['assigned_team']=r.get('assigned_team_id') or ''
            creator_member_id=r.get('created_by_member_id')
            creator_obj=await member_by_id(creator_member_id) if creator_member_id else None
            creator_obj=creator_obj or (await member_by_uuid(r.get('created_by')) if r.get('created_by') else None)
            x['created_by']=creator_obj.get('member_id') if creator_obj else creator_member_id
        elif resource=='events':
            x['date']=iso_date(r.get('starts_at')); x['time']=iso_time(r.get('starts_at')); x['location']=r.get('venue') or ''; x['feedback_enabled']=r.get('feedback_enabled',True); x.setdefault('type','Council Event')
            creator_member_id=r.get('created_by_member_id'); creator_obj=await member_by_id(creator_member_id) if creator_member_id else None; creator_obj=creator_obj or (await member_by_uuid(r.get('created_by')) if r.get('created_by') else None); x['created_by']=creator_obj.get('member_id') if creator_obj else creator_member_id
        elif resource=='meetings':
            x['date']=iso_date(r.get('scheduled_at')); x['time']=iso_time(r.get('scheduled_at')); x['status']='Completed' if str(r.get('minutes') or '').startswith('[SYSTEM_STATUS:completed]') else 'Scheduled'; x['type']=r.get('type','Regular')
            creator_member_id=r.get('created_by_member_id'); creator_obj=await member_by_id(creator_member_id) if creator_member_id else None; creator_obj=creator_obj or (await member_by_uuid(r.get('created_by')) if r.get('created_by') else None); x['created_by']=creator_obj.get('member_id') if creator_obj else creator_member_id
        elif resource=='finances':
            st=str(r.get('status','pending_principal')); x['status']={'pending_principal':'Pending','principal_approved':'Principal Approved','principal_rejected':'Principal Rejected','treasury_approved':'Treasury Approved','treasury_rejected':'Treasury Rejected','pending_treasury':'Pending Treasury','approved':'Approved','rejected':'Rejected'}.get(st,title_status(st)); x['requester']=''; x['created_by']=(await member_by_uuid(r.get('requested_by')) or {}).get('member_id') if r.get('requested_by') else None
            if r.get('requested_by'):
                am=await member_by_uuid(r['requested_by']); x['requester']=am['name'] if am else ''
        elif resource=='grievances':
            anonymous=bool(r.get('is_anonymous',False))
            x['subject']=r.get('title','')
            x['status']=title_status(r.get('status','open'))
            x['is_anonymous']=anonymous

            # Privacy boundary:
            # - The database always retains the real submitter identity.
            # - Anonymous grievances NEVER expose that identity through the API.
            # - Identified grievances expose the submitter only to the submitter
            #   themselves or to lead/super-admin users. Ordinary members cannot
            #   access other members' identified grievances because the query
            #   above filters them out.
            if anonymous:
                x['submitted_by']=None
                x['submitted_member_id']=None
                x['created_by']=None
            else:
                x['created_by']=r.get('submitted_member_id')
        out.append(x)
    return out

@router.get('/members')
async def members(auth=Depends(get_auth)):
    require_access('members', 'read', auth)
    rows=await db.select('scms_members',{'select':'member_id,council_id,name,role_name,email,is_super_admin,account_type,authority_level,committee_id,created_at','council_id':f'eq.{auth["council_id"]}','order':'member_id.asc'}); return [dict(r, id=r['member_id'], role=r.get('role_name'), authority_level=str(r.get('authority_level') or 'MEMBER').upper()) for r in rows or []]

@router.get('/{resource}')
async def list_resource(resource:str,auth=Depends(get_auth)):
    if resource not in TABLES: raise HTTPException(404,'Resource not found.')
    require_access(resource, 'read', auth)
    return await list_rows(resource,auth)

@router.post('/{resource}')
async def create_resource(resource:str,body:dict[str,Any],auth=Depends(get_auth)):
    if resource not in TABLES: raise HTTPException(404,'Resource not found.')
    require_access(resource, 'create', auth)
    table=TABLES[resource]; x=dict(body); x.pop('id',None); x['council_id']=auth['council_id']
    creator=await profile_uuid_by_member(auth['member_id'])
    if resource=='tasks':
        assigned=x.pop('assigned_to',None); x.pop('assigned_name',None); x.pop('assigned_team',None); x.pop('category',None)
        if assigned not in (None,''):
            try: assigned=int(assigned)
            except: raise HTTPException(400,'Invalid assignee.')
            uid=await profile_uuid_by_member(assigned)
            # scms_tasks.assigned_user_id is an auth.users UUID. The current
            # project intentionally uses custom scms_members authentication,
            # so members may not yet have a corresponding scms_profiles/auth.users
            # row. In that case leave the optional assignment unset instead of
            # turning an otherwise valid task creation into a 400 error.
            x['assigned_member_id']=assigned
            if uid: x['assigned_user_id']=uid
        if x.get('due_date'): x['due_at']=x.pop('due_date')+'T00:00:00+00:00'
        x['status']=db_status(x.get('status','Pending')); x['priority']=db_status(x.get('priority','Medium'))
        x['created_by_member_id']=auth['member_id']
        if creator: x['created_by']=creator
    elif resource=='events':
        date=x.pop('date',None); time=x.pop('time',None) or '00:00'; x.pop('photos',None); x.pop('priority',None); x.pop('organizer',None); x.pop('registration_enabled',None); x.pop('feedback_prompt',None); x.pop('is_public',None); x.pop('type',None)
        if date: x['starts_at']=f'{date}T{time}:00+00:00' if len(time)==5 else f'{date}T{time}+00:00'
        x['venue']=x.pop('location',x.get('venue','')); x['created_by_member_id']=auth['member_id']
        if creator: x['created_by']=creator
    elif resource=='meetings':
        date=x.pop('date',None); time=x.pop('time',None) or '00:00'; x.pop('type',None); x.pop('status',None)
        if date:x['scheduled_at']=f'{date}T{time}:00+00:00' if len(time)==5 else f'{date}T{time}+00:00'
        x['created_by_member_id']=auth['member_id']
        if creator: x['created_by']=creator
    elif resource=='finances':
        x['status']='pending_principal'; x['requested_by']=creator; x.pop('type',None)
    elif resource=='grievances':
        x['title']=x.pop('subject',x.get('title',''))
        anonymous=bool(x.pop('is_anonymous',False))
        x['is_anonymous']=anonymous
        # Always retain the real submitter in the database. Anonymous is only
        # a visibility choice; it must never erase the audit trail.
        x['submitted_by']=creator
        x['submitted_member_id']=auth['member_id']
        x.pop('priority',None); x.pop('category',None)
    allowed={'tasks':{'council_id','title','description','status','priority','assigned_user_id','assigned_member_id','assigned_team_id','due_at','created_by','created_by_member_id','completed_at'},'events':{'council_id','title','description','venue','starts_at','ends_at','feedback_enabled','created_by','created_by_member_id'},'meetings':{'council_id','title','agenda','scheduled_at','location','minutes','created_by','created_by_member_id'},'finances':{'council_id','title','description','amount','budget_code','status','requested_by'},'grievances':{'council_id','title','description','status','assigned_to','resolution','submitted_by','submitted_member_id','is_anonymous'}}[resource]
    x={k:v for k,v in x.items() if k in allowed and v is not None}
    result=await db.insert(table,x); rows=await list_rows(resource,auth); rid=(result[0][PK[resource]] if isinstance(result,list) and result else None); return next((r for r in rows if str(r['id'])==str(rid)), result[0] if isinstance(result,list) and result else result)

async def can_member_edit(resource: str, record_id: str, auth: dict) -> bool:
    if is_lead_or_admin(auth): return True
    pk=PK[resource]
    rows=await db.select(TABLES[resource],{'select':'*',pk:f'eq.{record_id}','council_id':f'eq.{auth["council_id"]}','limit':'1'})
    if not rows: raise HTTPException(404,'Record not found.')
    row=rows[0]
    member_id=auth['member_id']
    if resource=='tasks':
        if row.get('created_by_member_id') == member_id or row.get('assigned_member_id') == member_id:
            return True
        created=await member_by_uuid(row.get('created_by'))
        assigned=await member_by_uuid(row.get('assigned_user_id'))
        return bool((created and created.get('member_id')==member_id) or (assigned and assigned.get('member_id')==member_id))
    if resource in {'events','meetings'}:
        if row.get('created_by_member_id') == member_id:
            return True
        created=await member_by_uuid(row.get('created_by'))
        return bool(created and created.get('member_id')==member_id)
    if resource=='grievances':
        if bool(row.get('is_anonymous')):
            return False
        if row.get('submitted_member_id') == member_id:
            return True
        submitted=await member_by_uuid(row.get('submitted_by'))
        return bool(submitted and submitted.get('member_id')==member_id)
    return False

@router.patch('/{resource}/{record_id}')
async def update_resource(resource:str,record_id:str,body:dict[str,Any],auth=Depends(get_auth)):
    if resource not in TABLES: raise HTTPException(404,'Resource not found.')
    # Members may update records they own/are assigned to. Do this ownership
    # check before the blanket lead-level mutation gate; otherwise the member
    # path is unreachable and assigned members can never complete tasks.
    if not is_lead_or_admin(auth):
        if resource == 'finances':
            raise HTTPException(501, FINANCE_FUTURE_MESSAGE)
        if not await can_member_edit(resource, record_id, auth):
            raise HTTPException(403, 'You can only update records you created or are assigned to.')
    else:
        require_access(resource, 'update', auth)
    pk=PK[resource]; x=dict(body); x.pop('id',None); x.pop('council_id',None)
    if resource=='tasks':
        if 'assigned_to' in x:
            a=x.pop('assigned_to'); a_int=int(a) if a not in (None,'') else None; x['assigned_member_id']=a_int; x['assigned_user_id']=await profile_uuid_by_member(a_int) if a_int is not None else None
        if 'due_date' in x:x['due_at']=x.pop('due_date')+'T00:00:00+00:00' if x['due_date'] else None
        if 'status' in x:x['status']=db_status(x['status'])
        if 'priority' in x:x['priority']=db_status(x['priority'])
        x.pop('assigned_team',None); x.pop('category',None); x.pop('assigned_name',None); x.pop('completed_by',None)
    elif resource=='events':
        if 'date' in x:
            d=x.pop('date'); x['starts_at']=f'{d}T00:00:00+00:00' if d else None
        x.pop('location',None); x.pop('type',None); x.pop('photos',None); x.pop('priority',None); x.pop('organizer',None); x.pop('registration_enabled',None); x.pop('feedback_prompt',None); x.pop('is_public',None)
    elif resource=='meetings':
        if 'status' in x:
            if str(x.pop('status')).lower()=='completed': x['minutes']='[SYSTEM_STATUS:completed]\n'+str(x.get('minutes') or '')
            else: x['minutes']=str(x.get('minutes') or '').replace('[SYSTEM_STATUS:completed]\n','')
        if 'date' in x:
            d=x.pop('date'); t=x.pop('time','00:00'); x['scheduled_at']=f'{d}T{t}:00+00:00' if d else None
        else:x.pop('time',None)
        x.pop('type',None)

    elif resource=='finances':
        if 'status' in x:
            value=str(x['status'])
            x['status']={
                'Pending':'pending_principal',
                'Pending Treasury':'pending_principal',
                'Approved':'principal_approved',
                'Rejected':'principal_rejected',
                'Principal Approved':'principal_approved',
                'Principal Rejected':'principal_rejected',
                'Treasury Approved':'treasury_approved',
                'Treasury Rejected':'treasury_rejected'
            }.get(value,value.lower())
    elif resource=='grievances':
        if 'subject' in x:x['title']=x.pop('subject')
        x.pop('priority',None); x.pop('category',None)
        # Privacy state is immutable after submission. In particular, never
        # allow an anonymous ticket to be converted into an identified one.
        x.pop('is_anonymous',None)
        if 'status' in x:x['status']=db_status(x['status'])
    if not is_lead_or_admin(auth):
        # A member may edit the allowed content of their own/assigned record,
        # but cannot transfer ownership or rewrite the creator identity.
        for protected in ('created_by','created_by_member_id','submitted_by','submitted_member_id','assigned_user_id','assigned_member_id'):
            x.pop(protected,None)
    allowed={k for k in x if k not in ('id','created_at','updated_at')}
    x={k:v for k,v in x.items() if k in allowed}
    rows=await db.update(TABLES[resource],{pk:f'eq.{record_id}','council_id':f'eq.{auth["council_id"]}'},x)
    if not rows:raise HTTPException(404,'Record not found.')
    fresh=await list_rows(resource,auth)
    return next((r for r in fresh if str(r['id'])==str(record_id)), rows[0])

@router.delete('/{resource}/{record_id}')
async def delete_resource(resource:str,record_id:str,auth=Depends(get_auth)):
    if resource not in TABLES:raise HTTPException(404,'Resource not found.')
    require_access(resource, 'delete', auth)
    rows=await db.delete(TABLES[resource],{PK[resource]:f'eq.{record_id}','council_id':f'eq.{auth["council_id"]}'})
    if not rows:raise HTTPException(404,'Record not found.')
    return {'ok':True}

@router.get('/teams/{team_id}/budget')
async def team_budget(team_id:str,auth=Depends(get_auth)):
    raise HTTPException(501, FINANCE_FUTURE_MESSAGE)
    finances=await db.select('scms_finance_requests',{'select':'amount,status','council_id':f'eq.{auth["council_id"]}'})
    used=sum(float(x.get('amount') or 0) for x in finances if x.get('status')=='approved'); pending=sum(float(x.get('amount') or 0) for x in finances if x.get('status') in ('pending_principal','pending_treasury'))
    return {'budget':{'allocated':0,'used':used,'pending_requests':pending,'remaining':0,'utilization':0,'fiscal_year':'2026-27','notes':'Budget allocation is not represented in the current Supabase schema.'},'counts':{}}

@router.get('/teams/{team_id}/budget/transactions')
async def budget_transactions(team_id:str,auth=Depends(get_auth)):
    raise HTTPException(501, FINANCE_FUTURE_MESSAGE)

@router.get('/health/data')
async def data_health(auth=Depends(get_auth)):
    require_lead(auth)
    tables=['scms_members','scms_profiles','scms_sessions','scms_tasks','scms_events','scms_meetings','scms_finance_requests','scms_grievances','scms_documents','scms_teams','scms_team_members','scms_approvals','scms_achievements','scms_calendar_items','scms_event_media','scms_event_feedback','scms_kv']
    out={}
    for t in tables:
        try: await db.select(t,{'select':'*','council_id':f'eq.{auth["council_id"]}','limit':'1'}) if t not in ('scms_sessions','scms_profiles','scms_team_members') else await db.select(t,{'select':'*','limit':'1'}); out[t]={'ok':True}
        except HTTPException as e:out[t]={'ok':False,'error':e.detail}
    return out
