from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, StoreViewSet, TerminalViewSet, TaxSlabViewSet
from .registration import RegisterView

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'stores', StoreViewSet)
router.register(r'terminals', TerminalViewSet, basename='terminal')
router.register(r'tax-slabs', TaxSlabViewSet, basename='tax-slab')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('', include(router.urls)),
]
