import re
from typing import Tuple, Optional
from ..config import (
    WEIGHT_SAFETY,
    WEIGHT_OPERATIONAL,
    WEIGHT_PEOPLE,
    WEIGHT_TIME,
    THRESHOLD_CRITICAL,
    THRESHOLD_HIGH,
    THRESHOLD_MEDIUM,
)
from ..schemas import PriorityScoreBreakdown

EMERGENCY_KEYWORDS = [
    r"\bgas leak\b",
    r"\belectrical fire\b",
    r"\bsparking\b",
    r"\bsmoke\b",
    r"\blive wire\b",
    r"\bhigh voltage\b",
    r"\bexposed wire\b",
    r"\bceiling collapse\b",
    r"\bstructural collapse\b",
    r"\bchemical spill\b",
    r"\bcarbon monoxide\b",
    r"\bexplosion hazard\b",
    r"\bsevere flooding\b",
    r"\bfire hazard\b",
]

def check_emergency_keywords(text: str) -> Optional[str]:
    """Scan text for life-safety emergency conditions."""
    if not text:
        return None
    lower_text = text.lower()
    for pattern in EMERGENCY_KEYWORDS:
        match = re.search(pattern, lower_text)
        if match:
            return match.group(0)
    return None


def map_affected_people_to_score(people_count: int) -> int:
    """
    Documented mapping from actual count of affected people to 0-5 score:
    - <= 0 people: 0 (Isolated asset / no direct occupant impact)
    - 1 to 5 people: 1 (Single workstation or private office)
    - 6 to 20 people: 2 (Team room or shared zone)
    - 21 to 50 people: 3 (Department wing)
    - 51 to 200 people: 4 (Entire floor or large common facility)
    - > 200 people: 5 (Building-wide or campus-wide operational impact)
    """
    if people_count <= 0:
        return 0
    elif people_count <= 5:
        return 1
    elif people_count <= 20:
        return 2
    elif people_count <= 50:
        return 3
    elif people_count <= 200:
        return 4
    else:
        return 5


def calculate_priority_score(
    safety_score: int,
    operational_impact_score: int,
    affected_people_score: int,
    time_sensitivity_score: int,
    text_content: str = "",
) -> PriorityScoreBreakdown:
    """
    Calculate explainable priority score using calibrated formula:
    score = 8 * safety + 5 * operational_impact + 4 * affected_people + 3 * time_sensitivity
    Total range: 0 to 100.
    """
    # Clamp input values to 0-5
    s = max(0, min(5, safety_score))
    o = max(0, min(5, operational_impact_score))
    p = max(0, min(5, affected_people_score))
    t = max(0, min(5, time_sensitivity_score))

    calculated_score = (
        WEIGHT_SAFETY * s +
        WEIGHT_OPERATIONAL * o +
        WEIGHT_PEOPLE * p +
        WEIGHT_TIME * t
    )

    # Check independent life-safety emergency condition
    emergency_kw = check_emergency_keywords(text_content)
    is_emergency = emergency_kw is not None or s == 5

    # Determine recommended priority category
    if is_emergency or calculated_score >= THRESHOLD_CRITICAL:
        recommended_priority = "Critical"
        if is_emergency and calculated_score < THRESHOLD_CRITICAL:
            calculated_score = max(calculated_score, 85)
    elif calculated_score >= THRESHOLD_HIGH:
        recommended_priority = "High"
    elif calculated_score >= THRESHOLD_MEDIUM:
        recommended_priority = "Medium"
    else:
        recommended_priority = "Low"

    # Build human-readable, explainable breakdown
    explanation_parts = [
        f"Base formula: 8×Safety({s}) + 5×Ops({o}) + 4×People({p}) + 3×Time({t}) = {WEIGHT_SAFETY*s + WEIGHT_OPERATIONAL*o + WEIGHT_PEOPLE*p + WEIGHT_TIME*t} pts.",
    ]

    if is_emergency:
        trigger_detail = f"keyword '{emergency_kw}'" if emergency_kw else "maximum safety rating (5/5)"
        explanation_parts.append(
            f"⚠️ INDEPENDENT EMERGENCY OVERRIDE: Life-safety hazard triggered via {trigger_detail}. Escalated to Critical priority."
        )
    else:
        explanation_parts.append(
            f"Classified as '{recommended_priority}' based on calibrated threshold range (Critical: ≥75, High: ≥50, Medium: ≥25, Low: <25)."
        )

    explanation = " ".join(explanation_parts)

    return PriorityScoreBreakdown(
        safety_score=s,
        operational_impact_score=o,
        affected_people_score=p,
        time_sensitivity_score=t,
        total_score=calculated_score,
        recommended_priority=recommended_priority,
        is_safety_emergency=is_emergency,
        emergency_trigger=emergency_kw if emergency_kw else ("Critical Safety Rating" if s == 5 else None),
        explanation=explanation,
    )
