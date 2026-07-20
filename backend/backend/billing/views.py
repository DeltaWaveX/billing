from django.core.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from .models import User, product, customer, billing, billing_product_mapping, barcodeMapping, expense
from .serializers import (
    UserSerializer,
    ProductSerializer,
    CustomerSerializer,
    BillingSerializer,
    BillingProductMappingSerializer,
    BarcodeMappingSerializer,
    ExpenseSerializer,
)

class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response({"error": "Please provide both email and password."}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Invalid email or password."}, status=400)

        is_valid = False
        try:
            is_valid = check_password(password, user.password)
        except Exception:
            pass

        if not is_valid:
            is_valid = (user.password == password)

        if not is_valid:
            return Response({"error": "Invalid email or password."}, status=400)

        payload = {
            'user_id': user.id,
            'email': user.email,
            'role': user.role,
            'exp': datetime.utcnow() + timedelta(days=1),
            'iat': datetime.utcnow()
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

        return Response({
            "token": token,
            "user": {
                "id": user.id,
                "fist_name": user.fist_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": user.role
            }
        })

class Home(APIView):
    def get(self, request):
        return Response({"message": "Welcome to billing app"})

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        if getattr(request.user, 'role', None) != 1:
            raise PermissionDenied("Only administrators can view the user list.")
        return super().list(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, 'role', None) != 1:
            raise PermissionDenied("Only administrators can delete users.")
        return super().destroy(request, *args, **kwargs)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = product.objects.all()
    serializer_class = ProductSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = customer.objects.all()
    serializer_class = CustomerSerializer

class BillingViewSet(viewsets.ModelViewSet):
    queryset = billing.objects.all()
    serializer_class = BillingSerializer

    @action(detail=False, methods=['post'])
    def create_bill(self, request):
        data = request.data
        customer_data = data.get('customer', {})
        items_data = data.get('items', [])
        user_id = data.get('user_id')
        bill_type = data.get('type', 1)  # 1: retail, 2: wholesale
        paymentmode = data.get('paymentmode', 'cash')
        grandtotal = data.get('grandtotal', 0.00)
        phonenumber = data.get('phonenumber', customer_data.get('phone', ''))

        try:
            with transaction.atomic():
                # 1. Customer
                phone = customer_data.get('phone')
                cust = None
                if phone:
                    cust = customer.objects.filter(phone=phone).first()
                    if not cust:
                        cust = customer.objects.create(
                            name=customer_data.get('name', 'Walk-in'),
                            phone=phone,
                            gstin=customer_data.get('gstin', ''),
                            type=bill_type
                        )
                    else:
                        if customer_data.get('name') and cust.name != customer_data.get('name'):
                            cust.name = customer_data['name']
                        if customer_data.get('gstin') and cust.gstin != customer_data.get('gstin'):
                            cust.gstin = customer_data['gstin']
                        cust.save()
                else:
                    cust = customer.objects.create(
                        name=customer_data.get('name', 'Walk-in'),
                        phone='',
                        type=bill_type
                    )

                # 2. User (Biller)
                biller = None
                if isinstance(request.user, User):
                    biller = request.user
                elif user_id:
                    biller = User.objects.filter(id=user_id).first()
                if not biller:
                    biller = User.objects.first()

                # 3. Create Billing Header
                bill = billing.objects.create(
                    customer=cust,
                    user=biller,
                    phonenumber=phonenumber or phone or '',
                    type=bill_type,
                    grandtotal=grandtotal,
                    paymentmode=paymentmode
                )

                # 4. Process Items
                for item in items_data:
                    prod_id = item.get('product_id')
                    qty = int(item.get('quantity', 1))
                    unit_price = item.get('unit_price', 0.00)
                    line_total = item.get('line_total', 0.00)

                    prod = product.objects.get(id=prod_id)
                    
                    if prod.stock is not None:
                        prod.stock = max(0, prod.stock - qty)
                        prod.save()

                    billing_product_mapping.objects.create(
                        product_id=prod,
                        billing_id=bill,
                        quantity=qty,
                        unit_price=unit_price,
                        line_total=line_total
                    )

                return Response({"message": "Bill created successfully", "bill_id": bill.id}, status=201)

        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def daily_sales(self, request):
        bills = billing.objects.all().prefetch_related('billing_product_mapping_set__product_id')
        
        daily_data = {}
        for b in bills:
            date_str = b.datetime.date().strftime("%Y-%m-%d")
            b_type = "Retail" if b.type == 1 else "Wholesale"
            key = (date_str, b_type)
            
            # Calculate cost of this bill
            cost = 0.00
            for mapping in b.billing_product_mapping_set.all():
                qty = mapping.quantity
                purchase_price = float(mapping.product_id.purchaseprice) if mapping.product_id else 0.00
                cost += qty * purchase_price
                
            if key not in daily_data:
                daily_data[key] = {
                    "date": date_str,
                    "saleType": b_type,
                    "totalBills": 0,
                    "totalSale": 0.00,
                    "totalCost": 0.00
                }
                
            daily_data[key]["totalBills"] += 1
            daily_data[key]["totalSale"] += float(b.grandtotal)
            daily_data[key]["totalCost"] += cost
            
        return Response(list(daily_data.values()))

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        today = timezone.localtime().date()
        
        # 1. Today's Revenue
        today_revenue = billing.objects.filter(datetime__date=today).aggregate(revenue=Sum('grandtotal'))['revenue'] or 0.00

        # 2. Today's Sales Count
        today_sales_count = billing.objects.filter(datetime__date=today).count()

        # 3. Monthly Expenses (Sum of all logged expenses)
        monthly_expenses = expense.objects.aggregate(total=Sum('amount'))['total'] or 0.00

        # 4. Active Customers
        customer_count = customer.objects.count()

        # 5. Recent Bills
        recent_bills_qs = billing.objects.order_by('-datetime')[:5]
        recent_bills = []
        for b in recent_bills_qs:
            recent_bills.append({
                "id": b.id,
                "billNo": f"INV-{b.id}",
                "name": b.customer.name if b.customer else "Walk-in",
                "phone": b.phonenumber,
                "date": b.datetime.strftime("%d/%m/%Y %I:%M %p"),
                "paymentMode": b.paymentmode,
                "type": "Retail" if b.type == 1 else "Wholesale",
                "total": float(b.grandtotal)
            })

        # 6. Low Stock Alerts
        low_stock_qs = product.objects.filter(stock__lte=5).order_by('stock')[:5]
        low_stock = []
        for p in low_stock_qs:
            low_stock.append({
                "name": p.name,
                "stock": p.stock,
                "unit": p.unit
            })

        return Response({
            "today_revenue": float(today_revenue),
            "today_sales_count": today_sales_count,
            "monthly_expenses": float(monthly_expenses),
            "customer_count": customer_count,
            "recent_bills": recent_bills,
            "low_stock_alerts": low_stock
        })

class BillingProductMappingViewSet(viewsets.ModelViewSet):
    queryset = billing_product_mapping.objects.all()
    serializer_class = BillingProductMappingSerializer

class BarcodeMappingViewSet(viewsets.ModelViewSet):
    queryset = barcodeMapping.objects.all()
    serializer_class = BarcodeMappingSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = expense.objects.all()
    serializer_class = ExpenseSerializer
