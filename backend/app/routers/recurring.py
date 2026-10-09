from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import RecurringIssuePattern
from ..services.recurring_service import detect_recurring_issues

router = APIRouter(prefix="/api/recurring", tags=["Recurring Issues"])

@router.get("", response_model=List[RecurringIssuePattern])
def get_recurring_patterns(
    min_occurrences: int = Query(default=2, ge=2, le=10),
    db: Session = Depends(get_db)
):
    """
    Analyzes all tickets across categories, buildings, and equipment to surface recurring breakdown patterns.
    """
    return detect_recurring_issues(db, min_occurrences=min_occurrences)
