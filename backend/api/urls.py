from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import PatientViewSet, QueueEntryViewSet, ActiveMedicationViewSet, PastMedicationViewSet, AllergyViewSet, PrescriptionMedicationViewSet, SickLeaveCertificateViewSet, VerifyCertificateView, ShareLinkDownloadView, SrefPreviewView, waiting_queue_data, sql_query, sql_schema
from .receipts.views import ReceiptViewSet, VerifyReceiptView
from .rag.views import RagQueryViewSet

router = DefaultRouter()
router.register(r'patients', PatientViewSet)
router.register(r'queue', QueueEntryViewSet, basename='queue')
router.register(r'medications/active', ActiveMedicationViewSet, basename='active-medication')
router.register(r'medications/past', PastMedicationViewSet, basename='past-medication')
router.register(r'allergies', AllergyViewSet, basename='allergy')
router.register(r'prescriptions', PrescriptionMedicationViewSet, basename='prescription')
router.register(r'sick-leave-certificates', SickLeaveCertificateViewSet, basename='sick-leave-certificate')
router.register(r'receipts', ReceiptViewSet, basename='receipt')
router.register(r'rag', RagQueryViewSet, basename='rag')

rag_list = RagQueryViewSet.as_view({'get': 'list'})
rag_query = RagQueryViewSet.as_view({'post': 'query'})
rag_chat = RagQueryViewSet.as_view({'post': 'chat'})
rag_health = RagQueryViewSet.as_view({'get': 'health'})
rag_alerts = RagQueryViewSet.as_view({'get': 'alerts'})

urlpatterns = [
    path('queue/waiting/', waiting_queue_data, name='waiting-queue'),
    path('sql/', sql_query, name='sql-query'),
    path('sql/schema', sql_schema, name='sql-schema'),
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify/<str:qr_code_token>/', VerifyCertificateView.as_view(), name='verify-certificate'),
    path('share/<str:token>/', ShareLinkDownloadView.as_view(), name='share-link-download'),
    path('sref-preview/', SrefPreviewView.as_view(), name='sref-preview'),
    path('verify-receipt/<str:token>/', VerifyReceiptView.as_view(), name='verify-receipt'),
    # RAG endpoints without trailing slashes (for reverse proxy compatibility)
    path('rag', rag_list, name='rag-list'),
    path('rag/query', rag_query, name='rag-query'),
    path('rag/chat', rag_chat, name='rag-chat'),
    path('rag/health', rag_health, name='rag-health'),
    path('rag/alerts', rag_alerts, name='rag-alerts'),
]