from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
from services.dicom_loader import load_files
from services.model_runner import run_inference
from services.grader import compute_grading
import time

router = APIRouter()

@router.post("/infer")
async def infer(
    case_id: str = Form(...),
    files: List[UploadFile] = File(...),
):
    t0 = time.time()

    # 1. Load & validate CT files
    try:
        volume, spacing = await load_files(files)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to load images: {e}")

    # 2. Run nnUNet segmentation
    try:
        seg_mask = run_inference(volume, spacing)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

    # 3. Compute PI-RADS grading from segmentation
    result = compute_grading(case_id, volume, seg_mask, spacing)
    result["processingTimeMs"] = int((time.time() - t0) * 1000)

    return result
