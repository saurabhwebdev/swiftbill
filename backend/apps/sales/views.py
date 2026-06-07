import os
from decimal import Decimal
from django.db import transaction
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Sale, SaleItem, Refund, RefundItem, UpiPayment
from .serializers import SaleSerializer, SaleItemSerializer, CheckoutSerializer
from apps.accounts.models import Store, Terminal
from apps.products.models import Product
from apps.inventory.models import Stock, StockMovement


class SaleViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['receipt_number']
    ordering_fields = ['created_at', 'total_amount']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Sale.objects.select_related('store', 'cashier', 'terminal').prefetch_related('items__product', 'refunds__items__product').filter(
            store__owner=self.request.user
        )
        # Filter by status
        sale_status = self.request.query_params.get('status')
        if sale_status:
            qs = qs.filter(status=sale_status)
        # Filter by payment method
        payment = self.request.query_params.get('payment_method')
        if payment:
            qs = qs.filter(payment_method=payment)
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        # Filter by terminal
        terminal_id = self.request.query_params.get('terminal')
        if terminal_id:
            qs = qs.filter(terminal_id=terminal_id)
        return qs

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        """Process a complete sale transaction."""
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        store = Store.objects.filter(owner=request.user).first()
        if not store:
            return Response({'error': 'No store found.'}, status=status.HTTP_400_BAD_REQUEST)

        # Terminal validation
        terminal_id = data.get('terminal')
        terminal_obj = None
        if terminal_id:
            try:
                terminal_obj = Terminal.objects.get(id=terminal_id, store=store)
            except Terminal.DoesNotExist:
                return Response({'error': 'Terminal not found or does not belong to this store.'}, status=status.HTTP_400_BAD_REQUEST)
            if terminal_obj.current_cashier is None:
                return Response({'error': 'Terminal does not have an active session.'}, status=status.HTTP_400_BAD_REQUEST)
            if terminal_obj.current_cashier != request.user and request.user.role not in ('owner', 'admin'):
                return Response({'error': 'You are not the assigned cashier for this terminal.'}, status=status.HTTP_403_FORBIDDEN)

        items_data = data['items']
        if not items_data:
            return Response({'error': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Discount validation
        discount_amount = Decimal(str(data.get('discount_amount', 0)))
        discount_type = data.get('discount_type', 'flat')
        discount_reason = data.get('discount_reason', '')

        if discount_amount > 0 and not store.discount_enabled:
            return Response({'error': 'Discounts are not enabled for this store.'}, status=status.HTTP_400_BAD_REQUEST)

        if discount_amount > 0 and store.discount_require_reason and not discount_reason.strip():
            return Response({'error': 'A reason is required for discounts.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            subtotal = Decimal('0')
            tax_total = Decimal('0')
            sale_items = []

            for item_data in items_data:
                product_id = item_data.get('product_id')
                quantity = int(item_data.get('quantity', 1))
                discount = Decimal(str(item_data.get('discount', 0)))
                gst_rate = Decimal(str(item_data.get('gst_rate', 0)))

                try:
                    product = Product.objects.get(id=product_id, store=store)
                except Product.DoesNotExist:
                    return Response({'error': f'Product {product_id} not found.'}, status=status.HTTP_400_BAD_REQUEST)

                unit_price = product.price
                item_subtotal = (unit_price * quantity) - discount
                item_tax = item_subtotal * gst_rate / Decimal('100')

                subtotal += item_subtotal
                tax_total += item_tax

                sale_items.append({
                    'product': product,
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'discount': discount,
                    'tax_amount': item_tax,
                    'gst_rate': gst_rate,
                    'subtotal': item_subtotal,
                })

                # Deduct stock
                stock, _ = Stock.objects.get_or_create(product=product)
                stock.quantity = max(0, stock.quantity - quantity)
                stock.save()

                StockMovement.objects.create(
                    product=product,
                    quantity_change=-quantity,
                    movement_type='out',
                    notes=f'Sale checkout',
                    created_by=request.user,
                )

            # Calculate actual discount amount
            if discount_type == 'percent' and discount_amount > 0:
                actual_discount = (subtotal + tax_total) * discount_amount / Decimal('100')
            else:
                actual_discount = discount_amount

            # Role-based discount limit validation
            if actual_discount > 0 and store.discount_enabled:
                discount_pct = (actual_discount / (subtotal + tax_total) * Decimal('100')) if (subtotal + tax_total) > 0 else Decimal('0')
                user_role = request.user.role
                if user_role == 'cashier' and discount_pct > store.discount_max_percent_cashier:
                    return Response({'error': f'Discount exceeds your limit of {store.discount_max_percent_cashier}%.'}, status=status.HTTP_400_BAD_REQUEST)
                if user_role == 'manager' and discount_pct > store.discount_max_percent_manager:
                    return Response({'error': f'Discount exceeds your limit of {store.discount_max_percent_manager}%.'}, status=status.HTTP_400_BAD_REQUEST)

            total = subtotal + tax_total - actual_discount

            sale = Sale.objects.create(
                store=store,
                cashier=request.user,
                terminal_id=data.get('terminal'),
                total_amount=total,
                discount_amount=actual_discount,
                discount_type=discount_type,
                discount_reason=discount_reason,
                tax_amount=tax_total,
                payment_method=data['payment_method'],
                status='completed',
                notes=data.get('notes', ''),
            )

            for si in sale_items:
                SaleItem.objects.create(sale=sale, **si)

            # Update terminal cash balance for cash payments
            if terminal_obj and data['payment_method'] == 'cash':
                terminal_obj.cash_balance += total
                terminal_obj.save(update_fields=['cash_balance'])

        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def today_summary(self, request):
        """Get today's sales summary."""
        from django.utils import timezone
        from django.db.models import Sum, Count
        today = timezone.now().date()
        qs = self.get_queryset().filter(created_at__date=today, status='completed')
        terminal_id = request.query_params.get('terminal')
        if terminal_id:
            qs = qs.filter(terminal_id=terminal_id)

        summary = qs.aggregate(
            total_sales=Sum('total_amount'),
            total_tax=Sum('tax_amount'),
            total_discount=Sum('discount_amount'),
            transaction_count=Count('id'),
        )

        # Add refund data
        refund_qs = Refund.objects.filter(store__owner=request.user, created_at__date=today)
        refund_total = sum(float(r.refund_amount) for r in refund_qs)
        refund_count = refund_qs.count()

        return Response({
            'total_sales': float(summary['total_sales'] or 0),
            'total_tax': float(summary['total_tax'] or 0),
            'total_discount': float(summary['total_discount'] or 0),
            'transaction_count': summary['transaction_count'],
            'date': str(today),
            'refund_total': refund_total,
            'refund_count': refund_count,
            'net_sales': float(summary['total_sales'] or 0) - refund_total,
        })

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """Process a partial or full refund."""
        sale = self.get_object()

        if sale.status != 'completed':
            return Response({'error': 'Only completed sales can be refunded.'}, status=status.HTTP_400_BAD_REQUEST)

        store = sale.store

        # Check refund policy
        if not store.refund_enabled:
            return Response({'error': 'Refunds are not enabled for this store.'}, status=status.HTTP_400_BAD_REQUEST)

        if store.refund_time_limit_days > 0:
            from django.utils import timezone
            days_since = (timezone.now() - sale.created_at).days
            if days_since > store.refund_time_limit_days:
                return Response({'error': f'Refund window of {store.refund_time_limit_days} days has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '')
        if store.refund_require_reason and not reason.strip():
            return Response({'error': 'A reason is required for refunds.'}, status=status.HTTP_400_BAD_REQUEST)

        refund_items_data = request.data.get('items', [])
        if not refund_items_data:
            return Response({'error': 'No items specified for refund.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            refund_total = Decimal('0')
            refund_tax_total = Decimal('0')
            refund_item_objs = []

            for ri in refund_items_data:
                product_id = ri.get('product_id')
                refund_qty = int(ri.get('quantity', 0))

                if refund_qty <= 0:
                    continue

                # Find the original sale item
                sale_item = sale.items.filter(product_id=product_id).first()
                if not sale_item:
                    return Response({'error': f'Product {product_id} not found in this sale.'}, status=status.HTTP_400_BAD_REQUEST)

                # Check already refunded quantity for this product in this sale
                already_refunded = sum(
                    rfi.quantity for r in sale.refunds.all() for rfi in r.items.filter(product_id=product_id)
                )
                max_refundable = sale_item.quantity - already_refunded

                if refund_qty > max_refundable:
                    return Response({'error': f'Cannot refund {refund_qty} of {sale_item.product.name}. Max refundable: {max_refundable}.'}, status=status.HTTP_400_BAD_REQUEST)

                item_subtotal = sale_item.unit_price * refund_qty
                item_tax = (item_subtotal * sale_item.gst_rate / Decimal('100')) if sale_item.gst_rate else Decimal('0')

                refund_total += item_subtotal
                refund_tax_total += item_tax

                refund_item_objs.append({
                    'product': sale_item.product,
                    'quantity': refund_qty,
                    'unit_price': sale_item.unit_price,
                    'tax_amount': item_tax,
                    'gst_rate': sale_item.gst_rate,
                    'subtotal': item_subtotal,
                })

                # Restore stock
                stock, _ = Stock.objects.get_or_create(product=sale_item.product)
                stock.quantity += refund_qty
                stock.save()

                StockMovement.objects.create(
                    product=sale_item.product,
                    quantity_change=refund_qty,
                    movement_type='in',
                    notes=f'Refund from sale #{sale.receipt_number}',
                    created_by=request.user,
                )

            if not refund_item_objs:
                return Response({'error': 'No valid items to refund.'}, status=status.HTTP_400_BAD_REQUEST)

            refund_obj = Refund.objects.create(
                sale=sale,
                store=store,
                refund_amount=refund_total + refund_tax_total,
                refund_tax=refund_tax_total,
                reason=reason,
                processed_by=request.user,
            )

            for ri in refund_item_objs:
                RefundItem.objects.create(refund=refund_obj, **ri)

            # Deduct from terminal cash balance if cash sale on a terminal
            if sale.terminal and sale.payment_method == 'cash':
                sale.terminal.cash_balance -= refund_obj.refund_amount
                sale.terminal.save(update_fields=['cash_balance'])

            # Check if fully refunded
            total_refunded = sum(
                float(r.refund_amount) for r in sale.refunds.all()
            )
            if total_refunded >= float(sale.total_amount):
                sale.status = 'refunded'
                sale.save()

        sale.refresh_from_db()
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        """Void a sale and restore stock."""
        sale = self.get_object()
        if sale.status != 'completed':
            return Response({'error': 'Only completed sales can be voided.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            sale.status = 'voided'
            sale.save()

            for item in sale.items.all():
                stock, _ = Stock.objects.get_or_create(product=item.product)
                stock.quantity += item.quantity
                stock.save()

                StockMovement.objects.create(
                    product=item.product,
                    quantity_change=item.quantity,
                    movement_type='in',
                    notes=f'Voided sale #{sale.receipt_number}',
                    created_by=request.user,
                )

        return Response(SaleSerializer(sale).data)

    @action(detail=False, methods=['get'])
    def weekly_sales(self, request):
        """Sales data for the last 7 days — for line/bar chart."""
        from django.utils import timezone
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncDate

        end_date = timezone.now().date()
        start_date = end_date - timezone.timedelta(days=6)

        qs = self.get_queryset().filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            status='completed'
        ).annotate(date=TruncDate('created_at')).values('date').annotate(
            total=Sum('total_amount'),
            count=Count('id'),
            tax=Sum('tax_amount'),
            discount=Sum('discount_amount'),
        ).order_by('date')

        # Fill in missing days with zeros
        data = {str(r['date']): r for r in qs}
        result = []
        for i in range(7):
            d = str(start_date + timezone.timedelta(days=i))
            if d in data:
                result.append({
                    'date': d,
                    'day': (start_date + timezone.timedelta(days=i)).strftime('%a'),
                    'total': float(data[d]['total']),
                    'count': data[d]['count'],
                    'tax': float(data[d]['tax']),
                    'discount': float(data[d]['discount']),
                })
            else:
                result.append({
                    'date': d,
                    'day': (start_date + timezone.timedelta(days=i)).strftime('%a'),
                    'total': 0, 'count': 0, 'tax': 0, 'discount': 0,
                })

        return Response(result)

    @action(detail=False, methods=['get'])
    def payment_breakdown(self, request):
        """Payment method breakdown — for donut/pie chart."""
        from django.db.models import Sum, Count

        qs = self.get_queryset().filter(status='completed')
        breakdown = qs.values('payment_method').annotate(
            total=Sum('total_amount'),
            count=Count('id'),
        ).order_by('-total')

        return Response([{
            'method': r['payment_method'],
            'total': float(r['total']),
            'count': r['count'],
        } for r in breakdown])

    @action(detail=False, methods=['get'])
    def category_sales(self, request):
        """Sales by product category — for bar/pie chart."""
        from django.db.models import Sum

        items = SaleItem.objects.filter(
            sale__store__owner=request.user,
            sale__status='completed',
        ).values('product__category__name').annotate(
            total=Sum('subtotal'),
        ).order_by('-total')

        return Response([{
            'category': r['product__category__name'] or 'Uncategorized',
            'total': float(r['total']),
        } for r in items])

    @action(detail=False, methods=['get'])
    def hourly_sales(self, request):
        """Sales by hour of day (today) — for area chart."""
        from django.utils import timezone
        from django.db.models import Sum, Count
        from django.db.models.functions import ExtractHour

        today = timezone.now().date()
        qs = self.get_queryset().filter(
            created_at__date=today,
            status='completed'
        ).annotate(hour=ExtractHour('created_at')).values('hour').annotate(
            total=Sum('total_amount'),
            count=Count('id'),
        ).order_by('hour')

        data = {r['hour']: r for r in qs}
        result = []
        for h in range(24):
            label = f"{h:02d}:00"
            if h in data:
                result.append({'hour': label, 'total': float(data[h]['total']), 'count': data[h]['count']})
            else:
                result.append({'hour': label, 'total': 0, 'count': 0})

        return Response(result)

    @action(detail=False, methods=['get'])
    def top_products(self, request):
        """Top selling products — for horizontal bar chart."""
        from django.db.models import Sum

        items = SaleItem.objects.filter(
            sale__store__owner=request.user,
            sale__status='completed',
        ).values('product__name').annotate(
            total=Sum('subtotal'),
            qty=Sum('quantity'),
        ).order_by('-total')[:10]

        return Response([{
            'name': r['product__name'],
            'total': float(r['total']),
            'quantity': r['qty'],
        } for r in items])


    @action(detail=True, methods=['get'])
    def print_receipt(self, request, pk=None):
        """Generate receipt text and optionally send to printer."""
        sale = self.get_object()
        store = sale.store
        width = store.printer_paper_width or 48

        from .receipt import generate_receipt_text
        receipt_text = generate_receipt_text(sale, store, width)

        # Save receipt file
        receipts_dir = os.path.join('media', 'receipts')
        os.makedirs(receipts_dir, exist_ok=True)
        filepath = os.path.join(receipts_dir, f"{sale.receipt_number}.txt")
        with open(filepath, 'w') as f:
            f.write(receipt_text)

        # Try to print if printer is configured
        printed = False
        printer_error = None

        if store.printer_type == 'test':
            printed = True  # Dummy mode - just return the text
        elif store.printer_type == 'network' and store.printer_address:
            try:
                from escpos.printer import Network
                parts = store.printer_address.split(':')
                host = parts[0]
                port = int(parts[1]) if len(parts) > 1 else 9100
                p = Network(host, port)
                p.text(receipt_text)
                p.cut()
                p.close()
                printed = True
            except Exception as e:
                printer_error = str(e)
        elif store.printer_type == 'usb' and store.printer_address:
            try:
                from escpos.printer import Usb
                parts = store.printer_address.split(':')
                vendor = int(parts[0], 16)
                product = int(parts[1], 16) if len(parts) > 1 else 0
                p = Usb(vendor, product)
                p.text(receipt_text)
                p.cut()
                p.close()
                printed = True
            except Exception as e:
                printer_error = str(e)
        elif store.printer_type == 'serial' and store.printer_address:
            try:
                from escpos.printer import Serial
                p = Serial(store.printer_address)
                p.text(receipt_text)
                p.cut()
                p.close()
                printed = True
            except Exception as e:
                printer_error = str(e)

        return Response({
            'receipt_text': receipt_text,
            'printed': printed,
            'printer_type': store.printer_type,
            'printer_error': printer_error,
            'file_path': f"/media/receipts/{sale.receipt_number}.txt",
        })

    @action(detail=False, methods=['get'])
    def test_print(self, request):
        """Send a test receipt to the configured printer."""
        store = Store.objects.filter(owner=request.user).first()
        if not store:
            return Response({'error': 'No store found.'}, status=status.HTTP_400_BAD_REQUEST)

        width = store.printer_paper_width or 48

        def center(text):
            return text.center(width)
        def line():
            return '-' * width
        def left_right(left, right):
            space = width - len(left) - len(right)
            return left + ' ' * max(1, space) + right

        from django.utils import timezone as tz
        test_text = '\n'.join([
            center("*** TEST PRINT ***"),
            center(store.name.upper()),
            center("Printer is working!"),
            line(),
            left_right("Date:", tz.now().strftime('%d/%m/%Y %H:%M')),
            left_right("Printer:", store.printer_type),
            line(),
            left_right("Sample Item x2", "₹400.00"),
            left_right("Another Item x1", "₹150.00"),
            line(),
            left_right("TOTAL", "₹550.00"),
            '=' * width,
            '',
            center("If you see this, printing works!"),
            center("Powered by SwiftBill"),
            '',
        ])

        printed = False
        printer_error = None

        if store.printer_type == 'test':
            printed = True
        elif store.printer_type == 'network' and store.printer_address:
            try:
                from escpos.printer import Network
                parts = store.printer_address.split(':')
                host = parts[0]
                port = int(parts[1]) if len(parts) > 1 else 9100
                p = Network(host, port)
                p.text(test_text)
                p.cut()
                p.close()
                printed = True
            except Exception as e:
                printer_error = str(e)

        return Response({
            'receipt_text': test_text,
            'printed': printed,
            'printer_type': store.printer_type,
            'printer_error': printer_error,
        })

    @action(detail=True, methods=['get'], url_path='print_refund/(?P<refund_id>[0-9]+)')
    def print_refund(self, request, pk=None, refund_id=None):
        """Generate and print a refund receipt."""
        sale = self.get_object()
        refund = Refund.objects.filter(id=refund_id, sale=sale).first()
        if not refund:
            return Response({'error': 'Refund not found.'}, status=status.HTTP_404_NOT_FOUND)

        store = sale.store
        width = store.printer_paper_width or 48

        from .receipt import generate_refund_receipt_text
        receipt_text = generate_refund_receipt_text(refund, store, width)

        return Response({
            'receipt_text': receipt_text,
            'printed': store.printer_type == 'test',
            'printer_type': store.printer_type,
        })


    @action(detail=False, methods=['post'])
    def generate_upi_qr(self, request):
        """Generate a UPI payment QR code string."""
        import uuid
        from django.utils import timezone
        from urllib.parse import quote

        amount = request.data.get('amount')
        receipt_number = request.data.get('receipt_number', '')
        sale_id = request.data.get('sale_id')

        if not amount:
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        store = Store.objects.filter(owner=request.user).first()
        if not store or not store.upi_id:
            return Response({'error': 'UPI ID not configured. Go to Settings > Payments.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate transaction reference
        txn_ref = f"SB{uuid.uuid4().hex[:10].upper()}"

        # Build UPI deep link
        payee_name = quote(store.upi_payee_name or store.name)
        note = quote(receipt_number or txn_ref)
        upi_link = f"upi://pay?pa={store.upi_id}&pn={payee_name}&am={amount}&tn={note}&tr={txn_ref}&cu=INR"

        # Create UPI payment record
        expires_at = timezone.now() + timezone.timedelta(minutes=5)
        upi_payment = UpiPayment.objects.create(
            sale_id=sale_id,
            store=store,
            amount=Decimal(str(amount)),
            upi_id=store.upi_id,
            transaction_ref=txn_ref,
            upi_link=upi_link,
            verification_mode=store.upi_verification_mode,
            expires_at=expires_at,
        )

        return Response({
            'upi_link': upi_link,
            'transaction_ref': txn_ref,
            'upi_payment_id': upi_payment.id,
            'amount': str(amount),
            'upi_id': store.upi_id,
            'payee_name': store.upi_payee_name or store.name,
            'verification_mode': store.upi_verification_mode,
            'expires_at': expires_at.isoformat(),
        })

    @action(detail=False, methods=['post'])
    def confirm_upi(self, request):
        """Manually confirm a UPI payment (manual mode)."""
        from django.utils import timezone

        txn_ref = request.data.get('transaction_ref')
        if not txn_ref:
            return Response({'error': 'Transaction reference required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            upi_payment = UpiPayment.objects.get(transaction_ref=txn_ref)
        except UpiPayment.DoesNotExist:
            return Response({'error': 'UPI payment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if upi_payment.status == 'confirmed':
            return Response({'error': 'Payment already confirmed.'}, status=status.HTTP_400_BAD_REQUEST)

        upi_payment.status = 'confirmed'
        upi_payment.confirmed_at = timezone.now()
        upi_payment.save()

        return Response({
            'status': 'confirmed',
            'transaction_ref': txn_ref,
            'amount': str(upi_payment.amount),
            'confirmed_at': upi_payment.confirmed_at.isoformat(),
        })

    @action(detail=False, methods=['get'])
    def check_upi_status(self, request):
        """Check UPI payment status (for polling)."""
        from django.utils import timezone

        txn_ref = request.query_params.get('transaction_ref')
        if not txn_ref:
            return Response({'error': 'Transaction reference required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            upi_payment = UpiPayment.objects.get(transaction_ref=txn_ref)
        except UpiPayment.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check if expired
        if upi_payment.status == 'pending' and upi_payment.expires_at and timezone.now() > upi_payment.expires_at:
            upi_payment.status = 'expired'
            upi_payment.save()

        return Response({
            'status': upi_payment.status,
            'transaction_ref': txn_ref,
            'amount': str(upi_payment.amount),
            'confirmed_at': upi_payment.confirmed_at.isoformat() if upi_payment.confirmed_at else None,
        })


class SaleItemViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SaleItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SaleItem.objects.select_related('product', 'sale').filter(
            sale__store__owner=self.request.user
        )


from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.permissions import AllowAny
import hmac
import hashlib


@api_view(['POST'])
@perm_classes([AllowAny])
def oneupi_webhook(request):
    """Receive payment confirmation from OneUPI."""
    from django.utils import timezone

    # Verify signature
    signature = request.headers.get('X-OneUPI-Signature', '')
    timestamp = request.headers.get('X-OneUPI-Timestamp', '')

    data = request.data
    txn_ref = data.get('transaction_ref') or data.get('tr') or data.get('reference')
    status_val = data.get('status', '')

    if not txn_ref:
        return Response({'error': 'Missing transaction reference.'}, status=400)

    try:
        upi_payment = UpiPayment.objects.get(transaction_ref=txn_ref)
    except UpiPayment.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    # Verify HMAC signature if secret is configured
    store = upi_payment.store
    if store.oneupi_api_secret:
        payload = f"{timestamp}.{txn_ref}"
        expected_sig = hmac.new(
            store.oneupi_api_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return Response({'error': 'Invalid signature.'}, status=403)

    if status_val.lower() in ('success', 'completed', 'confirmed', 'paid'):
        upi_payment.status = 'confirmed'
        upi_payment.confirmed_at = timezone.now()
        upi_payment.save()
        return Response({'status': 'confirmed'})
    elif status_val.lower() in ('failed', 'declined', 'error'):
        upi_payment.status = 'failed'
        upi_payment.save()
        return Response({'status': 'failed'})

    return Response({'status': 'received'})
