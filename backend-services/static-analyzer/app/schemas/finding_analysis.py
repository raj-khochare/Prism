import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FindingAnalysisBase(BaseModel):
    finding_id: uuid.UUID

    model_name: str

    description: str
    impact: str
    attack_scenario: str
    remediation: str

    validation: str | None = None
    raw_response: dict | None = None


class FindingAnalysisResponse(FindingAnalysisBase):
    analysis_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)