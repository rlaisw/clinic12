from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from medication.models import Medication
from api.models import MedicalHistory, Patient
from decimal import Decimal
import random

fake = Faker()

# Medications that treat conditions found in patients' medical history
CONDITION_MEDICATIONS = {
    "Hypertension": [
        {"name": "Amlodipine", "generic_name": "Amlodipine Besylate", "category": "Antihypertensive", "unit": "MG", "strength": "5", "dosage_strength": "5mg", "route": "oral", "frequency": "DAILY", "side_effects": "Dizziness, ankle swelling, flushing"},
        {"name": "Lisinopril", "generic_name": "Lisinopril", "category": "Antihypertensive", "unit": "MG", "strength": "10", "dosage_strength": "10mg", "route": "oral", "frequency": "DAILY", "side_effects": "Dry cough, dizziness, headache"},
        {"name": "Enalapril", "generic_name": "Enalapril Maleate", "category": "Antihypertensive", "unit": "MG", "strength": "10", "dosage_strength": "10mg", "route": "oral", "frequency": "DAILY", "side_effects": "Dry cough, dizziness, fatigue"},
    ],
    "Diabetes Type 2": [
        {"name": "Metformin", "generic_name": "Metformin Hydrochloride", "category": "Antidiabetic", "unit": "MG", "strength": "500", "dosage_strength": "500mg", "route": "oral", "frequency": "BID", "side_effects": "Nausea, diarrhea, metallic taste"},
        {"name": "Glimepiride", "generic_name": "Glimepiride", "category": "Antidiabetic", "unit": "MG", "strength": "2", "dosage_strength": "2mg", "route": "oral", "frequency": "DAILY", "side_effects": "Hypoglycemia, weight gain"},
        {"name": "Empagliflozin", "generic_name": "Empagliflozin", "category": "Antidiabetic", "unit": "MG", "strength": "10", "dosage_strength": "10mg", "route": "oral", "frequency": "DAILY", "side_effects": "Urinary tract infection, thirst"},
    ],
    "Asthma": [
        {"name": "Salbutamol", "generic_name": "Albuterol Sulfate", "category": "Bronchodilator", "unit": "MG", "strength": "0.1", "dosage_strength": "100mcg", "route": "inhalation", "frequency": "PRN", "side_effects": "Tremor, palpitations, nervousness"},
        {"name": "Budesonide", "generic_name": "Budesonide", "category": "Corticosteroid", "unit": "MG", "strength": "0.2", "dosage_strength": "200mcg", "route": "inhalation", "frequency": "BID", "side_effects": "Oral thrush, hoarseness"},
        {"name": "Montelukast", "generic_name": "Montelukast Sodium", "category": "Leukotriene", "unit": "MG", "strength": "10", "dosage_strength": "10mg", "route": "oral", "frequency": "DAILY", "side_effects": "Headache, abdominal pain"},
    ],
    "Migraine": [
        {"name": "Sumatriptan", "generic_name": "Sumatriptan Succinate", "category": "Triptan", "unit": "MG", "strength": "50", "dosage_strength": "50mg", "route": "oral", "frequency": "PRN", "side_effects": "Tingling, chest tightness, dizziness"},
        {"name": "Propranolol", "generic_name": "Propranolol Hydrochloride", "category": "Beta-blocker", "unit": "MG", "strength": "40", "dosage_strength": "40mg", "route": "oral", "frequency": "BID", "side_effects": "Fatigue, cold hands, bradycardia"},
        {"name": "Rizatriptan", "generic_name": "Rizatriptan Benzoate", "category": "Triptan", "unit": "MG", "strength": "10", "dosage_strength": "10mg", "route": "oral", "frequency": "PRN", "side_effects": "Dizziness, somnolence, fatigue"},
    ],
    "Seasonal Allergies": [
        {"name": "Loratadine", "generic_name": "Loratadine", "category": "Antihistamine", "unit": "MG", "strength": "10", "dosage_strength": "10mg", "route": "oral", "frequency": "DAILY", "side_effects": "Headache, dry mouth, drowsiness"},
        {"name": "Cetirizine", "generic_name": "Cetirizine Hydrochloride", "category": "Antihistamine", "unit": "MG", "strength": "10", "dosage_strength": "10mg", "route": "oral", "frequency": "DAILY", "side_effects": "Drowsiness, dry mouth, fatigue"},
    ],
    "Cholesterol": [
        {"name": "Atorvastatin", "generic_name": "Atorvastatin Calcium", "category": "Statin", "unit": "MG", "strength": "20", "dosage_strength": "20mg", "route": "oral", "frequency": "DAILY", "side_effects": "Muscle pain, headache, nausea"},
        {"name": "Simvastatin", "generic_name": "Simvastatin", "category": "Statin", "unit": "MG", "strength": "20", "dosage_strength": "20mg", "route": "oral", "frequency": "DAILY", "side_effects": "Myopathy, constipation, headache"},
    ],
    "Hypothyroidism": [
        {"name": "Levothyroxine", "generic_name": "Levothyroxine Sodium", "category": "Thyroid Hormone", "unit": "MG", "strength": "0.1", "dosage_strength": "100mcg", "route": "oral", "frequency": "DAILY", "side_effects": "Palpitations, tremors, weight loss"},
        {"name": "Liothyronine", "generic_name": "Liothyronine Sodium", "category": "Thyroid Hormone", "unit": "MG", "strength": "0.025", "dosage_strength": "25mcg", "route": "oral", "frequency": "DAILY", "side_effects": "Palpitations, tremor, anxiety"},
    ],
    "Anxiety Disorder": [
        {"name": "Sertraline", "generic_name": "Sertraline Hydrochloride", "category": "SSRI", "unit": "MG", "strength": "50", "dosage_strength": "50mg", "route": "oral", "frequency": "DAILY", "side_effects": "Nausea, insomnia, sexual dysfunction"},
        {"name": "Alprazolam", "generic_name": "Alprazolam", "category": "Benzodiazepine", "unit": "MG", "strength": "0.5", "dosage_strength": "0.5mg", "route": "oral", "frequency": "PRN", "side_effects": "Drowsiness, dizziness, dependence"},
    ],
}

