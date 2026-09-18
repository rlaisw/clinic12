"""
Auto-indexing via Django signals: re-index a record into LanceDB whenever
any indexed model is saved or deleted (Option A).
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from api.models import (
    Patient,
    MedicalHistory,
    ActiveMedication,
    PastMedication,
    Allergy,
    PrescriptionMedication,
    PatientBackground,
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


@receiver(post_save)
def on_save(sender, instance, **kwargs):
    if sender in INDEXED_MODELS:
        index_record(sender, instance)


@receiver(post_delete)
def on_delete(sender, instance, **kwargs):
    if sender in INDEXED_MODELS:
        unindex_record(sender, instance)
