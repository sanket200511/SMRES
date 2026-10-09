import pytest
from backend.app.services.priority_engine import calculate_priority_score, check_emergency_keywords

def test_priority_score_formula_exact():
    # 8*safety + 5*operational + 4*people + 3*time
    # 8*3 + 5*2 + 4*2 + 3*1 = 24 + 10 + 8 + 3 = 45 -> Medium
    res = calculate_priority_score(3, 2, 2, 1, "Water dripping under sink")
    assert res.total_score == 45
    assert res.recommended_priority == "Medium"
    assert res.is_safety_emergency is False

def test_priority_score_max():
    # 8*5 + 5*5 + 4*5 + 3*5 = 40 + 25 + 20 + 15 = 100 -> Critical
    res = calculate_priority_score(5, 5, 5, 5, "Complete power outage")
    assert res.total_score == 100
    assert res.recommended_priority == "Critical"
    assert res.is_safety_emergency is True

def test_priority_score_low():
    # 8*1 + 5*1 + 4*0 + 3*1 = 8 + 5 + 0 + 3 = 16 -> Low
    res = calculate_priority_score(1, 1, 0, 1, "Scuffed paint on wall")
    assert res.total_score == 16
    assert res.recommended_priority == "Low"
    assert res.is_safety_emergency is False

def test_emergency_hazard_keyword_triggers_critical_override():
    # Even if scores are low, keyword "gas leak" triggers safety emergency and Critical priority!
    res = calculate_priority_score(1, 1, 1, 1, "Smell of gas leak in staff room")
    assert res.is_safety_emergency is True
    assert res.recommended_priority == "Critical"
    assert res.emergency_trigger == "gas leak"
    assert "EMERGENCY" in res.explanation

def test_emergency_sparking_keyword():
    res = check_emergency_keywords("Main electrical circuit is sparking near the server rack")
    assert res == "sparking"
