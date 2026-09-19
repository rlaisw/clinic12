"""
Auto-indexing via Django signals: re-index a record into LanceDB whenever
any indexed model is saved or deleted (Option A).
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone

from api.models import (
    Patient,
    MedicalHistory,
    ActiveMedication,
    PastMedication,
    Allergy,
    PrescriptionMedication,
    PatientBackground,
    SickLeaveCertificate,
    Receipt,
)
from .indexer import index_record, unindex_record

INDEXED_MODELS = [
    Patient,
    MedicalHistory,
    ActiveMedication,
    PastMedication,
    Allergy,
    PrescriptionMedication,
    PatientBackground,
]

# Models that carry a diagnosis and should also populate MedicalHistory
# (the patient's condition history row the chatbot reads for "medical history" queries).
DIAGNOSIS_SOURCES = [
    (SickLeaveCertificate, "diagnosis", "issue_date"),
    (Receipt, "diagnosis", "date"),
    (PrescriptionMedication, "diagnostic_result", "start_date"),
    (PastMedication, "diagnostic_result", "start_date"),
    (ActiveMedication, "diagnostic_result", "start_date"),
]


@receiver(post_save)
def on_save(sender, instance, **kwargs):
    if sender in INDEXED_MODELS:
        index_record(sender, instance)


@receiver(post_delete)
def on_delete(sender, instance, **kwargs):
    if sender in INDEXED_MODELS:
        unindex_record(sender, instance)


@receiver(post_save, dispatch_uid="record_diagnosis_in_medical_history")
def record_diagnosis(sender, instance, **kwargs):
    """Keep MedicalHistory in sync: any recorded diagnosis becomes a condition row."""
    for model, diag_field, date_field in DIAGNOSIS_SOURCES:
        if sender is not model or not hasattr(instance, "patient_id"):
            continue
        condition = (getattr(instance, diag_field) or "").strip()
        if not condition:
            return
        diagnosis_date = getattr(instance, date_field, None) or timezone.now().date()
        # Dedupe case-insensitively so "influenza" vs "Influenza" create one row.
        if MedicalHistory.objects.filter(patient_id=instance.patient_id, condition__iexact=condition).exists():
            return
        MedicalHistory.objects.create(
            patient_id=instance.patient_id,
            condition=condition,
            diagnosis_date=diagnosis_date,
            notes=f"Recorded from {model.__name__}",
        )
        return
