import io
import os
import re
import json
import logging
import mimetypes
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from PIL import Image, ImageOps, UnidentifiedImageError
import numpy as np
from scipy.ndimage import laplace

from .llm_provider import (
    llm_provider,
    AIProviderError,
    AIQuotaExceededError,
    AIServiceUnavailableError
)

logger = logging.getLogger(__name__)

# Supported medical document categories and their metadata
SUPPORTED_DOCUMENT_CATEGORIES = {
    "prescription": {
        "label": "Medical Prescription",
        "aliases": ["prescription", "rx", "medical prescription", "doctor prescription", "medical_prescription"],
        "description": "Doctor's prescription containing medications, dosages, frequencies, patient info, and physician credentials/signature."
    },
    "laboratory_report": {
        "label": "Laboratory Reports",
        "aliases": ["laboratory_report", "lab_report", "laboratory reports", "lab report", "pathology", "blood test", "diagnostic report", "laboratory", "blood_report"],
        "description": "Clinical laboratory report with biomarker values, reference ranges, and test results (e.g. CBC, Lipid Profile, Blood Glucose, Urine analysis)."
    },
    "pathology_report": {
        "label": "Pathology Reports",
        "aliases": ["pathology_report", "pathology reports", "pathology", "biopsy", "histopathology", "cytology"],
        "description": "Pathology biopsy, surgical histology, cytology, or microscopic tissue analysis report."
    },
    "medical_scan": {
        "label": "Medical Scans and Images",
        "aliases": ["medical_scan", "medical scans and images", "scan", "x-ray", "mri", "ct", "ultrasound", "ecg", "medical_scans"],
        "description": "Radiological or diagnostic imaging such as X-ray, CT scan, MRI, Ultrasound, ECG/EKG strip."
    },
    "other_medical": {
        "label": "Other Medical Document",
        "aliases": ["other_medical", "other explicitly supported medical documents", "other", "clinical_note", "discharge_summary", "medical record", "hospital_record"],
        "description": "Hospital discharge summary, vaccination record, or clinical doctor consultation note."
    }
}

# Standard error message catalog as per specification
ERROR_MESSAGES = {
    "WRONG_DOCUMENT": "Invalid document. Upload the correct medical document.",
    "DOCUMENT_TYPE_MISMATCH": "Document type mismatch.",
    "IMAGE_TOO_BLURRY": "Image is too blurry to process.",
    "IMAGE_CORRUPTED": "Unable to read this image. Upload it again.",
    "UNSUPPORTED_FORMAT": "Unsupported file format.",
    "EMPTY_FILE": "The uploaded file is empty.",
    "AI_VALIDATION_FAILED": "Unable to validate the document. Please retry.",
    "LOW_CONFIDENCE": "Document could not be identified confidently.",
    "MISSING_MEDICAL_INFO": "Required information could not be extracted.",
    "FILE_TOO_LARGE": "File too large. Maximum size is 16MB.",
    "IMAGE_TOO_SMALL": "Image resolution is too low to read. Please upload a clear document image.",
    "IMAGE_BLANK": "The uploaded image appears blank or unreadable. Please upload a clear document."
}

# Allowed file extensions and MIME types
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


@dataclass
class ValidationResult:
    is_valid: bool
    error_code: Optional[str] = None
    message: str = ""
    document_type: str = "unknown"
    detected_category: str = ""
    confidence: float = 0.0
    reason: str = ""
    issues: List[str] = field(default_factory=list)
    http_status: int = 200
    normalized_image_bytes: Optional[bytes] = None
    normalized_mime_type: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        if self.is_valid:
            return {
                "success": True,
                "is_valid": True,
                "document_type": self.document_type,
                "detected_category": self.detected_category,
                "confidence": round(self.confidence, 2),
                "reason": self.reason,
                "issues": self.issues
            }
        else:
            return {
                "success": False,
                "is_valid": False,
                "error_code": self.error_code,
                "message": self.message,
                "error": self.message,  # Ensure compatibility with legacy frontend readers
                "document_type": self.document_type,
                "detected_category": self.detected_category,
                "confidence": round(self.confidence, 2),
                "reason": self.reason or self.message,
                "issues": self.issues
            }


