#!/usr/bin/env bash
set -o errexit

pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

python manage.py migrate
python manage.py collectstatic --no-input

# Create superuser from environment variables if CREATE_SUPERUSER is set
if [ "$CREATE_SUPERUSER" = "1" ]; then
    python manage.py createsuperuser --noinput --username "$DJANGO_SUPERUSER_USERNAME" --email "$DJANGO_SUPERUSER_EMAIL" || echo "Superuser already exists"
fi