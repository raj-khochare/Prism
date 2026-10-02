import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StaticAnalysisBase(BaseModel):
    contract_id: uuid.UUID
    source_hash: str
    source_file: str
    analyzer_version: str
    analysis_status: str
    overall_risk_score: int


class StaticAnalysisResponse(StaticAnalysisBase):
    analysis_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)