from django.core.management.base import BaseCommand
from faker import Faker
from api.models import Patient, MedicalHistory, EmergencyContact
import random

fake = Faker()


class Command(BaseCommand):
    help = "Seed the database with 30 realistic patients and related data"

    def _generate_hkid(self):
        prefix = random.choice('ABCD')
        digits = f"{random.randint(0, 999999):06d}"
        check_digit = random.randint(0, 9)
        return f"{prefix}{digits}({check_digit})"

    def handle(self, *args, **options):
        self.stdout.write("Seeding patients...")

        Patient.objects.all().delete()

        blood_types = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
        genders = ["M", "F"]
        conditions = [
            "Hypertension",
            "Diabetes Type 2",
            "Asthma",
            "Migraine",
            "Seasonal Allergies",
            "Cholesterol",
            "Hypothyroidism",
            "Anxiety Disorder",
        ]
        relationships = ["Spouse", "Parent", "Sibling", "Friend", "Partner", "Child"]

        patients_created = 0

        for _ in range(30):
            first_name = fake.first_name()
            last_name = fake.last_name()
            patient = Patient.objects.create(
                first_name=first_name,
                last_name=last_name,
                date_of_birth=fake.date_of_birth(minimum_age=18, maximum_age=90),
                gender=random.choice(genders),
                address=fake.address().replace("\n", ", "),
                phone=fake.phone_number()[:20],
                email=fake.unique.email(),
                blood_type=random.choice(blood_types),
                allergies=random.choice(["Penicillin", "None", "Latex", "Sulfa drugs", ""]),
                hkid=self._generate_hkid(),
            )
            patients_created += 1

            num_history = random.randint(1, 3)
            for _ in range(num_history):
                MedicalHistory.objects.create(
                    patient=patient,
                    condition=random.choice(conditions),
                    diagnosis_date=fake.date_between(start_date="-10y", end_date="today"),
                    notes=fake.sentence(nb_words=10) if random.random() > 0.3 else "",
                )

            EmergencyContact.objects.create(
                patient=patient,
                name=fake.name(),
                relationship=random.choice(relationships),
                phone=fake.phone_number()[:20],
            )

        self.stdout.write(
            self.style.SUCCESS(f"Created {patients_created} patients with related data.")
        )
