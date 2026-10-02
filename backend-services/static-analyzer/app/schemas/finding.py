from pydantic import BaseModel
from typing import Optional


class Finding(BaseModel):
    finding_id: str

    detector_id: str
    vulnerability_family: str

    title: str
    impact: str
    confidence: str

    contract: Optional[str] = None
    function: Optional[str] = None

    source_file: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None

    source_snippet: Optional[str] = None

    vulnerability_features: Optional[dict] = None

    description: str