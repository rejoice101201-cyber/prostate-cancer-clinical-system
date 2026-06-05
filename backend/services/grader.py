"""
Post-process segmentation mask → PI-RADS score + report.
Label convention (adjust to match your model's output):
  0 = background
  1 = prostate gland
  2 = suspected lesion (PI-RADS ≥ 3)
  3 = high-suspicion lesion (PI-RADS ≥ 4)
"""
import numpy as np
from typing import Dict, Any
from scipy import ndimage

def compute_grading(case_id: str, volume: np.ndarray, mask: np.ndarray, spacing: tuple) -> Dict[str, Any]:
    voxel_vol_ml = (spacing[0] * spacing[1] * spacing[2]) / 1000.0

    # Prostate volume
    prostate_voxels = int(np.sum(mask >= 1))
    prostate_vol_ml = round(prostate_voxels * voxel_vol_ml, 1)

    # Find lesion regions (labels 2 and 3)
    lesion_mask = (mask >= 2).astype(np.uint8)
    labeled, n_lesions = ndimage.label(lesion_mask)

    suspicious_regions = []
    overall_pirads = 1

    for i in range(1, n_lesions + 1):
        region = (labeled == i)
        vol_ml = round(float(np.sum(region)) * voxel_vol_ml, 2)
        if vol_ml < 0.05:
            continue  # ignore tiny noise voxels

        # Centroid
        coords = np.array(np.where(region)).mean(axis=1)
        x, y, z = int(coords[0]), int(coords[1]), int(coords[2])

        # PI-RADS based on dominant label in region
        dominant_label = int(np.bincount(mask[region]).argmax())
        pirads = 4 if dominant_label >= 3 else 3
        confidence = round(0.65 + 0.2 * (vol_ml / max(vol_ml, 1.5)), 2)
        confidence = min(confidence, 0.95)

        if pirads > overall_pirads:
            overall_pirads = pirads

        suspicious_regions.append({
            'id': f'r{i}',
            'x': x, 'y': y, 'z': z,
            'volumeMl': vol_ml,
            'confidence': confidence,
            'pirads': pirads,
        })

    # Clamp overall PI-RADS
    if len(suspicious_regions) == 0:
        overall_pirads = 1
    elif any(r['pirads'] >= 4 for r in suspicious_regions):
        overall_pirads = 4 if max(r['volumeMl'] for r in suspicious_regions) < 1.5 else 5

    findings = _generate_findings(suspicious_regions, prostate_vol_ml)
    recommendation = _generate_recommendation(overall_pirads)

    return {
        'caseId': case_id,
        'piradsScore': overall_pirads,
        'suspiciousRegions': suspicious_regions,
        'segmentationSlices': [],  # TODO: render PNG overlays with matplotlib
        'prostateVolumeMl': prostate_vol_ml,
        'findings': findings,
        'recommendation': recommendation,
    }

def _generate_findings(regions, prostate_vol):
    if not regions:
        return f'No suspicious lesions identified. Prostate volume: {prostate_vol} mL.'
    desc = '; '.join(
        f"A {r['volumeMl']} mL {'T2-hypointense' if r['pirads'] >= 4 else 'indeterminate'} "
        f"lesion at ({r['x']},{r['y']},{r['z']}) (PI-RADS {r['pirads']})"
        for r in regions
    )
    return f"{desc}. Prostate volume: {prostate_vol} mL."

def _generate_recommendation(pirads):
    msgs = {
        1: 'No clinically significant cancer. Routine follow-up.',
        2: 'Clinically significant cancer unlikely. Annual PSA follow-up recommended.',
        3: 'Equivocal. Consider targeted biopsy based on PSA and clinical context.',
        4: 'Clinically significant cancer likely. Targeted biopsy recommended. Urology referral.',
        5: 'Clinically significant cancer highly likely. Urgent urology referral for targeted biopsy.',
    }
    return msgs.get(pirads, '')
