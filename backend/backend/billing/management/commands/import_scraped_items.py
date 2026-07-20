import json
from django.core.management.base import BaseCommand
from django.db import transaction
from billing.models import product, barcodeMapping

class Command(BaseCommand):
    help = "Imports products and barcodes from scraped_items.json using optimized bulk creation"

    def handle(self, *args, **options):
        json_path = "/Users/mac/Documents/fltr/billing/scraped_items.json"
        
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                items = json.load(f)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to load scraped_items.json: {e}"))
            return

        self.stdout.write(f"Loaded {len(items)} items from JSON.")

        # Cache existing barcodes to prevent unique constraints violations
        existing_barcodes = set(barcodeMapping.objects.values_list("barcode", flat=True))
        
        products_to_create = []
        barcodes_to_create_info = [] # Store tuple of (product_index_in_list, barcode_value)

        self.stdout.write("Preparing products data...")
        for item in items:
            name = item.get("name", "").strip()
            unit = item.get("units", "P").strip()
            
            # Parse numeric values safely
            try:
                retailprice = float(item.get("price") or 0.0)
            except ValueError:
                retailprice = 0.0
                
            try:
                wholesaleprice = float(item.get("wholesalePrice") or retailprice)
            except ValueError:
                wholesaleprice = retailprice

            barcode_val = item.get("barcode", "").strip()

            if not name:
                continue

            # Instantiate product model instance
            prod = product(
                name=name,
                retailprice=retailprice,
                wholesaleprice=wholesaleprice,
                retailpercentage=0.00,
                wholesalepercentage=0.00,
                stock=0,
                unit=unit,
                purchaseprice=0.00
            )
            
            product_list_idx = len(products_to_create)
            products_to_create.append(prod)

            if barcode_val and barcode_val not in existing_barcodes:
                barcodes_to_create_info.append((product_list_idx, barcode_val))
                existing_barcodes.add(barcode_val)

        self.stdout.write(f"Total products to insert: {len(products_to_create)}")
        self.stdout.write(f"Total barcodes to map: {len(barcodes_to_create_info)}")

        if not products_to_create:
            self.stdout.write(self.style.WARNING("No new products to import."))
            return

        self.stdout.write("Executing atomic database bulk creation...")
        with transaction.atomic():
            # 1. Bulk Create all products. PostgreSQL returns primary keys back
            created_products = product.objects.bulk_create(products_to_create)
            
            # 2. Build list of barcode mappings referencing inserted product IDs
            barcode_objects = []
            for product_idx, barcode_val in barcodes_to_create_info:
                inserted_prod = created_products[product_idx]
                barcode_objects.append(
                    barcodeMapping(
                        product_id=inserted_prod,
                        barcode=barcode_val
                    )
                )

            # 3. Bulk Create barcode mappings
            if barcode_objects:
                barcodeMapping.objects.bulk_create(barcode_objects)

        self.stdout.write(self.style.SUCCESS(
            f"Successfully imported {len(products_to_create)} products and {len(barcode_objects)} barcodes in bulk!"
        ))
