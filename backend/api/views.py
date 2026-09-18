import logging

from rest_framework import viewsets, filters, status, generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q
from django.db import transaction
from django.conf import settings
from datetime import date
from .models import Patient, QueueEntry, PatientBackground, ActiveMedication, PastMedication, Allergy, PrescriptionMedication, SickLeaveCertificate, ShareLink

logger = logging.getLogger(__name__)
from .serializers import PatientSerializer, QueueEntrySerializer, QueueCheckInSerializer, PatientBackgroundSerializer, ActiveMedicationSerializer, PastMedicationSerializer, AllergySerializer, PrescriptionMedicationSerializer, SickLeaveCertificateSerializer, SickLeaveCertificateListSerializer, ShareLinkSerializer
from .utils import generate_qr_code_token, generate_qr_code_image_base64, generate_qr_code_image_from_data, generate_certificate_pdf_from_template, compute_expiry_date, verify_qr_code_token


class DoctorPermission(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view) or not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role == 'doctor'


class SrefPreviewView(generics.GenericAPIView):
    permission_classes = [DoctorPermission]

    def get(self, request):
        from .models import CertificateCounter
        try:
            counter = CertificateCounter.objects.get(id=1)
            next_seq = counter.last_sequence + 1
        except CertificateCounter.DoesNotExist:
            next_seq = 1
        year_code = date.today().year - 2025
        digits = f"{next_seq:012d}"
        sref = f"S{year_code:03d}-{digits[0:4]}-{digits[4:8]}-{digits[8:12]}"
        return Response({'sref': sref})


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email', 'hkid']
    ordering = ['-timestamp']

    @action(detail=True, methods=['get', 'patch'], permission_classes=[DoctorPermission])
    def background(self, request, pk=None):
        try:
            background_obj = PatientBackground.objects.get(patient_id=pk)
        except PatientBackground.DoesNotExist:
            if request.method == 'GET':
                return Response({'patient': str(pk), 'chief_complaint': '', 'past_medical_history': {}, 'social_family_history': {}, 'occupation': ''})
            background_obj = PatientBackground.objects.create(patient_id=pk)

        if request.method == 'GET':
            return Response(PatientBackgroundSerializer(background_obj).data)

        serializer = PatientBackgroundSerializer(background_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='medications/active', permission_classes=[DoctorPermission])
    def active_medications(self, request, pk=None):
        if request.method == 'GET':
            meds = ActiveMedication.objects.filter(patient_id=pk)
            return Response(ActiveMedicationSerializer(meds, many=True).data)
        serializer = ActiveMedicationSerializer(data={**request.data, 'patient': pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='medications/past', permission_classes=[DoctorPermission])
    def past_medications(self, request, pk=None):
        if request.method == 'GET':
            meds = PastMedication.objects.filter(patient_id=pk)
            return Response(PastMedicationSerializer(meds, many=True).data)
        serializer = PastMedicationSerializer(data={**request.data, 'patient': pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='allergies', permission_classes=[DoctorPermission])
    def allergies(self, request, pk=None):
        if request.method == 'GET':
            allergy_list = Allergy.objects.filter(patient_id=pk)
            return Response(AllergySerializer(allergy_list, many=True).data)
        serializer = AllergySerializer(data={**request.data, 'patient': pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='prescriptions', permission_classes=[DoctorPermission])
    def prescriptions(self, request, pk=None):
        if request.method == 'GET':
            presc_list = PrescriptionMedication.objects.filter(patient_id=pk)
            return Response(PrescriptionMedicationSerializer(presc_list, many=True).data)
        serializer = PrescriptionMedicationSerializer(data={**request.data, 'patient': pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='sick-leave-certificates', permission_classes=[DoctorPermission])
    def sick_leave_certificates(self, request, pk=None):
        if request.method == 'GET':
            search = request.query_params.get('search', '')
            certs = SickLeaveCertificate.objects.filter(patient_id=pk)
            if search:
                certs = certs.filter(
                    Q(patient_name__icontains=search) |
                    Q(diagnosis__icontains=search) |
                    Q(reference_number__icontains=search)
                )
            return Response(SickLeaveCertificateListSerializer(certs, many=True).data)

        patient = self.get_object()
        doctor = request.user
        profile = doctor.profile
        patient_full_name = f"{patient.first_name} {patient.last_name}"
        issue_date = timezone.now().date()
        qr_token = generate_qr_code_token(str(patient.id), issue_date)

        serializer = SickLeaveCertificateSerializer(data={
            **request.data,
            'patient': patient.id,
            'doctor_name': doctor.get_full_name() or doctor.username,
            'doctor_display_name': getattr(profile, 'display_name', '') or '',
            'doctor_email': doctor.email,
            'doctor_phone': getattr(profile, 'phone', '') or '',
            'clinic_name': profile.clinic_name or '',
            'clinic_address': profile.clinic_address or '',
            'patient_name': patient_full_name,
            'patient_hkid': patient.hkid,
            'expiry_date': compute_expiry_date(issue_date),
            'qr_code_token': qr_token,
        })
        serializer.is_valid(raise_exception=True)
        certificate = serializer.save()

        from django.conf import settings
        qr_verify_url = f"{settings.FRONTEND_BASE_URL}/verify/{qr_token}"
        qr_base64 = generate_qr_code_image_from_data(qr_verify_url)
        response_data = SickLeaveCertificateSerializer(certificate).data
        response_data['qr_code_base64'] = qr_base64
        return Response(response_data, status=status.HTTP_201_CREATED)


class QueueEntryViewSet(viewsets.ModelViewSet):
    queryset = QueueEntry.objects.all()
    serializer_class = QueueEntrySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return QueueEntry.objects.all().select_related('patient').order_by('-check_in_time')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        waiting_count = QueueEntry.objects.filter(status='waiting').count()
        in_consultation_count = QueueEntry.objects.filter(status='in_consultation').count()
        in_clinic_count = waiting_count + in_consultation_count

        next_up = QueueEntry.objects.filter(status='waiting').order_by('check_in_time').first()

        avg_wait_time = 0
        waiting_entries = QueueEntry.objects.filter(status='waiting')
        if waiting_entries.exists() and waiting_entries.count() > 0:
            total_minutes = sum(int((timezone.now() - e.check_in_time).total_seconds() / 60) for e in waiting_entries)
            avg_wait_time = total_minutes // waiting_entries.count()

        return Response({
            'waiting': waiting_count,
            'in_consultation': in_consultation_count,
            'in_clinic': in_clinic_count,
            'next_up': QueueEntrySerializer(next_up).data if next_up else None,
            'avg_wait_time': avg_wait_time,
        })

    @action(detail=False, methods=['post'])
    def check_in(self, request):
        serializer = QueueCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = Patient.objects.get(id=serializer.validated_data['patient_id'])
        entry = QueueEntry.objects.create(
            patient=patient,
            visit_type=serializer.validated_data['visit_type'],
            reason=serializer.validated_data.get('reason', ''),
        )
        return Response(QueueEntrySerializer(entry).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def call(self, request, pk=None):
        entry = self.get_object()
        entry.status = 'in_consultation'
        entry.consultation_start_time = timezone.now()
        entry.save()
        return Response(QueueEntrySerializer(entry).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        entry = self.get_object()
        entry.status = 'completed'
        entry.completed_at = timezone.now()
        entry.save()
        return Response(QueueEntrySerializer(entry).data)

    @action(detail=False, methods=['delete'])
    def completed(self, request):
        deleted_count, _ = QueueEntry.objects.filter(status='completed').delete()
        return Response({'deleted': deleted_count}, status=status.HTTP_200_OK)


class ActiveMedicationViewSet(viewsets.ModelViewSet):
    queryset = ActiveMedication.objects.all()
    serializer_class = ActiveMedicationSerializer
    permission_classes = [DoctorPermission]


class PastMedicationViewSet(viewsets.ModelViewSet):
    queryset = PastMedication.objects.all()
    serializer_class = PastMedicationSerializer
    permission_classes = [DoctorPermission]


class AllergyViewSet(viewsets.ModelViewSet):
    queryset = Allergy.objects.all()
    serializer_class = AllergySerializer
    permission_classes = [DoctorPermission]


class PrescriptionMedicationViewSet(viewsets.ModelViewSet):
    queryset = PrescriptionMedication.objects.all()
    serializer_class = PrescriptionMedicationSerializer
    permission_classes = [DoctorPermission]


class SickLeaveCertificateViewSet(viewsets.ModelViewSet):
    queryset = SickLeaveCertificate.objects.all()
    serializer_class = SickLeaveCertificateSerializer
    permission_classes = [DoctorPermission]

    def get_queryset(self):
        qs = SickLeaveCertificate.objects.all()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(patient_name__icontains=search) |
                Q(patient_hkid__icontains=search) |
                Q(diagnosis__icontains=search) |
                Q(reference_number__icontains=search) |
                Q(qr_code_token__icontains=search)
            )
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return SickLeaveCertificateListSerializer
        return SickLeaveCertificateSerializer

    def create(self, request, *args, **kwargs):
        patient_id = request.data.get('patient')
        if not patient_id:
            return Response({'error': 'patient is required'}, status=status.HTTP_400_BAD_REQUEST)
        patient = Patient.objects.get(id=patient_id)
        doctor = request.user
        profile = doctor.profile
        issue_date = timezone.now().date()
        qr_token = generate_qr_code_token(str(patient.id), issue_date)

        serializer = SickLeaveCertificateSerializer(data={
            **request.data,
            'patient': patient.id,
            'doctor_name': doctor.get_full_name() or doctor.username,
            'doctor_display_name': getattr(profile, 'display_name', '') or '',
            'doctor_email': doctor.email,
            'doctor_phone': getattr(profile, 'phone', '') or '',
            'clinic_name': profile.clinic_name or '',
            'clinic_address': profile.clinic_address or '',
            'patient_name': f"{patient.first_name} {patient.last_name}",
            'patient_hkid': patient.hkid,
            'expiry_date': compute_expiry_date(issue_date),
            'qr_code_token': qr_token,
        })
        serializer.is_valid(raise_exception=True)
        certificate = serializer.save()
        return Response(SickLeaveCertificateSerializer(certificate).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def revoke(self, request, pk=None):
        certificate = self.get_object()
        if certificate.status != 'active':
            return Response({'error': 'Certificate is not active'}, status=status.HTTP_400_BAD_REQUEST)
        certificate.status = 'revoked'
        certificate.revoked_timestamp = timezone.now()
        certificate.save()
        return Response({'id': str(certificate.id), 'status': 'revoked', 'revoked_timestamp': certificate.revoked_timestamp})

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        certificate = self.get_object()
        base_url = settings.FRONTEND_BASE_URL
        try:
            pdf_bytes = generate_certificate_pdf_from_template(certificate, base_url=base_url)
        except Exception as e:
            # Log the full detail server-side (stack trace + certificate context),
            # return only a safe, user-meaningful summary to the client.
            logger.error(
                "Sick-leave certificate PDF generation failed. certificate_id=%s error_type=%s error=%s",
                getattr(certificate, "id", None),
                type(e).__name__,
                e,
                exc_info=True,
            )
            return Response(
                {
                    "error": "Certificate PDF generation failed. Please try again or contact support.",
                    "error_type": type(e).__name__,
                    "certificate_id": str(getattr(certificate, "id", "")),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return HttpResponse(pdf_bytes, content_type='application/pdf', headers={
            'Content-Disposition': f'attachment; filename="sick-leave-certificate-{certificate.id}.pdf"'
        })

    @action(detail=True, methods=['post'], url_path='share-link')
    def share_link(self, request, pk=None):
        certificate = self.get_object()
        import uuid
        from datetime import timedelta
        token = uuid.uuid4().hex
        max_views = request.data.get('max_views', None)
        if max_views is not None:
            max_views = int(max_views)
        share = ShareLink.objects.create(
            certificate=certificate,
            token=token,
            expires_at=timezone.now() + timedelta(days=31),
            max_views=max_views,
        )
        base_url = request.build_absolute_uri('/api/')
        share_url = f"{base_url.rstrip('/')}/share/{token}/"
        return Response({
            'share_url': share_url,
            'expires_at': share.expires_at,
            'max_views': max_views,
        }, status=status.HTTP_201_CREATED)


class VerifyCertificateView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    throttle_scope = 'verify'

    def get(self, request, qr_code_token):
        if not verify_qr_code_token(qr_code_token):
            return Response({'verified': False, 'message': 'Fake — certificate cannot be verified'})
        try:
            certificate = SickLeaveCertificate.objects.get(qr_code_token=qr_code_token)
        except SickLeaveCertificate.DoesNotExist:
            return Response({'verified': False, 'message': 'Fake — certificate cannot be verified'})

        if certificate.status == 'revoked':
            return Response({'verified': False, 'message': 'This certificate has been revoked'})
        if timezone.now().date() > certificate.expiry_date:
            return Response({'verified': False, 'message': 'This certificate has expired'})

        return Response({
            'verified': True,
            'message': 'Verified by the clinic and signed by doctor',
            'certificate': {
                'reference_number': certificate.reference_number,
                'patient_name': certificate.patient_name,
                'doctor_name': certificate.doctor_name,
                'doctor_display_name': certificate.doctor_display_name,
                'clinic_name': certificate.clinic_name,
                'issue_date': certificate.issue_date,
                'diagnosis': certificate.diagnosis,
                'recommended_sick_leave': certificate.recommended_sick_leave,
            }
        })


class ShareLinkDownloadView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            share = ShareLink.objects.get(token=token, is_active=True)
        except ShareLink.DoesNotExist:
            return Response({'error': 'Link not found'}, status=status.HTTP_404_NOT_FOUND)

        if timezone.now() > share.expires_at:
            return Response({'error': 'Link expired'}, status=status.HTTP_410_GONE)
        if share.max_views is not None and share.view_count >= share.max_views:
            return Response({'error': 'Max views reached'}, status=status.HTTP_410_GONE)

        certificate = share.certificate
        if certificate.status == 'revoked':
            return Response({'error': 'Certificate has been revoked'}, status=status.HTTP_410_GONE)

        pdf_bytes = generate_certificate_pdf_from_template(certificate, base_url=settings.FRONTEND_BASE_URL)
        share.view_count += 1
        share.save()
        return HttpResponse(pdf_bytes, content_type='application/pdf', headers={
            'Content-Disposition': f'attachment; filename="sick-leave-certificate-{certificate.id}.pdf"'
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def waiting_queue_data(request):
    """Return live waiting queue data from Django ORM — same source as the tab page."""
    from django.db.models import Q
    waiting = QueueEntry.objects.filter(status='waiting').select_related('patient').order_by('check_in_time')
    patients = [{
        "patient_id": q.patient.id,
        "patient_name": f"{q.patient.first_name} {q.patient.last_name}",
        "visit_type": q.visit_type,
        "reason": q.reason,
        "status": q.status,
        "check_in": q.check_in_time.strftime('%H:%M'),
    } for q in waiting]
    return Response({
        "total_waiting": len(patients),
        "patients": patients,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sql_query(request):
    """Execute a read-only SQL query and return results as JSON. For Dify HTTP POST node."""
    import sqlite3, re
    from django.conf import settings

    raw = request.data.get("sql", "").strip()
    if not raw:
        return Response({"error": "sql is required"}, status=status.HTTP_400_BAD_REQUEST)

# Strip reasoning preambles models sometimes emit before the SQL
    # ("thinking\n...\nresponseSELECT ... ;"). Greedy up to the LAST "response"
    # marker so prose mentions of the word don't cut the real statement.
    import re as _re
    raw = _re.sub(r'^\s*(?:thinking|reasoning)\b.*\bresponse\s*', '', raw, flags=_re.I | _re.S)
    raw = raw.strip()

# Extract candidate SQL statements from text (handles LLM output with
    # thinking/reasoning, tool-call wrappers and fenced blocks).
    sql_start_pattern = r'\b(WITH\s+\w+\s+AS\s*\()|(\bSELECT\s+(?:DISTINCT\s+)?(?:\*|CAST|COALESCE|COUNT|CASE|SUM|AVG|MIN|MAX|ROUND|GROUP|ORDER|FROM|\w[\w.]*|\d))'
    candidates = [
        block.strip() for block in re.findall(r'```[^\n]*\n(.*?)```', raw, re.S)
    ] if '```' in raw else []
    candidates.append(raw)

    statements = []
    for cand in candidates:
        matches = list(re.finditer(sql_start_pattern, cand, re.IGNORECASE))
        if not matches:
            continue
        # Try the outermost statement first, then the last one (the reasoning
        # preamble often contains a prose "we need SELECT ..." before the real
        # statement; UNION subqueries still resolve fine from the outermost).
        for pos in sorted({matches[0].start(), matches[-1].start()}):
            stmt = cand[pos:]
            stmt = re.sub(r'<\|[^|]*\|>', '', stmt)  # <|tool_call_start|>/…
            stmt = re.sub(r'\[(?:sql|query)\s*\(\s*[\'"]?', '', stmt)  # [sql('
            stmt = re.sub(r'[\'"]?\s*\)\]', '', stmt)  # ')] suffix
            stmt = stmt.split(';')[0].strip().rstrip(';').strip()
            stmt = re.sub(r'\s+LIMIT\s+\d+(?:\s*(?:OFFSET\s+\d+)?)?\s*$', '', stmt, flags=re.IGNORECASE)
            if stmt and stmt not in statements:
                statements.append(stmt)
    if not statements:
        return Response({"error": "no SELECT or WITH query found in input"}, status=status.HTTP_403_FORBIDDEN)

    db_path = settings.DATABASES['default']['NAME']
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    last_error = None
    try:
        for sql in statements:
            try:
                cursor = conn.cursor()
                cursor.execute(f"{sql} LIMIT 200")
                rows = [dict(r) for r in cursor.fetchall()]
                try:
                    cursor.execute(f"SELECT COUNT(*) as cnt FROM ({sql})")
                    total = cursor.fetchone()["cnt"]
                except Exception:
                    c2 = conn.cursor()
                    c2.execute(sql)
                    total = len(c2.fetchall())
                return Response({
                    "total": total,
                    "limit": 200,
                    "rows": rows,
                })
            except Exception as e:
                last_error = e
        return Response({"error": str(last_error)}, status=status.HTTP_400_BAD_REQUEST)
    finally:
        conn.close()


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def sql_schema(request):
    """Return all table schemas — Dify calls this first to learn column names."""
    # Root-cause guidance: the bot picked the empty api_prescriptionmedication over
    # api_activemedication because the name sounds canonical. Description steers it.
    TABLE_NOTES = {
        "api_activemedication": (
            "CURRENT prescriptions (name, dosage, route, frequency, days_supply, "
            "start_date, diagnostic_result). USE this table for 'what patients are "
            "prescribed / taking a medication' questions."
        ),
        "api_prescriptionmedication": (
            "Legacy prescription table. USUALLY EMPTY (0 rows); prefer api_activemedication for "
            "prescribed-medication questions."
        ),
        "api_patient": "Patient demographics (first_name, last_name, hkid, phone, blood_type, allergies).",
        "api_medicalhistory": "Patient medical conditions (condition, diagnosis_date, notes).",
        "api_allergy": "Patient allergies (substance, reaction, severity).",
        "api_sickleavecertificate": "Issued sick leave certificates.",
        "api_receipt": "Financial receipts (medications, investigations, diagnosis, totals).",
        "api_patientbackground": "Chief complaint, past/social/family history per patient.",
        "api_queueentry": "Queue/waiting-room entries (status, check_in_time, room).",
        "medication_medication": "Medication catalog/catalog-of-stock drugs (name, strength, stock). Not patient-specific.",
    }
    from django.db import connection
    tables = connection.introspection.table_names()
    schema = {}
    for table in tables:
        if table.startswith("django_") or table.startswith("auth_") or table.startswith("authtoken_") or table == "sqlite_sequence":
            continue
        cursor = connection.cursor()
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [
            {"name": row[1], "type": row[2], "nullable": not row[3]}
            for row in cursor.fetchall()
        ]
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        schema[table] = {"row_count": count, "columns": columns}
        if table in TABLE_NOTES:
            schema[table]["description"] = TABLE_NOTES[table]
    return Response({"tables": schema})