class DocumentValidator:
    def __init__(self, blur_threshold: float = 20.0, min_dimension: int = 120, max_dimension: int = 10000):
        self.blur_threshold = blur_threshold
        self.min_dimension = min_dimension
        self.max_dimension = max_dimension

    def normalize_category_key(self, category: str) -> str:
        """
        Normalize input category string to standard category key.
        """
        if not category:
            return "prescription"
        cat_lower = str(category).strip().lower().replace("-", "_").replace(" ", "_")
        for key, data in SUPPORTED_DOCUMENT_CATEGORIES.items():
            if cat_lower == key:
                return key
            for alias in data["aliases"]:
                if alias in cat_lower or cat_lower in alias:
                    return key
        return "prescription"

    def get_category_label(self, category_key: str) -> str:
        data = SUPPORTED_DOCUMENT_CATEGORIES.get(category_key)
        if data:
            return data["label"]
        return "Medical Document"

    def validate_file_integrity_and_clarity(
        self,
        file_bytes: bytes,
        filename: str = "",
        content_type: str = ""
    ) -> ValidationResult:
        """
        Validates file size, integrity, format, dimensions, contrast, and blurriness
        before sending anything to AI providers.
        """
        # 1. File size checks
        if not file_bytes or len(file_bytes) == 0:
            return ValidationResult(
                is_valid=False,
                error_code="EMPTY_FILE",
                message=ERROR_MESSAGES["EMPTY_FILE"],
                issues=["File size is 0 bytes"],
                http_status=400
            )

        if len(file_bytes) > 16 * 1024 * 1024:
            return ValidationResult(
                is_valid=False,
                error_code="FILE_TOO_LARGE",
                message=ERROR_MESSAGES["FILE_TOO_LARGE"],
                issues=["File exceeds 16MB limit"],
                http_status=400
            )

        # 2. Extension check
        ext = os.path.splitext(filename)[1].lower() if filename else ""
        if ext and ext not in ALLOWED_EXTENSIONS:
            return ValidationResult(
                is_valid=False,
                error_code="UNSUPPORTED_FORMAT",
                message=ERROR_MESSAGES["UNSUPPORTED_FORMAT"],
                issues=[f"Extension '{ext}' is not supported. Use JPG, PNG, WEBP, or PDF."],
                http_status=415
            )

        # 3. PDF handling
        is_pdf = (ext == ".pdf") or (content_type == "application/pdf") or file_bytes.startswith(b"%PDF-")
        if is_pdf:
            if not file_bytes.startswith(b"%PDF-"):
                return ValidationResult(
                    is_valid=False,
                    error_code="IMAGE_CORRUPTED",
                    message=ERROR_MESSAGES["IMAGE_CORRUPTED"],
                    issues=["File claims to be PDF but lacks a valid PDF header"],
                    http_status=400
                )
            if len(file_bytes) < 100:
                return ValidationResult(
                    is_valid=False,
                    error_code="IMAGE_CORRUPTED",
                    message=ERROR_MESSAGES["IMAGE_CORRUPTED"],
                    issues=["PDF file is truncated or corrupted"],
                    http_status=400
                )
            return ValidationResult(
                is_valid=True,
                normalized_image_bytes=file_bytes,
                normalized_mime_type="application/pdf",
                metadata={"is_pdf": True, "size": len(file_bytes)}
            )

        # 4. Image inspection using PIL
        try:
            # First pass: verify image integrity
            raw_buf = io.BytesIO(file_bytes)
            with Image.open(raw_buf) as img_verify:
                img_verify.verify()
        except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as e:
            logger.warning(f"Image integrity verification failed: {e}")
            return ValidationResult(
                is_valid=False,
                error_code="IMAGE_CORRUPTED",
                message=ERROR_MESSAGES["IMAGE_CORRUPTED"],
                issues=["Unable to identify or decode image file"],
                http_status=400
            )

        # Second pass: read and inspect image attributes
        try:
            raw_buf = io.BytesIO(file_bytes)
            img = Image.open(raw_buf)
            img_format = (img.format or "").upper()

            if img_format not in {"JPEG", "PNG", "WEBP"}:
                return ValidationResult(
                    is_valid=False,
                    error_code="UNSUPPORTED_FORMAT",
                    message=ERROR_MESSAGES["UNSUPPORTED_FORMAT"],
                    issues=[f"Image format '{img_format}' is unsupported. Only JPEG, PNG, WEBP are accepted."],
                    http_status=415
                )

            # Auto-rotate based on EXIF orientation tag if present
            try:
                img = ImageOps.exif_transpose(img) or img
            except Exception:
                pass

            width, height = img.size

            # Check dimensions
            if width < self.min_dimension or height < self.min_dimension:
                return ValidationResult(
                    is_valid=False,
                    error_code="IMAGE_TOO_SMALL",
                    message=ERROR_MESSAGES["IMAGE_TOO_SMALL"],
                    issues=[f"Image dimensions ({width}x{height}) are smaller than minimum {self.min_dimension}x{self.min_dimension}"],
                    http_status=400
                )

            if width > self.max_dimension or height > self.max_dimension:
                return ValidationResult(
                    is_valid=False,
                    error_code="IMAGE_CORRUPTED",
                    message=ERROR_MESSAGES["IMAGE_CORRUPTED"],
                    issues=[f"Image dimensions ({width}x{height}) exceed maximum allowed dimensions"],
                    http_status=400
                )

            # Convert to grayscale for contrast and blur evaluation
            gray_img = img.convert("L")
            gray_arr = np.array(gray_img, dtype=np.float64)

            # Contrast / blank image check: standard deviation of pixel intensities
            pixel_std = float(np.std(gray_arr))
            if pixel_std < 5.0:
                return ValidationResult(
                    is_valid=False,
                    error_code="EMPTY_FILE",
                    message=ERROR_MESSAGES["EMPTY_FILE"],
                    issues=["Image contains solid color or no discernible contrast/content"],
                    http_status=400
                )

            # Blurriness detection: Laplacian variance
            lap_arr = laplace(gray_arr)
            blur_metric = float(lap_arr.var())
            logger.info(f"Image blur metric (Laplacian variance): {blur_metric:.2f} (threshold: {self.blur_threshold})")

            if blur_metric < self.blur_threshold:
                return ValidationResult(
                    is_valid=False,
                    error_code="IMAGE_TOO_BLURRY",
                    message=ERROR_MESSAGES["IMAGE_TOO_BLURRY"],
                    issues=[f"Blur metric {blur_metric:.2f} is below required clarity threshold {self.blur_threshold}"],
                    http_status=400
                )

            # Image Normalization for AI Providers
            # Convert RGBA / CMYK / P to clean RGB
            if img.mode != "RGB":
                img = img.convert("RGB")

            # Downsample if exceedingly high resolution (> 2560px on longest side) to optimize AI speed & latency
            max_ai_edge = 2560
            if max(width, height) > max_ai_edge:
                scale = max_ai_edge / float(max(width, height))
                new_size = (int(width * scale), int(height * scale))
                img = img.resize(new_size, Image.Resampling.LANCZOS)

            norm_buf = io.BytesIO()
            img.save(norm_buf, format="JPEG", quality=92, optimize=True)
            norm_bytes = norm_buf.getvalue()

            return ValidationResult(
                is_valid=True,
                normalized_image_bytes=norm_bytes,
                normalized_mime_type="image/jpeg",
                metadata={
                    "original_format": img_format,
                    "width": width,
                    "height": height,
                    "blur_metric": blur_metric,
                    "contrast_std": pixel_std,
                    "normalized_size": len(norm_bytes)
                }
            )

        except Exception as e:
            logger.error(f"Error inspecting image: {e}")
            return ValidationResult(
                is_valid=False,
                error_code="IMAGE_CORRUPTED",
                message=ERROR_MESSAGES["IMAGE_CORRUPTED"],
                issues=[str(e)],
                http_status=400
            )

    async def classify_document_content(
        self,
        image_bytes: bytes,
        mime_type: str,
        expected_category: str = "prescription"
    ) -> ValidationResult:
        """
        Dedicated AI document classification step before OCR or extraction.
        Validates whether the content belongs to the expected medical category
        and rejects non-medical files (Aadhaar, PAN, resumes, bills, photos).
        """
        expected_key = self.normalize_category_key(expected_category)
        expected_label = self.get_category_label(expected_key)

        prompt = f"""
Analyze this document image carefully. Verify whether it is a legitimate medical document and specifically whether it matches the expected category: '{expected_label}' (key: '{expected_key}').

Supported document categories:
- prescription: Medical prescription from a licensed doctor / hospital with medications, dosages, Rx symbol, physician details, or instructions.
- laboratory_report: Clinical laboratory test report (CBC, blood sugar, lipid panel, urine analysis, metabolic panel) with numerical biomarker values and reference ranges.
- pathology_report: Biopsy, histopathology, surgical pathology, or cytology report.
- medical_scan: Radiological or diagnostic imaging scans (X-ray, MRI, CT, Ultrasound, ECG/EKG).
- other_medical: Medical discharge summary, vaccination record, or formal clinical doctor consultation note.

Invalid non-medical document types that MUST be rejected:
- identity_document: Aadhaar card, PAN card, driving licence, passport, voter ID, employee badge, student ID.
- resume: Resume, CV, bio-data, job application, academic certificate or diploma.
- invoice: Financial invoice, utility bill, electricity bill, restaurant or grocery receipt unrelated to healthcare.
- non_medical_photo: Random photograph (selfie, landscape, vehicle, animal, food, meme, nature).
- screenshot: Screenshot of chat, social media, mobile app homescreen, game, or programming code.
- blank_or_unreadable: Blank page, scribbles, or unreadable document.

Carefully evaluate the image content and return a JSON object with this EXACT structure:
{{
  "is_valid": true,
  "document_type": "prescription",
  "detected_category": "Medical Prescription",
  "confidence": 0.95,
  "reason": "Valid medical prescription detected with visible doctor name, patient details, and medication list.",
  "issues": []
}}

For invalid documents or mismatches, return:
{{
  "is_valid": false,
  "document_type": "identity_document",
  "detected_category": "Identity Card",
  "confidence": 0.98,
  "reason": "The uploaded file does not appear to be a valid medical prescription. Uploaded image contains an identity card.",
  "issues": ["Document category mismatch", "Non-medical document"]
}}

Rules:
1. "document_type" MUST be one of: "prescription", "laboratory_report", "pathology_report", "medical_scan", "other_medical", "identity_document", "resume", "invoice", "non_medical_photo", "screenshot", "blank_or_unreadable", "unknown".
2. If the document is valid medical but does NOT match the expected category '{expected_key}', set "is_valid": false and include "Document category mismatch" in issues.
3. If the document is an identity card, resume, invoice, screenshot, or random photo, set "is_valid": false and describe what it is.
4. "confidence" must be a float between 0.0 and 1.0.
5. Return ONLY the raw JSON object. Do NOT wrap in markdown backticks or include explanations.
"""

        try:
            from google.genai import types
            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            content = [image_part, prompt]

            response_text = await llm_provider.generate_response(
                prompt=content,
                system_prompt="You are an expert Medical Document Verification System. You strictly authenticate document authenticity, classify document categories, and reject identity cards, resumes, invoices, and mismatched documents in structured JSON format."
            )

            # Parse and validate the AI classification response
            parsed = self._parse_classification_json(response_text)
            if not parsed:
                logger.error(f"Failed to parse classification JSON from response: {response_text[:150]}")
                return ValidationResult(
                    is_valid=False,
                    error_code="AI_VALIDATION_FAILED",
                    message=ERROR_MESSAGES["AI_VALIDATION_FAILED"],
                    issues=["Failed to parse AI classification output"],
                    http_status=503
                )

            is_valid = bool(parsed.get("is_valid", False))
            doc_type = str(parsed.get("document_type", "unknown")).lower().strip()
            detected_cat = str(parsed.get("detected_category", doc_type))
            confidence = float(parsed.get("confidence", 0.0))
            reason = str(parsed.get("reason", ""))
            issues = parsed.get("issues", [])
            if not isinstance(issues, list):
                issues = [str(issues)]

            # Check confidence threshold (0.60)
            if confidence < 0.60:
                return ValidationResult(
                    is_valid=False,
                    error_code="LOW_CONFIDENCE",
                    message=ERROR_MESSAGES["LOW_CONFIDENCE"],
                    document_type=doc_type,
                    detected_category=detected_cat,
                    confidence=confidence,
                    reason=f"Classification confidence ({confidence:.2f}) is below acceptable threshold",
                    issues=["Low classification confidence", reason] if reason else ["Low classification confidence"],
                    http_status=400
                )

            # Check for non-medical invalid documents
            non_medical_types = {
                "identity_document", "identity_card", "aadhaar", "pan", "license",
                "resume", "cv", "invoice", "receipt", "non_medical_photo", "screenshot",
                "blank_or_unreadable", "unknown"
            }
            if doc_type in non_medical_types:
                mismatch_msg = f"The uploaded file does not appear to be a valid {expected_label.lower()}. Please upload a genuine {expected_label.lower()}."
                return ValidationResult(
                    is_valid=False,
                    error_code="DOCUMENT_TYPE_MISMATCH",
                    message=mismatch_msg,
                    document_type=doc_type,
                    detected_category=detected_cat,
                    confidence=confidence,
                    reason=reason or mismatch_msg,
                    issues=issues or ["Document category mismatch", "Non-medical document"],
                    http_status=400
                )

            # Category matching check
            # Map doc_type to normalized category key
            detected_key = self.normalize_category_key(doc_type)

            # Special case: laboratory_report and pathology_report are closely related
            # If user selected Lab Report and uploaded Pathology or vice versa, they can be compatible in clinical lab workflows
            category_matches = (detected_key == expected_key)
            if not category_matches:
                if expected_key in ("laboratory_report", "pathology_report") and detected_key in ("laboratory_report", "pathology_report"):
                    category_matches = True

            if not category_matches:
                mismatch_msg = f"The uploaded file does not appear to be a valid {expected_label.lower()}. Please upload a genuine {expected_label.lower()}."
                return ValidationResult(
                    is_valid=False,
                    error_code="DOCUMENT_TYPE_MISMATCH",
                    message=mismatch_msg,
                    document_type=doc_type,
                    detected_category=detected_cat,
                    confidence=confidence,
                    reason=reason or mismatch_msg,
                    issues=["Document category mismatch"] + [i for i in issues if i != "Document category mismatch"],
                    http_status=400
                )

            if not is_valid:
                mismatch_msg = f"The uploaded file does not appear to be a valid {expected_label.lower()}. Please upload a genuine {expected_label.lower()}."
                return ValidationResult(
                    is_valid=False,
                    error_code="INVALID_DOCUMENT",
                    message=mismatch_msg,
                    document_type=doc_type,
                    detected_category=detected_cat,
                    confidence=confidence,
                    reason=reason or mismatch_msg,
                    issues=issues or ["Invalid document content"],
                    http_status=400
                )

            # Validation succeeded
            return ValidationResult(
                is_valid=True,
                document_type=detected_key,
                detected_category=detected_cat or expected_label,
                confidence=confidence,
                reason=reason or f"Valid {expected_label.lower()} detected",
                issues=[],
                http_status=200
            )

        except (AIQuotaExceededError, AIServiceUnavailableError) as e:
            logger.error(f"AI service unavailable during document classification: {e}")
            return ValidationResult(
                is_valid=False,
                error_code="AI_VALIDATION_FAILED",
                message=ERROR_MESSAGES["AI_VALIDATION_FAILED"],
                issues=[str(e)],
                http_status=503
            )
        except Exception as e:
            err_msg = str(e)
            logger.error(f"Document classification exception: {err_msg}")
            if "quota" in err_msg.lower() or "resource_exhausted" in err_msg.lower() or "429" in err_msg:
                return ValidationResult(
                    is_valid=False,
                    error_code="AI_VALIDATION_FAILED",
                    message=ERROR_MESSAGES["AI_VALIDATION_FAILED"],
                    issues=["AI provider quota exhausted"],
                    http_status=503
                )
            return ValidationResult(
                is_valid=False,
                error_code="AI_VALIDATION_FAILED",
                message=ERROR_MESSAGES["AI_VALIDATION_FAILED"],
                issues=[err_msg],
                http_status=503
            )

    def _parse_classification_json(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Safely extracts JSON object from model output.
        """
        if not text:
            return None
        clean = text.strip()
        if "AI system failure" in clean or "All fallbacks exhausted" in clean:
            return None

        # Strip markdown fences
        if clean.startswith("```"):
            clean = re.sub(r"^```(?:json)?\s*", "", clean)
            clean = re.sub(r"\s*```$", "", clean)

        start = clean.find("{")
        end = clean.rfind("}")
        if start != -1 and end != -1 and end >= start:
            json_substr = clean[start:end + 1]
            try:
                return json.loads(json_substr)
            except json.JSONDecodeError:
                pass
        try:
            return json.loads(clean)
        except Exception:
            return None

    async def validate_document(
        self,
        file_bytes: bytes,
        filename: str = "",
        content_type: str = "",
        expected_category: str = "prescription"
    ) -> ValidationResult:
        """
        Complete end-to-end document validation workflow:
        1. Validates physical image integrity, clarity, dimensions, and blurriness.
        2. Normalizes image.
        3. Conducts dedicated AI content classification against expected category.
        """
        # Step 1: Pre-AI Physical & Format Validation
        physical_res = self.validate_file_integrity_and_clarity(file_bytes, filename, content_type)
        if not physical_res.is_valid:
            return physical_res

        # Step 2: AI Document Classification
        norm_bytes = physical_res.normalized_image_bytes or file_bytes
        norm_mime = physical_res.normalized_mime_type or content_type or "image/jpeg"

        ai_res = await self.classify_document_content(
            image_bytes=norm_bytes,
            mime_type=norm_mime,
            expected_category=expected_category
        )

        if not ai_res.is_valid:
            # Preserve normalized bytes in case caller needs them for logging/diagnostics
            ai_res.normalized_image_bytes = norm_bytes
            ai_res.normalized_mime_type = norm_mime
            ai_res.metadata = physical_res.metadata
            return ai_res

        # Merge physical metadata with AI classification result
        ai_res.normalized_image_bytes = norm_bytes
        ai_res.normalized_mime_type = norm_mime
        ai_res.metadata = {**physical_res.metadata, **ai_res.metadata}
        return ai_res


document_validator = DocumentValidator()

