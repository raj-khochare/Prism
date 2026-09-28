import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, Float, JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class StaticFinding(Base):
    __tablename__ = "static_findings"

    finding_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    detector_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    vulnerability_family: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    risk_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    source_file: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    function_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    line_start: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    line_end: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    source_snippet: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    vulnerability_features: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )