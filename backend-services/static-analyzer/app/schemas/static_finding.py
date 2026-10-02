import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StaticFindingBase(BaseModel):
    analysis_id: uuid.UUID
    contract_id: uuid.UUID

    detector_id: str
    vulnerability_family: str

    severity: str
    risk_score: int | None = None,
    confidence: float

    source_file: str
    function_name: str | None = None

    line_start: int | None = None
    line_end: int | None = None

    source_snippet: str | None = None
    vulnerability_features: dict | None = None


class StaticFindingResponse(StaticFindingBase):
    finding_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)