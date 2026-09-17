import httpx

from fastapi import HTTPException

from app.config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)


class SupabaseREST:

    async def request(
        self,
        method: str,
        path: str,
        *,
        params=None,
        json=None,
        prefer=None,
    ):
        # Check Supabase configuration
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Supabase server configuration is missing. "
                    "Put SUPABASE_SERVICE_ROLE_KEY in backend/.env."
                ),
            )

        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        }

        if prefer:
            headers["Prefer"] = prefer

        url = f"{SUPABASE_URL}/rest/v1/{path.lstrip('/')}"

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=json,
                )

        except httpx.HTTPError as error:
            raise HTTPException(
                status_code=502,
                detail=f"Supabase connection failed: {error}",
            )

        # Supabase returned an error
        if response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Supabase error: {response.text[:1200]}",
            )

        # Empty response
        if not response.content:
            return None

        # JSON response
        try:
            return response.json()
        except Exception:
            return None

    async def rpc(self, name: str, body: dict):
        return await self.request(
            "POST",
            f"rpc/{name}",
            json=body,
        )

    async def select(self, table: str, params=None):
        return await self.request(
            "GET",
            table,
            params=params,
        )

    async def insert(self, table: str, row: dict):
        return await self.request(
            "POST",
            table,
            json=row,
            prefer="return=representation",
        )

    async def update(self, table: str, filters: dict, row: dict):
        return await self.request(
            "PATCH",
            table,
            params=filters,
            json=row,
            prefer="return=representation",
        )

    async def delete(self, table: str, filters: dict):
        return await self.request(
            "DELETE",
            table,
            params=filters,
            prefer="return=representation",
        )


db = SupabaseREST()