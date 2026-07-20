from rest_framework import serializers
from .models import User, product, customer, billing, billing_product_mapping, barcodeMapping, expense

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        from django.contrib.auth.hashers import make_password
        password = validated_data.get('password')
        if password:
            validated_data['password'] = make_password(password)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from django.contrib.auth.hashers import make_password
        password = validated_data.get('password')
        if password:
            validated_data['password'] = make_password(password)
        return super().update(instance, validated_data)

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = product
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = customer
        fields = '__all__'

class BillingSerializer(serializers.ModelSerializer):
    class Meta:
        model = billing
        fields = '__all__'

class BillingProductMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = billing_product_mapping
        fields = '__all__'

class BarcodeMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = barcodeMapping
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = expense
        fields = '__all__'
