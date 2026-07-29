from pydantic import BaseModel
from typing import Dict, List


class AnalyticsSummaryResponse(BaseModel):
    total_messages: int
    filtered_messages: int
    ai_responses_sent: int
    estimated_tokens_saved: int
    filter_rate_percentage: float
    platform_breakdown: Dict[str, int]


class TimeSeriesPoint(BaseModel):
    timestamp: str
    message_count: int
    ai_response_count: int
    filtered_count: int


class AnalyticsTimeSeriesResponse(BaseModel):
    points: List[TimeSeriesPoint]
