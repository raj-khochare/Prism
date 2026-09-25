from pydantic import BaseModel
from typing import Optional


class Finding(BaseModel):
    detector_id: str
    title: str
    impact: str
    confidence: str

    contract: Optional[str] = None
    function: Optional[str] = None

    source_file: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None

    source_snippet: Optional[str] = None
    description: str