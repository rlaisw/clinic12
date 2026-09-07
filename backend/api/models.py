from django.db import models, transaction
from django.utils import timezone
import uuid

from .utils import generate_reference_number, generate_receipt_number


class PatientBackground(models.Model):
    patient = models.OneToOneField(
        'Patient', on_delete=models.CASCADE, related_name='background'
    )
    chief_complaint = models.TextField(blank=True)
    past_medical_history = models.JSONField(default=dict)
    social_family_history = models.JSONField(default=dict)
    occupation = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Background for {self.patient}"


class ActiveMedication(models.Model):
    ROUTE_CHOICES = [
        ('oral', 'Oral'),
        ('IV', 'IV'),
        ('IM', 'IM'),
        ('SC', 'SC'),
        ('topical', 'Topical'),
        ('inhalation', 'Inhalation'),
    ]

    patient = models.ForeignKey(
        'Patient', on_delete=models.CASCADE, related_name='active_medications'
    )
    item = models.PositiveIntegerField(default=1)
    name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    route = models.CharField(max_length=20, choices=ROUTE_CHOICES, default='oral')
    frequency = models.CharField(max_length=100)
    days_supply = models.PositiveIntegerField(null=True, blank=True)
    diagnostic_result = models.CharField(max_length=255, blank=True, default='')
    start_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.name} ({self.patient})"


class PastMedication(models.Model):
    ROUTE_CHOICES = [
        ('oral', 'Oral'),
        ('IV', 'IV'),
        ('IM', 'IM'),
        ('SC', 'SC'),
        ('topical', 'Topical'),
        ('inhalation', 'Inhalation'),
    ]

    patient = models.ForeignKey(
        'Patient', on_delete=models.CASCADE, related_name='past_medications'
    )
    item = models.PositiveIntegerField(default=1)
    name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    route = models.CharField(max_length=20, choices=ROUTE_CHOICES, default='oral')
    frequency = models.CharField(max_length=100)
    days_supply = models.PositiveIntegerField(null=True, blank=True)
    diagnostic_result = models.CharField(max_length=255, blank=True, default='')
    start_date = models.DateField()
    end_date = models.DateField()
    reason_discontinuation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-end_date']

    def __str__(self):
        return f"{self.name} ({self.patient})"


class Allergy(models.Model):
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
    ]

    patient = models.ForeignKey(
        'Patient', on_delete=models.CASCADE, related_name='patient_allergies'
    )
    substance = models.CharField(max_length=255)
    reaction = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='mild')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.substance} ({self.patient})"


class PrescriptionMedication(models.Model):
    ROUTE_CHOICES = [
        ('oral', 'Oral'),
        ('IV', 'IV'),
        ('IM', 'IM'),
        ('SC', 'SC'),
        ('topical', 'Topical'),
        ('inhalation', 'Inhalation'),
    ]

    patient = models.ForeignKey(
        'Patient', on_delete=models.CASCADE, related_name='prescription_medications'
    )
    item = models.PositiveIntegerField(default=1)
    medication_name = models.CharField(max_length=255)
    dosage_amount = models.DecimalField(max_digits=10, decimal_places=2)
    dosage_unit = models.CharField(max_length=20)
    route = models.CharField(max_length=20, choices=ROUTE_CHOICES)
    frequency = models.CharField(max_length=100)
    days_supply = models.PositiveIntegerField(null=True, blank=True)
    diagnostic_result = models.CharField(max_length=255, blank=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['item']

    def __str__(self):
        return f"{self.medication_name} ({self.patient})"


class Patient(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    address = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, unique=True, null=True)
    blood_type = models.CharField(max_length=5, blank=True, default='')
    allergies = models.TextField(blank=True, default='')
    hkid = models.CharField(max_length=20, blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"


class MedicalHistory(models.Model):
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='medical_history'
    )
    condition = models.CharField(max_length=255)
    diagnosis_date = models.DateField()
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-diagnosis_date']

    def __str__(self):
        return f"{self.condition} ({self.patient})"


class EmergencyContact(models.Model):
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='emergency_contacts'
    )
    name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)

    def __str__(self):
        return f"{self.name} ({self.relationship})"


class QueueEntry(models.Model):
    VISIT_TYPE_CHOICES = [
        ('follow_up', 'Follow-up'),
        ('walkin', 'Walk-in'),
        ('appointment', 'Appointment'),
        ('emergency', 'Emergency'),
    ]
    QUEUE_STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('in_consultation', 'In Consultation'),
        ('completed', 'Completed'),
    ]

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='queue_entries'
    )
    visit_type = models.CharField(max_length=20, choices=VISIT_TYPE_CHOICES, default='walkin')
    reason = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=QUEUE_STATUS_CHOICES, default='waiting')
    check_in_time = models.DateTimeField(auto_now_add=True)
    doctor_name = models.CharField(max_length=100, blank=True, default='')
    room_name = models.CharField(max_length=100, blank=True, default='')
    consultation_start_time = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-check_in_time']

    def __str__(self):
        return f"{self.patient} - {self.get_status_display()}"


