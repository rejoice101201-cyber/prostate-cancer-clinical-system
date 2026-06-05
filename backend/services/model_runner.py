"""
Run nnUNet segmentation on a CT volume.
Place your trained checkpoint under:
  backend/models/prostate_nnunet/

To use the model from your school server:
  scp -r user@server:/path/to/nnUNet_results/DatasetXXX/... backend/models/prostate_nnunet/
"""
import os
import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models', 'prostate_nnunet')

_predictor = None

def _load_predictor():
    global _predictor
    if _predictor is not None:
        return _predictor
    if not os.path.exists(MODEL_DIR):
        raise FileNotFoundError(
            f"Model not found at {MODEL_DIR}. "
            "Copy checkpoint from server: scp -r user@server:/nnUNet_results/... backend/models/prostate_nnunet/"
        )
    # Lazy import — only needed when model dir exists
    from nnunetv2.inference.predict_from_raw_data import nnUNetPredictor
    predictor = nnUNetPredictor(
        tile_step_size=0.5,
        use_gaussian=True,
        use_mirroring=True,
        perform_everything_on_device=True,
        device='cuda',  # change to 'cpu' if no GPU
        verbose=False,
    )
    predictor.initialize_from_trained_model_folder(
        MODEL_DIR,
        use_folds=(0,),
        checkpoint_name='checkpoint_best.pth',
    )
    _predictor = predictor
    return predictor

def run_inference(volume: np.ndarray, spacing: tuple) -> np.ndarray:
    """Returns segmentation mask with same spatial dims as volume."""
    try:
        predictor = _load_predictor()
        # nnUNet expects [C, H, W, D] with float32
        inp = volume[np.newaxis]  # add channel dim
        props = {'spacing': list(spacing)}
        result = predictor.predict_single_npy_array(inp, props, None, None, False)
        return result.astype(np.uint8)
    except FileNotFoundError:
        # Model not yet copied — return empty mask (for dev testing)
        return np.zeros(volume.shape, dtype=np.uint8)
