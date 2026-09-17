from fastapi import Header, HTTPException

from app.services.supabase import db


def role_key(
    role: str,
    authority_level: str = "MEMBER",
    is_super_admin: bool = False
) -> str:
    """
    Convert the database role/authority into the frontend role key.
    """

    if (
        is_super_admin
        or str(authority_level).upper() == "SUPER_ADMIN"
    ):
        return "super_admin"

    level = str(authority_level or "MEMBER").upper()

    if level == "LEAD":
        return "lead"

    return "member"


async def session_user(token: str):
    """
    Validate the local authentication token.

    Login creates tokens in this format:

        local-{member_id}

    Example:

        local-1

    The member itself is stored in scms_members, so we resolve
    the token back to that member instead of using the old
    scms_session_member RPC.
    """

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )

    # ---------------------------------------------------------
    # Validate local token format
    # ---------------------------------------------------------

    if not token.startswith("local-"):
        raise HTTPException(
            status_code=401,
            detail="Session expired or invalid. Please sign in again."
        )

    member_id_text = token[len("local-"):].strip()

    if not member_id_text:
        raise HTTPException(
            status_code=401,
            detail="Session expired or invalid. Please sign in again."
        )

    try:
        member_id = int(member_id_text)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Session expired or invalid. Please sign in again."
        )

    # ---------------------------------------------------------
    # Find the logged-in member in scms_members
    # ---------------------------------------------------------

    members = await db.select(
        "scms_members",
        {
            "select": "*",
            "member_id": f"eq.{member_id}",
            "limit": "1"
        }
    )

    if not members:
        raise HTTPException(
            status_code=401,
            detail="User account no longer exists."
        )

    member = members[0]

    # ---------------------------------------------------------
    # Check whether login is enabled
    # ---------------------------------------------------------

    if not bool(member.get("login_enabled", True)):
        raise HTTPException(
            status_code=401,
            detail="This council account is disabled."
        )

    # ---------------------------------------------------------
    # Check account type
    # ---------------------------------------------------------

    account_type = str(
        member.get("account_type") or "COUNCIL_MEMBER"
    ).upper()

    if account_type not in {
        "COUNCIL_MEMBER",
        "SUPER_ADMIN"
    }:
        raise HTTPException(
            status_code=401,
            detail="This account is not a council login account."
        )

    # ---------------------------------------------------------
    # Check authority level
    # ---------------------------------------------------------

    authority_level = str(
        member.get("authority_level") or "MEMBER"
    ).upper()

    if authority_level not in {
        "MEMBER",
        "LEAD",
        "SUPER_ADMIN"
    }:
        raise HTTPException(
            status_code=401,
            detail="This council account has an invalid authorization level."
        )

    return member


async def current_user(
    authorization: str | None
):
    """
    Resolve the Authorization header into the current member.
    """

    token = (
        (authorization or "")
        .removeprefix("Bearer ")
        .strip()
    )

    member = await session_user(token)

    authority_level = str(
        member.get("authority_level") or "MEMBER"
    ).upper()

    account_type = (
        member.get("account_type")
        or "COUNCIL_MEMBER"
    )

    is_super_admin = bool(
        member.get("is_super_admin")
    )

    return {
        "token": token,

        "member": member,

        "id": member["member_id"],
        "member_id": member["member_id"],

        "name": member["name"],
        "email": member["email"],

        "council_id": member["council_id"],

        "role_name": member["role_name"],

        "authority_level": authority_level,

        "account_type": account_type,

        "committee_id": member.get("committee_id"),

        "role": role_key(
            member.get("role_name", ""),
            authority_level,
            is_super_admin
        ),

        "is_super_admin": is_super_admin,
    }


async def get_auth(
    authorization: str | None = Header(default=None)
):
    """
    FastAPI dependency used by protected endpoints.
    """

    return await current_user(authorization)