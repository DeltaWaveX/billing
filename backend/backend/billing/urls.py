from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    Home,
    LoginView,
    UserViewSet,
    ProductViewSet,
    CustomerViewSet,
    BillingViewSet,
    BillingProductMappingViewSet,
    BarcodeMappingViewSet,
    ExpenseViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("products", ProductViewSet, basename="product")
router.register("customers", CustomerViewSet, basename="customer")
router.register("billings", BillingViewSet, basename="billing")
router.register("billing-products", BillingProductMappingViewSet, basename="billing-product")
router.register("barcode-mappings", BarcodeMappingViewSet, basename="barcode-mapping")
router.register("expenses", ExpenseViewSet, basename="expense")

urlpatterns = [
    path("", Home.as_view(), name="home"),
    path("api/login/", LoginView.as_view(), name="login"),
    path("api/", include(router.urls)),
]