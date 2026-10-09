import re
from typing import List, Optional
from ..models import MaintenanceRequest
from ..schemas import DuplicateCheckResult

# Stop words to ignore during token similarity
STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for",
    "of", "with", "and", "or", "it", "this", "that", "there", "has", "have", "not",
    "please", "help", "need", "issue", "problem", "broken", "maintenance"
}

def tokenize(text: str) -> set:
    if not text:
        return set()
    words = re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())
    return {w for w in words if w not in STOP_WORDS}

def jaccard_similarity(set_a: set, set_b: set) -> float:
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return intersection / union if union > 0 else 0.0

def detect_duplicate(
    new_title: str,
    new_description: str,
    new_category: str,
    new_location: str,
    new_building: str,
    new_equipment_id: Optional[str],
    existing_unresolved_tickets: List[MaintenanceRequest],
    confidence_threshold: float = 0.55
) -> DuplicateCheckResult:
    """
    Evaluate similarity between a new request and all active unresolved requests.
    Considers category match, location/building match, equipment match, and text token overlap.
    """
    if not existing_unresolved_tickets:
        return DuplicateCheckResult(
            is_potential_duplicate=False,
            duplicate_of_id=None,
            duplicate_of_title=None,
            confidence=0.0,
            reason=None
        )

    best_match_ticket: Optional[MaintenanceRequest] = None
    best_confidence = 0.0
    best_reason = ""

    new_text_tokens = tokenize(f"{new_title} {new_description}")
    new_loc_lower = new_location.lower().strip()
    new_bldg_lower = new_building.lower().strip()

    for ticket in existing_unresolved_tickets:
        # Category similarity weight: 30%
        category_match = ticket.category.strip().lower() == new_category.strip().lower()
        category_score = 1.0 if category_match else 0.0

        # Location similarity weight: 35%
        loc_score = 0.0
        ticket_bldg = (ticket.building or "").lower().strip()
        ticket_loc = (ticket.location or "").lower().strip()

        if new_bldg_lower and ticket_bldg == new_bldg_lower:
            loc_score += 0.5
            if new_loc_lower and (new_loc_lower in ticket_loc or ticket_loc in new_loc_lower):
                loc_score += 0.5
        elif new_loc_lower and (new_loc_lower in ticket_loc or ticket_loc in new_loc_lower):
            loc_score = 0.8

        # Equipment match bonus
        equipment_match = False
        if new_equipment_id and ticket.equipment_id:
            if new_equipment_id.strip().lower() == ticket.equipment_id.strip().lower():
                equipment_match = True
                loc_score = 1.0

        # Text description similarity weight: 35%
        existing_tokens = tokenize(f"{ticket.title} {ticket.description}")
        text_sim = jaccard_similarity(new_text_tokens, existing_tokens)

        # Composite score
        composite_score = (category_score * 0.30) + (loc_score * 0.35) + (text_sim * 0.35)
        if equipment_match:
            composite_score = min(1.0, composite_score + 0.20)

        if composite_score > best_confidence:
            best_confidence = composite_score
            best_match_ticket = ticket

            # Reason generation
            reasons = []
            if category_match:
                reasons.append(f"matching category ({ticket.category})")
            if equipment_match:
                reasons.append(f"identical equipment ID ({ticket.equipment_id})")
            elif loc_score >= 0.7:
                reasons.append(f"same location ({ticket.location})")
            elif loc_score > 0:
                reasons.append(f"same building ({ticket.building})")

            reasons.append(f"{int(text_sim * 100)}% text similarity")
            best_reason = f"Identified {int(composite_score * 100)}% similarity to active ticket {ticket.id} ('{ticket.title}') due to {', '.join(reasons)}."

    is_dup = best_confidence >= confidence_threshold and best_match_ticket is not None

    return DuplicateCheckResult(
        is_potential_duplicate=is_dup,
        duplicate_of_id=best_match_ticket.id if is_dup else None,
        duplicate_of_title=best_match_ticket.title if is_dup else None,
        confidence=round(best_confidence, 2) if is_dup else 0.0,
        reason=best_reason if is_dup else None
    )
