"""
CocoIndex Pipeline Configuration for Clinic RAG System
Processes medical records from SQLite and generates embeddings for LanceDB
"""

import os
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ProcessingMode(Enum):
    """Processing modes for the pipeline"""
    REALTIME = "realtime"
    BATCH = "batch"
    HYBRID = "hybrid"


@dataclass
class EmbeddingConfig:
    """Configuration for embedding generation"""
    model: str = "sentence-transformers/all-MiniLM-L6-v2"
    dimensions: int = 384
    batch_size: int = 32
    max_length: int = 512


@dataclass
class ChunkingConfig:
    """Configuration for text chunking"""
    strategy: str = "sentence"
    chunk_size: int = 500
    overlap: int = 50
    min_chunk_size: int = 100


@dataclass
class LanceDBConfig:
    """Configuration for LanceDB storage"""
    uri: str = "lancedb"
    table_name: str = "clinical_embeddings"
    index_type: str = "IVF_PQ"
    metric: str = "cosine"
    num_partitions: int = 256
    num_sub_vectors: int = 96


@dataclass
class SourceConfig:
    """Configuration for a data source"""
    table: str
    text_columns: List[str]
    metadata_columns: List[str]
    id_column: str = "id"
    primary_key: str = "id"


class CocoIndexPipeline:
    """
    Configures and manages the CocoIndex pipeline for medical record indexing.
    Supports incremental updates and hybrid processing modes.
    """

    def __init__(self):
        self.embedding_config = EmbeddingConfig()
        self.chunking_config = ChunkingConfig()
        self.lancedb_config = LanceDBConfig()
        self.sources: List[SourceConfig] = []
        self._initialized = False

    def add_source(
        self,
        table: str,
        text_columns: List[str],
        metadata_columns: List[str],
        id_column: str = "id",
        primary_key: str = "id"
    ) -> None:
        """Add a data source to the pipeline"""
        source = SourceConfig(
            table=table,
            text_columns=text_columns,
            metadata_columns=metadata_columns,
            id_column=id_column,
            primary_key=primary_key
        )
        self.sources.append(source)
        logger.info(f"Added source: {table}")

    def configure_medical_sources(self) -> None:
        """Configure default medical record sources"""
        # Patient demographics and basic info
        self.add_source(
            table="api_patient",
            text_columns=["first_name", "last_name", "address", "blood_type", "allergies"],
            metadata_columns=["gender", "date_of_birth", "phone", "email", "hkid"],
            id_column="id",
            primary_key="id"
        )

        # Medical history
        self.add_source(
            table="api_medicalhistory",
            text_columns=["condition", "notes"],
            metadata_columns=["diagnosis_date"],
            id_column="id",
            primary_key="id"
        )

        # Active medications
        self.add_source(
            table="api_activemedication",
            text_columns=["name", "dosage", "frequency", "diagnostic_result"],
            metadata_columns=["route", "days_supply", "start_date"],
            id_column="id",
            primary_key="id"
        )

        # Prescription medications
        self.add_source(
            table="api_prescriptionmedication",
            text_columns=["medication_name", "dosage_amount", "dosage_unit", "frequency", "diagnostic_result"],
            metadata_columns=["route", "days_supply", "start_date", "end_date"],
            id_column="id",
            primary_key="id"
        )

        # Past medications
        self.add_source(
            table="api_pastmedication",
            text_columns=["name", "dosage", "frequency", "diagnostic_result", "reason_discontinuation"],
            metadata_columns=["route", "days_supply", "start_date", "end_date"],
            id_column="id",
            primary_key="id"
        )

        # Allergies
        self.add_source(
            table="api_allergy",
            text_columns=["substance", "reaction"],
            metadata_columns=["severity"],
            id_column="id",
            primary_key="id"
        )

        # Patient background
        self.add_source(
            table="api_patientbackground",
            text_columns=["chief_complaint", "occupation"],
            metadata_columns=["past_medical_history", "social_family_history"],
            id_column="id",
            primary_key="id"
        )

        logger.info(f"Configured {len(self.sources)} medical record sources")

    def build_pipeline_spec(self) -> Dict[str, Any]:
        """Build the complete pipeline specification for CocoIndex"""
        if not self.sources:
            self.configure_medical_sources()

        # Base pipeline configuration
        spec = {
            "version": "1.0",
            "embedding": asdict(self.embedding_config),
            "chunking": asdict(self.chunking_config),
            "storage": asdict(self.lancedb_config),
            "sources": [asdict(s) for s in self.sources],
            "processing": {
                "mode": ProcessingMode.HYBRID.value,
                "realtime_threshold_seconds": 2,
                "batch_interval_seconds": 600,
                "max_batch_size": 1000,
                "retry_attempts": 3,
                "retry_backoff_seconds": 5
            },
            "medical_domain": {
                "language": "en",
                "anonymize_pii": True,
                "pii_fields": ["first_name", "last_name", "address", "phone", "email", "hkid"],
                "medical_entities": [
                    "diagnosis", "medication", "dosage", "procedure",
                    "allergy", "lab_value", "vital_sign", "anatomy"
                ]
            }
        }

        return spec

    def save_config(self, path: str) -> None:
        """Save pipeline configuration to file"""
        spec = self.build_pipeline_spec()
        with open(path, 'w') as f:
            json.dump(spec, f, indent=2)
        logger.info(f"Pipeline configuration saved to {path}")

    @classmethod
    def load_config(cls, path: str) -> 'CocoIndexPipeline':
        """Load pipeline configuration from file"""
        with open(path, 'r') as f:
            spec = json.load(f)

        pipeline = cls()
        pipeline.embedding_config = EmbeddingConfig(**spec.get("embedding", {}))
        pipeline.chunking_config = ChunkingConfig(**spec.get("chunking", {}))
        pipeline.lancedb_config = LanceDBConfig(**spec.get("storage", {}))

        for source_data in spec.get("sources", []):
            pipeline.sources.append(SourceConfig(**source_data))

        pipeline._initialized = True
        return pipeline


