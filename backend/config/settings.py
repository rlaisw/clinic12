import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-key-change-in-production')

DEBUG = True

# Default apps
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_extensions',
    
    # Local apps
    'medication',
    'api',
    'accounts',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']

PUBLIC_VERIFY_BASE_URL = os.environ.get('PUBLIC_VERIFY_BASE_URL', 'http://localhost:8000')
FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL', 'http://localhost:3001')
DIFY_BASE_URL = os.environ.get('DIFY_BASE_URL', 'https://vps.tailb5775.ts.net')
DIFY_API_KEY = os.environ.get('DIFY_API_KEY', 'app-Iw2t4FSLM8xCc3y2vbcEWXKa')
LANCEDB_URI = os.environ.get('LANCEDB_URI', 'lancedb')
HF_TOKEN = os.environ.get('HF_TOKEN', '')
SICK_LEAVE_CERTIFICATE_TEMPLATE_PATH = os.path.join(BASE_DIR.parent, 'template', 'slcv1.pdf')

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/min',
        'user': '1000/min',
        'verify': '100/min',
    }
}

CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3001',
    'http://10.161.92.117:3001',
    'http://10.161.92.149:3001',
    'http://172.18.206.86:3001',
    'http://172.18.206.86:8000',
    'https://vps.tailb5775.ts.net:3001',
    'https://vps.tailb5775.ts.net:8000',
]

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3001',
    'http://10.161.92.117:3001',
    'http://10.161.92.149:3001',
    'http://172.18.206.86:3001',
    'http://172.18.206.86:8000',
    'https://vps.tailb5775.ts.net:3001',
    'https://vps.tailb5775.ts.net:8000',
]

CORS_ALLOW_CREDENTIALS = True
