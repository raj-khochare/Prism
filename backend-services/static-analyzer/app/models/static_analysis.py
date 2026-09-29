import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StaticAnalysis(Base):
    __tablename__ = "static_analysis"

    analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    source_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    source_file: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    analyzer_version: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    analysis_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    overall_risk_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )