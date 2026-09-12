from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    ROLE_CHOICES = [
        ('doctor', 'Doctor'),
        ('nurse', 'Nurse'),
        ('admin', 'Admin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='nurse')
    clinic_name = models.CharField(max_length=255, blank=True, default='')
    clinic_address = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    display_name = models.CharField(max_length=255, blank=True, default='')

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.update_or_create(user=instance, defaults={'role': 'nurse'})
    else:
        instance.profile.save()