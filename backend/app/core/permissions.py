from fastapi import HTTPException

MEMBER = "MEMBER"
LEAD = "LEAD"
SUPER_ADMIN = "SUPER_ADMIN"
FINANCE_FUTURE_MESSAGE = "Finance & Budget features are planned for a future update."

def authority_level(auth: dict) -> str:
    if bool(auth.get("is_super_admin")) or str(auth.get("authority_level", "")).upper() == SUPER_ADMIN:
        return SUPER_ADMIN
    return str(auth.get("authority_level", MEMBER)).upper()

def require_access(resource: str, action: str, auth: dict):
    level = authority_level(auth)
    if resource == "finances":
        raise HTTPException(501, FINANCE_FUTURE_MESSAGE)
    if level not in {MEMBER, LEAD, SUPER_ADMIN}:
        raise HTTPException(403, "This account is not authorized to use the council workspace.")
    if action == "read":
        return
    if level in {LEAD, SUPER_ADMIN}:
        return
    if action == "create" and resource in {"tasks", "events", "meetings", "grievances"}:
        return
    raise HTTPException(403, "Lead-level permission is required for this action.")

def require_lead(auth: dict):
    if authority_level(auth) not in {LEAD, SUPER_ADMIN}:
        raise HTTPException(403, "Lead-level permission is required for this action.")

def is_lead_or_admin(auth: dict) -> bool:
    return authority_level(auth) in {LEAD, SUPER_ADMIN}