class SickLeaveCertificate(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('revoked', 'Revoked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=32, unique=True, blank=True, null=True)
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='sick_leave_certificates'
    )
    doctor_name = models.CharField(max_length=255, blank=True)
    doctor_display_name = models.CharField(max_length=255, blank=True, default='')
    doctor_email = models.EmailField(blank=True)
    doctor_phone = models.CharField(max_length=20, blank=True)
    clinic_name = models.CharField(max_length=255, blank=True)
    clinic_address = models.TextField(blank=True)
    patient_name = models.CharField(max_length=255, blank=True)
    patient_hkid = models.CharField(max_length=20, blank=True)
    consultation_details = models.TextField()
    diagnosis = models.TextField()
    recommended_sick_leave = models.CharField(max_length=255)
    remarks = models.TextField(blank=True, default='')
    issue_date = models.DateField(auto_now_add=True)
    expiry_date = models.DateField()
    qr_code_token = models.CharField(max_length=512, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    signature_timestamp = models.DateTimeField(auto_now_add=True)
    revoked_timestamp = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-issue_date']

    def save(self, *args, **kwargs):
        if not self.reference_number:
            issue_date = self.issue_date or timezone.now().date()
            self.reference_number = generate_reference_number(issue_date)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"SickLeaveCertificate {self.id} - {self.patient_name}"


class CertificateCounter(models.Model):
    last_sequence = models.BigIntegerField(default=0)

    class Meta:
        verbose_name = "Certificate Counter"
        verbose_name_plural = "Certificate Counters"

    def __str__(self):
        return f"CertificateCounter {self.last_sequence}"


class ShareLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    certificate = models.ForeignKey(
        SickLeaveCertificate, on_delete=models.CASCADE, related_name='share_links'
    )
    token = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    max_views = models.PositiveIntegerField(null=True, blank=True)
    view_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ShareLink {self.token} - {self.certificate}"


class ReceiptCounter(models.Model):
    id = models.AutoField(primary_key=True)
    last_sequence = models.BigIntegerField(default=0)

    class Meta:
        verbose_name = "Receipt Counter"
        verbose_name_plural = "Receipt Counters"

    def __str__(self):
        return f"ReceiptCounter {self.last_sequence}"


class Receipt(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('revoked', 'Revoked'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rref = models.CharField(max_length=32, unique=True, blank=True, null=True)
    patient = models.ForeignKey(
        'Patient', on_delete=models.CASCADE, related_name='receipts'
    )
    doctor_name = models.CharField(max_length=255, blank=True)
    doctor_display_name = models.CharField(max_length=255, blank=True, default='')
    doctor_email = models.EmailField(blank=True)
    doctor_phone = models.CharField(max_length=20, blank=True)
    clinic_name = models.CharField(max_length=255, blank=True)
    clinic_address = models.TextField(blank=True)
    patient_name = models.CharField(max_length=255, blank=True)
    patient_hkid = models.CharField(max_length=20, blank=True)
    date = models.DateField(auto_now_add=True)
    consultation = models.TextField(blank=True, default='')
    medications = models.TextField(blank=True, default='')
    investigations = models.TextField(blank=True, default='')
    procedures = models.TextField(blank=True, default='')
    misc = models.TextField(blank=True, default='')
    consultation_free = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    medications_free = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    investigations_free = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    procedures_free = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    misc_free = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_free = models.DecimalField(max_digits=10, decimal_places=2)
    total_dollars = models.TextField()
    diagnosis = models.TextField()
    qr_code_token = models.CharField(max_length=512, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    signature_timestamp = models.DateTimeField(auto_now_add=True)
    revoked_timestamp = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def save(self, *args, **kwargs):
        if not self.rref:
            self.rref = generate_receipt_number(self.date)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Receipt {self.id} - {self.patient_name}"


class ReviewSession(models.Model):
    """Tracks staff review of a RAG-generated answer."""
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reviewer = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="rag_reviews"
    )
    query = models.TextField()
    answer = models.TextField()
    context_used = models.JSONField(default=list)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    review_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review {self.id} - {self.status}"


class ConversationSession(models.Model):
    """Stateful conversation session for the RAG hybrid router."""

    STATUS_CHOICES = [
        ("active", "Active"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_id = models.CharField(max_length=64, unique=True)
    doctor = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="rag_sessions"
    )
    patient = models.ForeignKey(
        "Patient", on_delete=models.CASCADE, related_name="conversation_sessions",
        null=True, blank=True
    )
    context_data = models.JSONField(default=dict)
    query_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Conversation {self.id} - {self.status}"

    def is_expired(self):
        return timezone.now() >= self.expires_at