# Additional random common medications
RANDOM_MEDICATIONS = [
    {"name": "Omeprazole", "generic_name": "Omeprazole", "category": "PPI", "unit": "MG", "strength": "20", "dosage_strength": "20mg", "route": "oral", "frequency": "DAILY", "side_effects": "Headache, abdominal pain, nausea"},
    {"name": "Paracetamol", "generic_name": "Acetaminophen", "category": "Analgesic", "unit": "MG", "strength": "500", "dosage_strength": "500mg", "route": "oral", "frequency": "PRN", "side_effects": "Liver damage (overdose), rash"},
    {"name": "Ibuprofen", "generic_name": "Ibuprofen", "category": "NSAID", "unit": "MG", "strength": "200", "dosage_strength": "200mg", "route": "oral", "frequency": "TID", "side_effects": "GI bleeding, kidney issues, dyspepsia"},
    {"name": "Amoxicillin", "generic_name": "Amoxicillin Trihydrate", "category": "Antibiotic", "unit": "MG", "strength": "500", "dosage_strength": "500mg", "route": "oral", "frequency": "TID", "side_effects": "Diarrhea, rash, allergic reaction"},
    {"name": "Azithromycin", "generic_name": "Azithromycin", "category": "Antibiotic", "unit": "MG", "strength": "250", "dosage_strength": "250mg", "route": "oral", "frequency": "DAILY", "side_effects": "GI upset, QT prolongation"},
    {"name": "Aspirin", "generic_name": "Acetylsalicylic Acid", "category": "Antiplatelet", "unit": "MG", "strength": "81", "dosage_strength": "81mg", "route": "oral", "frequency": "DAILY", "side_effects": "GI bleeding, tinnitus"},
    {"name": "Citalopram", "generic_name": "Citalopram Hydrobromide", "category": "SSRI", "unit": "MG", "strength": "20", "dosage_strength": "20mg", "route": "oral", "frequency": "DAILY", "side_effects": "Nausea, dry mouth, drowsiness"},
    {"name": "Gabapentin", "generic_name": "Gabapentin", "category": "Anticonvulsant", "unit": "MG", "strength": "300", "dosage_strength": "300mg", "route": "oral", "frequency": "TID", "side_effects": "Dizziness, somnolence, peripheral edema"},
    {"name": "Amitriptyline", "generic_name": "Amitriptyline Hydrochloride", "category": "Tricyclic", "unit": "MG", "strength": "25", "dosage_strength": "25mg", "route": "oral", "frequency": "DAILY", "side_effects": "Sedation, dry mouth, constipation"},
    {"name": "Prednisone", "generic_name": "Prednisone", "category": "Corticosteroid", "unit": "MG", "strength": "5", "dosage_strength": "5mg", "route": "oral", "frequency": "DAILY", "side_effects": "Weight gain, hyperglycemia, insomnia"},
    {"name": "Warfarin", "generic_name": "Warfarin Sodium", "category": "Anticoagulant", "unit": "MG", "strength": "5", "dosage_strength": "5mg", "route": "oral", "frequency": "DAILY", "side_effects": "Bleeding, bruising, hair loss"},
    {"name": "Furosemide", "generic_name": "Furosemide", "category": "Diuretic", "unit": "MG", "strength": "40", "dosage_strength": "40mg", "route": "oral", "frequency": "DAILY", "side_effects": "Dehydration, electrolyte imbalance, hypotension"},
    {"name": "Tramadol", "generic_name": "Tramadol Hydrochloride", "category": "Analgesic", "unit": "MG", "strength": "50", "dosage_strength": "50mg", "route": "oral", "frequency": "PRN", "side_effects": "Nausea, dizziness, constipation"},
    {"name": "Fluoxetine", "generic_name": "Fluoxetine Hydrochloride", "category": "SSRI", "unit": "MG", "strength": "20", "dosage_strength": "20mg", "route": "oral", "frequency": "DAILY", "side_effects": "Insomnia, nausea, anxiety"},
    {"name": "Clopidogrel", "generic_name": "Clopidogrel Bisulfate", "category": "Antiplatelet", "unit": "MG", "strength": "75", "dosage_strength": "75mg", "route": "oral", "frequency": "DAILY", "side_effects": "Bleeding, bruising, rash"},
    {"name": "Pantoprazole", "generic_name": "Pantoprazole Sodium", "category": "PPI", "unit": "MG", "strength": "40", "dosage_strength": "40mg", "route": "oral", "frequency": "DAILY", "side_effects": "Headache, diarrhea, flatulence"},
    {"name": "Losartan", "generic_name": "Losartan Potassium", "category": "Antihypertensive", "unit": "MG", "strength": "50", "dosage_strength": "50mg", "route": "oral", "frequency": "DAILY", "side_effects": "Dizziness, hyperkalemia, fatigue"},
    {"name": "Diazepam", "generic_name": "Diazepam", "category": "Benzodiazepine", "unit": "MG", "strength": "5", "dosage_strength": "5mg", "route": "oral", "frequency": "PRN", "side_effects": "Drowsiness, confusion, dependence"},
    {"name": "Zolpidem", "generic_name": "Zolpidem Tartrate", "category": "Sedative", "unit": "MG", "strength": "10", "dosage_strength": "10mg", "route": "oral", "frequency": "PRN", "side_effects": "Drowsiness, dizziness, headache"},
    {"name": "Metoprolol", "generic_name": "Metoprolol Tartrate", "category": "Beta-blocker", "unit": "MG", "strength": "50", "dosage_strength": "50mg", "route": "oral", "frequency": "BID", "side_effects": "Fatigue, bradycardia, dizziness"},
]


