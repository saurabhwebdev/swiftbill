from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.products.models import Product, Category
from apps.accounts.models import Store


PRODUCTS = [
    # Beverages
    {'sku': 'BEV001', 'name': 'Espresso', 'price': '150.00', 'cost_price': '45.00', 'category': 'Beverages', 'hsn_code': '0901', 'gst_rate': '5.00'},
    {'sku': 'BEV002', 'name': 'Cappuccino', 'price': '200.00', 'cost_price': '60.00', 'category': 'Beverages', 'hsn_code': '0901', 'gst_rate': '5.00'},
    {'sku': 'BEV003', 'name': 'Latte', 'price': '220.00', 'cost_price': '70.00', 'category': 'Beverages', 'hsn_code': '0901', 'gst_rate': '5.00'},
    {'sku': 'BEV004', 'name': 'Americano', 'price': '180.00', 'cost_price': '50.00', 'category': 'Beverages', 'hsn_code': '0901', 'gst_rate': '5.00'},
    {'sku': 'BEV005', 'name': 'Green Tea', 'price': '120.00', 'cost_price': '30.00', 'category': 'Beverages', 'hsn_code': '0902', 'gst_rate': '5.00'},
    {'sku': 'BEV006', 'name': 'Cold Brew', 'price': '250.00', 'cost_price': '75.00', 'category': 'Beverages', 'hsn_code': '0901', 'gst_rate': '5.00'},
    {'sku': 'BEV007', 'name': 'Masala Chai', 'price': '100.00', 'cost_price': '25.00', 'category': 'Beverages', 'hsn_code': '0902', 'gst_rate': '5.00'},
    {'sku': 'BEV008', 'name': 'Hot Chocolate', 'price': '230.00', 'cost_price': '70.00', 'category': 'Beverages', 'hsn_code': '1806', 'gst_rate': '18.00'},
    # Food
    {'sku': 'FOOD001', 'name': 'Croissant', 'price': '130.00', 'cost_price': '45.00', 'category': 'Food', 'hsn_code': '1905', 'gst_rate': '12.00'},
    {'sku': 'FOOD002', 'name': 'Sandwich', 'price': '250.00', 'cost_price': '100.00', 'category': 'Food', 'hsn_code': '1905', 'gst_rate': '5.00'},
    {'sku': 'FOOD003', 'name': 'Muffin', 'price': '110.00', 'cost_price': '35.00', 'category': 'Food', 'hsn_code': '1905', 'gst_rate': '12.00'},
    {'sku': 'FOOD004', 'name': 'Cookie', 'price': '80.00', 'cost_price': '25.00', 'category': 'Food', 'hsn_code': '1905', 'gst_rate': '12.00'},
    {'sku': 'FOOD005', 'name': 'Brownie', 'price': '160.00', 'cost_price': '55.00', 'category': 'Food', 'hsn_code': '1905', 'gst_rate': '12.00'},
    {'sku': 'FOOD006', 'name': 'Samosa', 'price': '40.00', 'cost_price': '12.00', 'category': 'Food', 'hsn_code': '1905', 'gst_rate': '5.00'},
    {'sku': 'FOOD007', 'name': 'Paneer Wrap', 'price': '280.00', 'cost_price': '110.00', 'category': 'Food', 'hsn_code': '1905', 'gst_rate': '5.00'},
    {'sku': 'FOOD008', 'name': 'Veg Puff', 'price': '60.00', 'cost_price': '18.00', 'category': 'Food', 'hsn_code': '1905', 'gst_rate': '12.00'},
    # Merchandise
    {'sku': 'MERCH001', 'name': 'Branded Mug', 'price': '350.00', 'cost_price': '120.00', 'category': 'Merchandise', 'hsn_code': '6912', 'gst_rate': '12.00'},
    {'sku': 'MERCH002', 'name': 'Tote Bag', 'price': '450.00', 'cost_price': '150.00', 'category': 'Merchandise', 'hsn_code': '4202', 'gst_rate': '18.00'},
    {'sku': 'MERCH003', 'name': 'T-Shirt', 'price': '599.00', 'cost_price': '200.00', 'category': 'Merchandise', 'hsn_code': '6109', 'gst_rate': '5.00'},
    {'sku': 'MERCH004', 'name': 'Coffee Beans (250g)', 'price': '499.00', 'cost_price': '180.00', 'category': 'Merchandise', 'hsn_code': '0901', 'gst_rate': '5.00'},
    {'sku': 'MERCH005', 'name': 'Tumbler', 'price': '650.00', 'cost_price': '220.00', 'category': 'Merchandise', 'hsn_code': '7323', 'gst_rate': '18.00'},
]


class Command(BaseCommand):
    help = 'Seed products with INR prices. Skips products that already exist (preserves images).'

    def handle(self, *args, **options):
        store = Store.objects.first()
        if not store:
            self.stderr.write('No store found. Create a store first.')
            return

        categories = {}
        for cat_name in ['Beverages', 'Food', 'Merchandise']:
            cat, _ = Category.objects.get_or_create(
                store=store, name=cat_name,
                defaults={'is_active': True}
            )
            categories[cat_name] = cat

        created = 0
        updated = 0
        skipped = 0

        for p in PRODUCTS:
            existing = Product.objects.filter(store=store, sku=p['sku']).first()
            if existing:
                if existing.image:
                    skipped += 1
                    continue
                existing.name = p['name']
                existing.price = Decimal(p['price'])
                existing.cost_price = Decimal(p['cost_price'])
                existing.category = categories[p['category']]
                existing.hsn_code = p['hsn_code']
                existing.gst_rate = Decimal(p['gst_rate'])
                existing.save()
                updated += 1
            else:
                Product.objects.create(
                    store=store,
                    sku=p['sku'],
                    name=p['name'],
                    price=Decimal(p['price']),
                    cost_price=Decimal(p['cost_price']),
                    category=categories[p['category']],
                    hsn_code=p['hsn_code'],
                    gst_rate=Decimal(p['gst_rate']),
                    is_active=True,
                )
                created += 1

        self.stdout.write(f'Done: {created} created, {updated} updated, {skipped} skipped (have images)')
