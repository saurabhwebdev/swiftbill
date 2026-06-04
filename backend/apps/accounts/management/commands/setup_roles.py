from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.db.models import Q


class Command(BaseCommand):
    help = 'Create default groups (Owner, Manager, Cashier) with appropriate permissions'

    def handle(self, *args, **options):
        # Create groups
        owner_group, _ = Group.objects.get_or_create(name='Owner')
        manager_group, _ = Group.objects.get_or_create(name='Manager')
        cashier_group, _ = Group.objects.get_or_create(name='Cashier')

        # Owner gets all permissions
        all_permissions = Permission.objects.all()
        owner_group.permissions.set(all_permissions)
        self.stdout.write(f'  Owner group: {all_permissions.count()} permissions')

        # Manager: view/add/change on products, sales, inventory, terminals; view users
        manager_models = ['product', 'category', 'sale', 'saleitem', 'stock', 'stockmovement',
                          'terminal']
        manager_perms = Permission.objects.filter(
            content_type__model__in=manager_models,
        ).filter(
            Q(codename__startswith='view_') |
            Q(codename__startswith='add_') |
            Q(codename__startswith='change_')
        )
        user_view_perms = Permission.objects.filter(codename='view_user')
        all_manager_perms = (manager_perms | user_view_perms).distinct()
        manager_group.permissions.set(all_manager_perms)
        self.stdout.write(f'  Manager group: {all_manager_perms.count()} permissions')

        # Cashier: view products, add sales/sale items, view own sales, view stock
        cashier_perms = Permission.objects.filter(
            Q(codename='view_product') |
            Q(codename='view_category') |
            Q(codename='add_sale') |
            Q(codename='view_sale') |
            Q(codename='add_saleitem') |
            Q(codename='view_saleitem') |
            Q(codename='view_stock') |
            Q(codename='view_stockmovement')
        ).distinct()
        cashier_group.permissions.set(cashier_perms)
        self.stdout.write(f'  Cashier group: {cashier_perms.count()} permissions')

        self.stdout.write(self.style.SUCCESS('Successfully set up roles and permissions.'))