class Command(BaseCommand):
    help = "Seed medication catalog with 20 medications related to patient medical history + 20 random medications"

    def _build_medication(self, data):
        today = timezone.now().date()
        return Medication.objects.create(
            name=data["name"],
            generic_name=data["generic_name"],
            category=data["category"],
            unit=data["unit"],
            strength=Decimal(data["strength"]),
            dosage_strength=data["dosage_strength"],
            administration_route=data["route"],
            frequency=data["frequency"],
            dosage_instructions={"frequency": data["frequency"]},
            side_effects=data["side_effects"],
            contraindications=random.choice(["", "Hypersensitivity to active substance", "Severe hepatic impairment", "Pregnancy"]),
            warnings=random.choice(["", "May cause drowsiness", "Do not exceed recommended dose", "Consult doctor before use"]),
            stock_value=random.randint(50, 500),
            min_stock_level=10,
            max_stock_level=1000,
            supplier_name=fake.company(),
            supplier_contact=fake.name(),
            supplier_email=fake.company_email(),
            supplier_phone=fake.phone_number()[:20],
            supplier_address=fake.address().replace("\n", ", "),
            unit_cost=Decimal(str(round(random.uniform(0.5, 20.0), 2))),
            expiry_date=today.replace(year=today.year + 2),
            batch_number=f"B{fake.bothify('#####')}",
            manufacturing_date=today.replace(year=today.year - 1),
            requires_refrigeration=random.choice([True, False]),
        )

    def handle(self, *args, **options):
        # Get conditions present in patients' medical history
        conditions = set(MedicalHistory.objects.values_list("condition", flat=True))
        self.stdout.write(f"Found {len(conditions)} medical history conditions: {', '.join(sorted(conditions))}")

        related_count = 0
        for condition in conditions:
            for med in CONDITION_MEDICATIONS.get(condition, []):
                self._build_medication(med)
                related_count += 1
                if related_count >= 20:
                    break
            if related_count >= 20:
                break

        # Top up to exactly 20 related medications from the condition map if fewer conditions matched
        all_related = [m for meds in CONDITION_MEDICATIONS.values() for m in meds]
        idx = 0
        while related_count < 20 and idx < len(all_related):
            med = all_related[idx]
            if not Medication.objects.filter(name=med["name"]).exists():
                self._build_medication(med)
                related_count += 1
            idx += 1

        self.stdout.write(self.style.SUCCESS(f"Created {related_count} medications related to medical history."))

        random_count = 0
        for med in RANDOM_MEDICATIONS:
            if not Medication.objects.filter(name=med["name"]).exists():
                self._build_medication(med)
                random_count += 1
                if random_count >= 20:
                    break

        self.stdout.write(self.style.SUCCESS(f"Created {random_count} random medications."))
        self.stdout.write(self.style.SUCCESS(f"Total medication catalog: {Medication.objects.count()}"))
