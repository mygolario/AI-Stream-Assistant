from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class KBItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, example="Gaming PC Specs")
    category: str = Field(default="faq", example="pc_specs", description="faq, pc_specs, links, doc")
    content: str = Field(..., min_length=1, example="CPU: Ryzen 7 7800X3D, GPU: RTX 4080 Super")


class KBItemCreate(KBItemBase):
    pass


class KBItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None)
    content: Optional[str] = Field(None)


class KBItemResponse(KBItemBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
