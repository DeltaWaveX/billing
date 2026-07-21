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
from .models import User, product, customer, retail_billing, wholesale_billing, retail_billing_product_mapping, wholesale_billing_product_mapping, barcodeMapping, expense, unit
from .serializers import (
    UserSerializer,
    ProductSerializer,
    CustomerSerializer,
    RetailBillingSerializer,
    WholesaleBillingSerializer,
    RetailBillingProductMappingSerializer,
    WholesaleBillingProductMappingSerializer,
    BarcodeMappingSerializer,
    ExpenseSerializer,
    UnitSerializer,
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

class BillingViewSet(viewsets.ViewSet):
    def list(self, request):
        retail_bills = retail_billing.objects.select_related('customer', 'user').all().order_by('-datetime')
        wholesale_bills = wholesale_billing.objects.select_related('customer', 'user').all().order_by('-datetime')
        
        all_bills = []
        for b in retail_bills:
            all_bills.append({
                "id": b.id,
                "bill_number": b.bill_number,
                "customer": b.customer.id if b.customer else None,
                "customer_name": b.customer.name if b.customer else "Walk-in",
                "user": b.user.id if b.user else None,
                "phonenumber": b.phonenumber,
                "datetime": b.datetime,
                "type": 1,
                "grandtotal": b.grandtotal,
                "paymentmode": b.paymentmode,
            })
        for b in wholesale_bills:
            all_bills.append({
                "id": b.id,
                "bill_number": b.bill_number,
                "customer": b.customer.id if b.customer else None,
                "customer_name": b.customer.name if b.customer else "Walk-in",
                "user": b.user.id if b.user else None,
                "phonenumber": b.phonenumber,
                "datetime": b.datetime,
                "type": 2,
                "grandtotal": b.grandtotal,
                "paymentmode": b.paymentmode,
            })
        
        # Sort combined by datetime descending
        all_bills.sort(key=lambda x: x["datetime"], reverse=True)
        return Response(all_bills)

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
                if bill_type == 1:
                    bill = retail_billing.objects.create(
                        customer=cust,
                        user=biller,
                        phonenumber=phonenumber or phone or '',
                        grandtotal=grandtotal,
                        paymentmode=paymentmode
                    )
                else:
                    bill = wholesale_billing.objects.create(
                        customer=cust,
                        user=biller,
                        phonenumber=phonenumber or phone or '',
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

                    if bill_type == 1:
                        retail_billing_product_mapping.objects.create(
                            product_id=prod,
                            billing_id=bill,
                            quantity=qty,
                            unit_price=unit_price,
                            line_total=line_total
                        )
                    else:
                        wholesale_billing_product_mapping.objects.create(
                            product_id=prod,
                            billing_id=bill,
                            quantity=qty,
                            unit_price=unit_price,
                            line_total=line_total
                        )

                return Response({"message": "Bill created successfully", "bill_number": bill.bill_number, "bill_id": bill.id}, status=201)

        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def get_bill(self, request):
        bill_number = request.query_params.get('bill_number')
        if not bill_number:
            return Response({"error": "bill_number is required"}, status=400)
            
        is_retail = bill_number.startswith('R')
        is_wholesale = bill_number.startswith('W')
        
        if not is_retail and not is_wholesale:
            return Response({"error": "Invalid bill_number format"}, status=400)
            
        try:
            if is_retail:
                bill = retail_billing.objects.get(bill_number=bill_number)
                items_mapping = retail_billing_product_mapping.objects.filter(billing_id=bill).select_related('product_id')
            else:
                bill = wholesale_billing.objects.get(bill_number=bill_number)
                items_mapping = wholesale_billing_product_mapping.objects.filter(billing_id=bill).select_related('product_id')
                
            items = []
            for mapping in items_mapping:
                items.append({
                    "product_id": mapping.product_id.id if mapping.product_id else None,
                    "product_name": mapping.product_id.name.split("/")[0] if mapping.product_id else "Unknown",
                    "quantity": mapping.quantity,
                    "unit_price": mapping.unit_price,
                    "line_total": mapping.line_total,
                    "unit": mapping.product_id.unit if mapping.product_id else ""
                })
                
            return Response({
                "id": bill.id,
                "bill_number": bill.bill_number,
                "datetime": bill.datetime,
                "phonenumber": bill.phonenumber,
                "grandtotal": bill.grandtotal,
                "paymentmode": bill.paymentmode,
                "customer": {
                    "name": bill.customer.name if bill.customer else "Walk-in",
                    "phone": bill.customer.phone if bill.customer else "",
                    "gstin": bill.customer.gstin if bill.customer else "",
                },
                "items": items
            })
        except (retail_billing.DoesNotExist, wholesale_billing.DoesNotExist):
            return Response({"error": "Bill not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['delete'])
    def delete_bill(self, request):
        bill_number = request.query_params.get('bill_number')
        if not bill_number:
            return Response({"error": "bill_number is required"}, status=400)
            
        is_retail = bill_number.startswith('R')
        is_wholesale = bill_number.startswith('W')
        
        if not is_retail and not is_wholesale:
            return Response({"error": "Invalid bill_number format"}, status=400)
            
        try:
            with transaction.atomic():
                if is_retail:
                    bill = retail_billing.objects.get(bill_number=bill_number)
                    mappings = retail_billing_product_mapping.objects.filter(billing_id=bill)
                else:
                    bill = wholesale_billing.objects.get(bill_number=bill_number)
                    mappings = wholesale_billing_product_mapping.objects.filter(billing_id=bill)
                    
                for mapping in mappings:
                    prod = mapping.product_id
                    if prod.stock is not None:
                        prod.stock += mapping.quantity
                        prod.save()
                        
                bill.delete()
                
            return Response({"message": "Bill deleted successfully"}, status=200)
        except (retail_billing.DoesNotExist, wholesale_billing.DoesNotExist):
            return Response({"error": "Bill not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['put'])
    def update_bill(self, request):
        data = request.data
        bill_number = data.get('bill_number')
        if not bill_number:
            return Response({"error": "bill_number is required"}, status=400)
            
        is_retail = bill_number.startswith('R')
        is_wholesale = bill_number.startswith('W')
        
        if not is_retail and not is_wholesale:
            return Response({"error": "Invalid bill_number format"}, status=400)
            
        customer_data = data.get('customer', {})
        items_data = data.get('items', [])
        paymentmode = data.get('paymentmode', 'cash')
        grandtotal = data.get('grandtotal', 0.00)
        phonenumber = data.get('phonenumber', customer_data.get('phone', ''))

        try:
            with transaction.atomic():
                if is_retail:
                    bill = retail_billing.objects.get(bill_number=bill_number)
                    mappings = retail_billing_product_mapping.objects.filter(billing_id=bill)
                else:
                    bill = wholesale_billing.objects.get(bill_number=bill_number)
                    mappings = wholesale_billing_product_mapping.objects.filter(billing_id=bill)
                    
                for mapping in mappings:
                    prod = mapping.product_id
                    if prod.stock is not None:
                        prod.stock += mapping.quantity
                        prod.save()
                        
                mappings.delete()
                
                phone = customer_data.get('phone')
                cust = bill.customer
                if cust:
                    if customer_data.get('name'):
                        cust.name = customer_data['name']
                    if phone:
                        cust.phone = phone
                    if customer_data.get('gstin') is not None:
                        cust.gstin = customer_data['gstin']
                    cust.save()
                    
                bill.phonenumber = phonenumber or phone or ''
                bill.grandtotal = grandtotal
                bill.paymentmode = paymentmode
                bill.save()
                
                for item in items_data:
                    prod_id = item.get('product_id')
                    qty = int(item.get('quantity', 1))
                    unit_price = item.get('unit_price', 0.00)
                    line_total = item.get('line_total', 0.00)

                    prod = product.objects.get(id=prod_id)
                    
                    if prod.stock is not None:
                        prod.stock = max(0, prod.stock - qty)
                        prod.save()

                    if is_retail:
                        retail_billing_product_mapping.objects.create(
                            product_id=prod,
                            billing_id=bill,
                            quantity=qty,
                            unit_price=unit_price,
                            line_total=line_total
                        )
                    else:
                        wholesale_billing_product_mapping.objects.create(
                            product_id=prod,
                            billing_id=bill,
                            quantity=qty,
                            unit_price=unit_price,
                            line_total=line_total
                        )
                        
            return Response({"message": "Bill updated successfully", "bill_number": bill.bill_number}, status=200)
        except (retail_billing.DoesNotExist, wholesale_billing.DoesNotExist):
            return Response({"error": "Bill not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def daily_sales(self, request):
        retail_bills = retail_billing.objects.all().prefetch_related('retail_billing_product_mapping_set__product_id')
        wholesale_bills = wholesale_billing.objects.all().prefetch_related('wholesale_billing_product_mapping_set__product_id')
        
        daily_data = {}
        
        for b in retail_bills:
            date_str = b.datetime.date().strftime("%Y-%m-%d")
            key = (date_str, "Retail")
            cost = 0.00
            for mapping in b.retail_billing_product_mapping_set.all():  # type: ignore
                qty = mapping.quantity
                purchase_price = float(mapping.product_id.purchaseprice) if mapping.product_id else 0.00
                cost += qty * purchase_price
                
            if key not in daily_data:
                daily_data[key] = {"date": date_str, "saleType": "Retail", "totalBills": 0, "totalSale": 0.00, "totalCost": 0.00}
            daily_data[key]["totalBills"] += 1
            daily_data[key]["totalSale"] += float(b.grandtotal)
            daily_data[key]["totalCost"] += cost

        for b in wholesale_bills:
            date_str = b.datetime.date().strftime("%Y-%m-%d")
            key = (date_str, "Wholesale")
            cost = 0.00
            for mapping in b.wholesale_billing_product_mapping_set.all():  # type: ignore
                qty = mapping.quantity
                purchase_price = float(mapping.product_id.purchaseprice) if mapping.product_id else 0.00
                cost += qty * purchase_price
                
            if key not in daily_data:
                daily_data[key] = {"date": date_str, "saleType": "Wholesale", "totalBills": 0, "totalSale": 0.00, "totalCost": 0.00}
            daily_data[key]["totalBills"] += 1
            daily_data[key]["totalSale"] += float(b.grandtotal)
            daily_data[key]["totalCost"] += cost
            
        return Response(list(daily_data.values()))

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        today = timezone.localtime().date()
        
        # 1. Today's Revenue
        retail_rev = retail_billing.objects.filter(datetime__date=today).aggregate(revenue=Sum('grandtotal'))['revenue'] or 0.00
        wholesale_rev = wholesale_billing.objects.filter(datetime__date=today).aggregate(revenue=Sum('grandtotal'))['revenue'] or 0.00
        today_revenue = retail_rev + wholesale_rev

        # 2. Today's Sales Count
        today_sales_count = retail_billing.objects.filter(datetime__date=today).count() + wholesale_billing.objects.filter(datetime__date=today).count()

        # 3. Monthly Expenses (Sum of all logged expenses)
        monthly_expenses = expense.objects.aggregate(total=Sum('amount'))['total'] or 0.00

        # 4. Active Customers
        customer_count = customer.objects.count()

        # 5. Recent Bills
        recent_retail = list(retail_billing.objects.order_by('-datetime')[:5])
        recent_wholesale = list(wholesale_billing.objects.order_by('-datetime')[:5])
        
        recent_bills_qs = sorted(recent_retail + recent_wholesale, key=lambda x: x.datetime, reverse=True)[:5]
        
        recent_bills = []
        for b in recent_bills_qs:
            is_retail = isinstance(b, retail_billing)
            recent_bills.append({
                "id": b.id,
                "billNo": b.bill_number,
                "name": b.customer.name if b.customer else "Walk-in",
                "phone": b.phonenumber,
                "date": b.datetime.strftime("%d/%m/%Y %I:%M %p"),
                "paymentMode": b.paymentmode,
                "type": "Retail" if is_retail else "Wholesale",
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

class BarcodeMappingViewSet(viewsets.ModelViewSet):
    queryset = barcodeMapping.objects.all()
    serializer_class = BarcodeMappingSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = expense.objects.all()
    serializer_class = ExpenseSerializer

class UnitViewSet(viewsets.ModelViewSet):
    queryset = unit.objects.all()
    serializer_class = UnitSerializer
