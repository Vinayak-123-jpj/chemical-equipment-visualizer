#!/usr/bin/env bash
set -o errexit

pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

python manage.py migrate
python manage.py collectstatic --no-input

# Create demo user
echo "from django.contrib.auth.models import User; User.objects.get_or_create(username='demo', defaults={'email': 'demo@example.com'})[0].set_password('demo123'); User.objects.filter(username='demo').first().save()" | python manage.py shell






