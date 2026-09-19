"""Create a combined medication-history view.

The chatbot queries medication history via the SQL tool; the three medication
tables (active / past / prescription) have different column names, so the LLM
guesses one table and returns incomplete answers. This view is the single
canonical source the bot is steered to.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_remove_gender_other"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE VIEW api_medication_history AS
            SELECT
                patient_id,
                'active' AS category,
                name AS medication_name,
                dosage AS dosage,
                route,
                frequency,
                days_supply,
                start_date,
                diagnostic_result
            FROM api_activemedication
            UNION ALL
            SELECT
                patient_id,
                'past' AS category,
                name AS medication_name,
                dosage AS dosage,
                route,
                frequency,
                days_supply,
                start_date,
                diagnostic_result
            FROM api_pastmedication
            UNION ALL
            SELECT
                patient_id,
                'prescription' AS category,
                medication_name,
                CAST(dosage_amount AS TEXT) || ' ' || dosage_unit AS dosage,
                route,
                frequency,
                days_supply,
                start_date,
                diagnostic_result
            FROM api_prescriptionmedication
            """,
            reverse_sql="DROP VIEW IF EXISTS api_medication_history",
        ),
    ]