class MedicalTextProcessor:
    """
    Processes medical text for optimal embedding generation.
    Handles anonymization, entity recognition, and structured extraction.
    """

    # Medical entity patterns for extraction
    ENTITY_PATTERNS = {
        'diagnosis': [
            r'\b(diagnos(e|is|ed|ing)?)\b',
            r'\b(condition|disease|disorder|syndrome)\b'
        ],
        'medication': [
            r'\b(medicat(ion|ion|e)?)\b',
            r'\b(drug|prescription|rx)\b'
        ],
        'dosage': [
            r'\b\d+\.?\d*\s*(mg|mcg|g|ml|units?|IU)\b',
            r'\b(dose|dosage|strength)\b'
        ],
        'lab_value': [
            r'\b\d+\.?\d*\s*(mmol|g/dl|mg/dl|ng/ml|pg/ml|IU/l|u/l)\b',
            r'\b(hemoglobin|glucose|creatinine|bilirubin|alt|ast|bun|cr|hba1c|tsh)\b'
        ],
        'vital_sign': [
            r'\b(bp|blood pressure|heart rate|pulse|temperature|temp|spo2|rr|respiratory rate)\b'
        ]
    }

    @classmethod
    def preprocess_record(cls, record: Dict[str, Any], source_config: SourceConfig) -> Dict[str, Any]:
        """
        Preprocess a database record for embedding.
        - Anonymize PII
        - Extract medical entities
        - Structure text for semantic search
        """
        processed = {
            'source_table': source_config.table,
            'record_id': record.get(source_config.id_column),
            'text_content': '',
            'metadata': {},
            'entities': {}
        }

        # Build text content from text columns
        text_parts = []
        for col in source_config.text_columns:
            value = record.get(col)
            if value:
                text_parts.append(f"{col}: {value}")

        processed['text_content'] = ' | '.join(text_parts)

        # Extract metadata
        for col in source_config.metadata_columns:
            if col in record and record[col] is not None:
                processed['metadata'][col] = record[col]

        # Anonymize PII in text content
        processed['text_content'] = cls._anonymize_pii(processed['text_content'])

        # Extract medical entities
        processed['entities'] = cls._extract_entities(processed['text_content'])

        return processed

    @classmethod
    def _anonymize_pii(cls, text: str) -> str:
        """Remove or mask PII from text"""
        import re
        # Mask HKID
        text = re.sub(r'[A-Z]\d{6}\([A-Z0-9]\)', '[HKID]', text)
        # Mask phone numbers
        text = re.sub(r'\b\d{8}\b', '[PHONE]', text)
        # Mask email
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
        return text

    @classmethod
    def _extract_entities(cls, text: str) -> Dict[str, List[str]]:
        """Extract medical entities from text"""
        import re
        entities = {}
        text_lower = text.lower()

        for entity_type, patterns in cls.ENTITY_PATTERNS.items():
            matches = []
            for pattern in patterns:
                found = re.findall(pattern, text_lower, re.IGNORECASE)
                matches.extend(found)
            if matches:
                entities[entity_type] = list(set(matches))

        return entities


def create_default_pipeline() -> CocoIndexPipeline:
    """Create a default pipeline configured for medical records"""
    pipeline = CocoIndexPipeline()
    pipeline.configure_medical_sources()
    return pipeline