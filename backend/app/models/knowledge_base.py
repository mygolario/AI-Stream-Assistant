from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.core.database import Base
from app.core.config import settings


class KnowledgeBaseItem(Base):
    __tablename__ = "knowledge_base_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, default="faq")  # faq, pc_specs, links, doc
    content = Column(Text, nullable=False)
    embedding = Column(Vector(settings.VECTOR_DIMENSION), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
