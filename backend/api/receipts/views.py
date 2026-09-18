import logging
import traceback

from rest_framework import viewsets, filters, status, generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action, permission_classes
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q
from django.db import transaction
from django.conf import settings
from datetime import date
from ..models import Receipt, Patient

logger = logging.getLogger(__name__)
from .serializers import ReceiptSerializer, ReceiptListSerializer, ReceiptVerifySerializer
from ..utils import generate_receipt_number, generate_receipt_qr_code_token, generate_receipt_pdf_from_template, verify_receipt_qr_code_token, amount_to_english_words
from ..views import DoctorPermission


class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    permission_classes = [DoctorPermission]

    def get_queryset(self):
        qs = Receipt.objects.all()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(patient_name__icontains=search) |
                Q(diagnosis__icontains=search) |
                Q(rref__icontains=search)
            )
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ReceiptListSerializer
        return ReceiptSerializer

    def create(self, request, *args, **kwargs):
        patient_id = request.data.get('patient')
        if not patient_id:
            return Response({'error': 'patient is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        
        doctor = request.user
        profile = doctor.profile
        issue_date = timezone.now().date()
        qr_token = generate_receipt_qr_code_token(str(patient.id), issue_date)
        reference_number = generate_receipt_number(issue_date)

        # Calculate total dollars in words
        total_free = float(request.data.get('total_free', 0))
        total_dollars = amount_to_english_words(total_free)

        serializer = ReceiptSerializer(data={
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
            'date': issue_date.isoformat(),
            'rref': reference_number,
            'total_dollars': total_dollars,
            'qr_code_token': qr_token,
        })
        serializer.is_valid(raise_exception=True)
        receipt = serializer.save()
        return Response(ReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        receipt = self.get_object()
        base_url = settings.FRONTEND_BASE_URL
        try:
            pdf_bytes = generate_receipt_pdf_from_template(receipt, base_url=base_url)
        except Exception as e:
            # Log the full detail server-side (stack trace + receipt context),
            # return only a safe, user-meaningful summary to the client.
            logger.error(
                "Receipt PDF generation failed. receipt_id=%s rref=%s error_type=%s error=%s",
                getattr(receipt, "id", None),
                getattr(receipt, "rref", None),
                type(e).__name__,
                e,
                exc_info=True,
            )
            return Response(
                {
                    "error": "Receipt PDF generation failed. Please try again or contact support.",
                    "error_type": type(e).__name__,
                    "receipt_id": str(getattr(receipt, "id", "")),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return HttpResponse(pdf_bytes, content_type='application/pdf', headers={
            'Content-Disposition': f'attachment; filename="receipt-{receipt.id}.pdf"'
        })

    @action(detail=True, methods=['patch'], url_path='revoke')
    def revoke(self, request, pk=None):
        receipt = self.get_object()
        if receipt.status != 'active':
            return Response({'error': 'Receipt is not active'}, status=status.HTTP_400_BAD_REQUEST)
        receipt.status = 'revoked'
        receipt.revoked_timestamp = timezone.now()
        receipt.save()
        return Response({'id': str(receipt.id), 'status': 'revoked', 'revoked_timestamp': receipt.revoked_timestamp})


class VerifyReceiptView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    throttle_scope = 'verify'

    def get(self, request, token):
        if not verify_receipt_qr_code_token(token):
            return Response({'verified': False, 'message': 'Fake — receipt cannot be verified'})
        try:
            receipt = Receipt.objects.get(qr_code_token=token)
        except Receipt.DoesNotExist:
            return Response({'verified': False, 'message': 'Fake — receipt cannot be verified'})

        if receipt.status == 'revoked':
            return Response({'verified': False, 'message': 'This receipt has been revoked'})
        # Expiry check: receipts expire 10 years from date
        if timezone.now().date() > receipt.date.replace(year=receipt.date.year + 10):
            return Response({'verified': False, 'message': 'This receipt has expired'})

        return Response({
            'verified': True,
            'message': 'Verified by the clinic and signed by doctor',
            'receipt': {
                'rref': receipt.rref,
                'patient_name': receipt.patient_name,
                'doctor_name': receipt.doctor_name,
                'doctor_display_name': receipt.doctor_display_name,
                'clinic_name': receipt.clinic_name,
                'date': receipt.date,
                'total_free': receipt.total_free,
                'total_dollars': receipt.total_dollars,
                'diagnosis': receipt.diagnosis,
            }
        })