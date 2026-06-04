from decimal import Decimal
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User, Store, Terminal, TaxSlab
from .serializers import UserSerializer, UserCreateSerializer, StoreSerializer, TerminalSerializer, TaxSlabSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'owner' or user.role == 'admin':
            return User.objects.all()
        elif user.role == 'manager':
            return User.objects.all()
        else:
            # Cashiers can only see themselves
            return User.objects.filter(pk=user.pk)

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def invite(self, request):
        """Create a new user (invite). Only owners/managers can invite."""
        if request.user.role not in ('owner', 'manager', 'admin'):
            return Response(
                {'error': 'Only owners and managers can invite users.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def update_role(self, request, pk=None):
        """Change a user's role. Only owners can change roles."""
        if request.user.role not in ('owner', 'admin'):
            return Response(
                {'error': 'Only owners can change user roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        user = self.get_object()
        new_role = request.data.get('role')
        if new_role not in dict(User.ROLE_CHOICES):
            return Response(
                {'error': f'Invalid role. Choose from: {", ".join(dict(User.ROLE_CHOICES).keys())}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.role = new_role
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a user. Only owners can deactivate."""
        if request.user.role not in ('owner', 'admin'):
            return Response(
                {'error': 'Only owners can deactivate users.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change the current user's password."""
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not request.user.check_password(old_password):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password or '') < 8:
            return Response({'error': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password changed successfully.'})

    @action(detail=False, methods=['post'])
    def update_pin(self, request):
        """Set or update the current user's PIN."""
        pin = request.data.get('pin', '')
        if pin and (not pin.isdigit() or len(pin) < 4 or len(pin) > 6):
            return Response({'error': 'PIN must be 4-6 digits.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.pin = pin or None
        request.user.save()
        return Response({'message': 'PIN updated successfully.'})

    @action(detail=False, methods=['get'])
    def active_sessions(self, request):
        """Return basic session info for the current user."""
        return Response({
            'sessions': [{
                'current': True,
                'device': request.META.get('HTTP_USER_AGENT', 'Unknown')[:100],
                'ip': request.META.get('REMOTE_ADDR', 'Unknown'),
                'last_active': request.user.last_login.isoformat() if request.user.last_login else None,
            }]
        })


class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        if self.request.user.role not in ('owner', 'admin'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only owners and admins can update the store.')
        serializer.save()

    @action(detail=False, methods=['get'])
    def my_store(self, request):
        """Return the store owned by the current user, or the first store."""
        store = Store.objects.filter(owner=request.user).first()
        if store is None:
            store = Store.objects.first()
        if store is None:
            return Response(
                {'error': 'No store found. Please create a store first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(StoreSerializer(store).data)


class TaxSlabViewSet(viewsets.ModelViewSet):
    serializer_class = TaxSlabSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        stores = Store.objects.filter(owner=self.request.user)
        return TaxSlab.objects.filter(store__in=stores)

    def perform_create(self, serializer):
        store = Store.objects.filter(owner=self.request.user).first()
        if store:
            serializer.save(store=store)


class TerminalViewSet(viewsets.ModelViewSet):
    serializer_class = TerminalSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'device_id']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Terminal.objects.filter(store__owner=self.request.user)

    def perform_create(self, serializer):
        store = Store.objects.filter(owner=self.request.user).first()
        if store:
            serializer.save(store=store)

    @action(detail=True, methods=['post'])
    def open_session(self, request, pk=None):
        """Assign current_cashier, set opened_at and opening_balance."""
        terminal = self.get_object()
        if terminal.current_cashier is not None:
            return Response(
                {'error': 'Terminal already has an active session.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        opening_balance = Decimal(str(request.data.get('opening_balance', 0)))
        terminal.current_cashier = request.user
        terminal.opened_at = timezone.now()
        terminal.opening_balance = opening_balance
        terminal.cash_balance = opening_balance  # Initialize cash drawer
        terminal.closed_at = None
        terminal.closing_balance = None
        terminal.save()
        return Response(TerminalSerializer(terminal).data)

    @action(detail=True, methods=['post'])
    def close_session(self, request, pk=None):
        """Clear current_cashier, set closed_at and closing_balance."""
        terminal = self.get_object()
        if terminal.current_cashier is None:
            return Response(
                {'error': 'Terminal does not have an active session.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        closing_count = Decimal(str(request.data.get('closing_count', 0)))

        # Calculate expected balance
        expected_balance = terminal.cash_balance
        discrepancy = closing_count - expected_balance

        terminal.current_cashier = None
        terminal.closed_at = timezone.now()
        terminal.closing_balance = closing_count
        terminal.cash_balance = Decimal('0')  # Reset for next session
        terminal.save()

        serializer = TerminalSerializer(terminal)
        data = serializer.data
        data['expected_balance'] = str(expected_balance)
        data['discrepancy'] = str(discrepancy)

        return Response(data)

    @action(detail=True, methods=['get'])
    def session_summary(self, request, pk=None):
        """Get current session summary for a terminal."""
        from django.db.models import Sum, Count
        from apps.sales.models import Sale, Refund

        terminal = self.get_object()

        if not terminal.opened_at:
            return Response({'error': 'No active session.'}, status=status.HTTP_400_BAD_REQUEST)

        # Sales for this terminal's current session
        session_sales = Sale.objects.filter(
            terminal=terminal,
            created_at__gte=terminal.opened_at,
            status='completed'
        )

        agg = session_sales.aggregate(
            total_sales=Sum('total_amount'),
            total_tax=Sum('tax_amount'),
            total_discount=Sum('discount_amount'),
            transaction_count=Count('id'),
        )

        # Cash sales only
        cash_sales = session_sales.filter(payment_method='cash').aggregate(
            cash_total=Sum('total_amount')
        )

        # Refunds during session
        refunds = Refund.objects.filter(
            sale__terminal=terminal,
            created_at__gte=terminal.opened_at
        ).aggregate(
            refund_total=Sum('refund_amount'),
            refund_count=Count('id'),
        )

        return Response({
            'terminal_id': terminal.id,
            'terminal_name': terminal.name,
            'cashier': terminal.current_cashier.get_full_name() or terminal.current_cashier.username if terminal.current_cashier else None,
            'opened_at': terminal.opened_at.isoformat(),
            'opening_balance': str(terminal.opening_balance),
            'cash_balance': str(terminal.cash_balance),
            'total_sales': float(agg['total_sales'] or 0),
            'total_tax': float(agg['total_tax'] or 0),
            'total_discount': float(agg['total_discount'] or 0),
            'transaction_count': agg['transaction_count'],
            'cash_total': float(cash_sales['cash_total'] or 0),
            'refund_total': float(refunds['refund_total'] or 0),
            'refund_count': refunds['refund_count'],
            'expected_cash': float(terminal.cash_balance),
        })

    @action(detail=False, methods=['get'])
    def my_terminal(self, request):
        """Get the terminal assigned to the current user."""
        terminal = Terminal.objects.filter(current_cashier=request.user).first()
        if terminal is None:
            return Response(
                {'error': 'No terminal assigned to current user.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(TerminalSerializer(terminal).data)
