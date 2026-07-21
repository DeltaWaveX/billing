import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from billing.models import unit

default_units = [
    {"print_label": "B", "name": "BAGS"},
    {"print_label": "T", "name": "TIN"},
    {"print_label": "C", "name": "COT"},
    {"print_label": "P", "name": "PIECES"},
    {"print_label": "L", "name": "LITERS"},
    {"print_label": "K", "name": "KGS"},
]

for u in default_units:
    unit.objects.get_or_create(name=u['name'], defaults={'print_label': u['print_label']})

print("Default units populated.")
