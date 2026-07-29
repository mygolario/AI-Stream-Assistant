"""Agency / org / mod seat APIs (Phase 3 foundation)."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, Organization, OrganizationMember

router = APIRouter()


class CreateOrgRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)


class InviteModRequest(BaseModel):
    email: str
    role: str = Field(default="mod", pattern="^(mod|owner)$")


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:100] or "org"


@router.post("/organizations")
async def create_organization(
    body: CreateOrgRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.plan not in ("pro", "agency"):
        raise HTTPException(403, "Agency workspaces require Pro/Agency plan")
    slug = _slugify(body.name)
    existing = await db.execute(select(Organization).where(Organization.slug == slug))
    if existing.scalars().first():
        slug = f"{slug}-{user.id}"
    org = Organization(name=body.name, slug=slug, plan="agency")
    db.add(org)
    await db.commit()
    await db.refresh(org)
    db.add(OrganizationMember(organization_id=org.id, user_id=user.id, role="owner"))
    user.organization_id = org.id
    user.role = "agency_admin"
    user.plan = "agency"
    await db.commit()
    return {"id": org.id, "name": org.name, "slug": org.slug}


@router.get("/organizations/mine")
async def my_organization(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.organization_id:
        return {"organization": None, "members": []}
    org = await db.get(Organization, user.organization_id)
    members_res = await db.execute(
        select(OrganizationMember).where(OrganizationMember.organization_id == user.organization_id)
    )
    members = members_res.scalars().all()
    return {
        "organization": {"id": org.id, "name": org.name, "slug": org.slug} if org else None,
        "members": [{"user_id": m.user_id, "role": m.role} for m in members],
    }


@router.post("/organizations/invite")
async def invite_mod(
    body: InviteModRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.organization_id or user.role not in ("owner", "agency_admin"):
        raise HTTPException(403, "Only org owners can invite")
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    invitee = result.scalars().first()
    if not invitee:
        raise HTTPException(404, "User must register first")
    db.add(
        OrganizationMember(
            organization_id=user.organization_id,
            user_id=invitee.id,
            role=body.role,
        )
    )
    invitee.organization_id = user.organization_id
    invitee.role = body.role
    await db.commit()
    return {"invited": invitee.email, "role": body.role}
