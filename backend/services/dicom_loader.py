"""
Load DICOM series or NIfTI files → (numpy volume, voxel spacing).
Supports: single .nii/.nii.gz, multiple .dcm files (sorted by InstanceNumber).
"""
import io
import numpy as np
from typing import List, Tuple
from fastapi import UploadFile

async def load_files(files: List[UploadFile]) -> Tuple[np.ndarray, Tuple[float, float, float]]:
    names = [f.filename or '' for f in files]

    if any(n.endswith('.nii') or n.endswith('.nii.gz') for n in names):
        return await _load_nifti(files[0])
    elif any(n.endswith('.dcm') for n in names):
        return await _load_dicom_series(files)
    else:
        raise ValueError("Unsupported file format. Expected .dcm, .nii, or .nii.gz")

async def _load_nifti(f: UploadFile) -> Tuple[np.ndarray, Tuple[float, float, float]]:
    import nibabel as nib
    data = await f.read()
    # nibabel needs a file-like; wrap in BytesIO via FileHolder
    fh = nib.FileHolder(fileobj=io.BytesIO(data))
    img = nib.Nifti1Image.from_file_map({'header': fh, 'image': fh})
    volume = img.get_fdata().astype(np.float32)
    spacing = tuple(float(x) for x in img.header.get_zooms()[:3])
    return volume, spacing  # type: ignore

async def _load_dicom_series(files: List[UploadFile]) -> Tuple[np.ndarray, Tuple[float, float, float]]:
    import pydicom
    slices = []
    for f in files:
        data = await f.read()
        ds = pydicom.dcmread(io.BytesIO(data))
        slices.append(ds)
    slices.sort(key=lambda s: float(getattr(s, 'InstanceNumber', 0)))
    volume = np.stack([s.pixel_array.astype(np.float32) for s in slices], axis=-1)
    ds0 = slices[0]
    px = float(ds0.PixelSpacing[0]) if hasattr(ds0, 'PixelSpacing') else 1.0
    py = float(ds0.PixelSpacing[1]) if hasattr(ds0, 'PixelSpacing') else 1.0
    pz = float(getattr(ds0, 'SliceThickness', 1.0))
    return volume, (px, py, pz)
