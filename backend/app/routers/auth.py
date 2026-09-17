from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.supabase import db
from app.core.auth import role_key
from app.core.permissions import MEMBER, LEAD, SUPER_ADMIN


router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
)


class LoginRequest(BaseModel):
    email: str
    password: str


def public_user(member):
    level = str(
        member.get("authority_level") or MEMBER
    ).upper()

    admin = (
        bool(member.get("is_super_admin"))
        or level == SUPER_ADMIN
    )

    return {
        "id": member["member_id"],
        "member_id": member["member_id"],
        "name": member.get("name", ""),
        "email": member.get("email", ""),
        "council_id": member.get("council_id"),
        "role_name": member.get("role_name", ""),
        "role": role_key(
            member.get("role_name", ""),
            level,
            admin,
        ),
        "authority_level": (
            SUPER_ADMIN if admin else level
        ),
        "account_type": (
            member.get("account_type")
            or "COUNCIL_MEMBER"
        ),
        "committee_id": member.get("committee_id"),
        "is_super_admin": admin,
    }


@router.post("/login")
async def login(body: LoginRequest):

    email = body.email.strip().lower()
    password = body.password.strip().lower()

    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Email and password are required.",
        )

    # Find member by email
    members = await db.select(
        "scms_members",
        {
            "select": "*",
            "email": f"eq.{email}",
            "limit": "1",
        },
    )

    # Debug information without exposing passwords
    print("LOGIN EMAIL:", email)
    print("MEMBER FOUND:", bool(members))

    if not members:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    member = members[0]

    stored_password = str(
        member.get("password", "")
    ).strip().lower()

    print(
        "PASSWORD COLUMN FOUND:",
        "password" in member,
    )
    print(
        "STORED PASSWORD LENGTH:",
        len(stored_password),
    )
    print(
        "ENTERED PASSWORD LENGTH:",
        len(password),
    )

    if stored_password != password:
        print("PASSWORD MATCH: FALSE")

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    print("PASSWORD MATCH: TRUE")

    level = str(
        member.get("authority_level") or MEMBER
    ).upper()

    account_type = str(
        member.get("account_type")
        or "COUNCIL_MEMBER"
    ).upper()

    if account_type not in {
        "COUNCIL_MEMBER",
        "SUPER_ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "This account is not enabled for "
                "Student Council login."
            ),
        )

    if level not in {
        MEMBER,
        LEAD,
        SUPER_ADMIN,
    }:
        raise HTTPException(
            status_code=403,
            detail="Invalid authorization level.",
        )

    if (
        str(
            member.get("role_name", "")
        ).strip().lower()
        == "student"
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Student accounts do not have "
                "Student Council login access."
            ),
        )

    login_enabled = member.get(
        "login_enabled",
        True,
    )

    if isinstance(login_enabled, str):
        login_enabled = (
            login_enabled.strip().lower()
            not in {"false", "0", "no", "disabled"}
        )

    if not login_enabled:
        raise HTTPException(
            status_code=403,
            detail="This council account is disabled.",
        )

    token = f"local-{member['member_id']}"

    return {
        "token": token,
        "user": public_user(member),
    }