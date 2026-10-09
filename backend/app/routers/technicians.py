from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Technician
from ..schemas import TechnicianResponse, TechnicianRecommendation
from ..services.technician_service import recommend_best_technician

router = APIRouter(prefix="/api/technicians", tags=["Technicians"])

@router.get("", response_model=List[TechnicianResponse])
def get_technicians(db: Session = Depends(get_db)):
    return db.query(Technician).all()

@router.get("/recommend", response_model=Optional[TechnicianRecommendation])
def get_technician_recommendation(category: str = Query(..., description="Maintenance category"), db: Session = Depends(get_db)):
    return recommend_best_technician(db, category)
