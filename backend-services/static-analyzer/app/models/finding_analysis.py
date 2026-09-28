import uuid
from datetime import datetime

from sqlalchemy import DateTime, JSON, String, Text, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FindingAnalysis(Base):
    __tablename__ = "finding_analysis"

    analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    finding_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    impact: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    attack_scenario: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    remediation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    validation: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    raw_response: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )