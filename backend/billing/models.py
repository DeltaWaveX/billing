from enum import unique
from django.db import models

# Create your models here.
class User(models.Model):
    id = models.AutoField(primary_key=True)
    fist_name=models.CharField(max_length=255)
    last_name=models.CharField(max_length=255)
    email=models.EmailField(unique=True)
    photourl = models.CharField(max_length = 255,null=True)
    password=models.CharField(max_length=255)
    role=models.IntegerField(default = 2)

    @property
    def is_authenticated(self):
        return True
    
    # role = 1 -> admin
    # role = 2 -> cashier


class product(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length = 255)
    retailprice = models.DecimalField(max_digits = 10, decimal_places = 2)
    wholesaleprice = models.DecimalField(max_digits = 10, decimal_places = 2)
    retailpercentage = models.DecimalField(max_digits = 10, decimal_places = 2)
    wholesalepercentage = models.DecimalField(max_digits = 10, decimal_places = 2)
    stock = models.IntegerField(null = True)
    unit = models.CharField(max_length = 255)
    purchaseprice = models.DecimalField(max_digits = 10, decimal_places = 2, default=0.00)

    class Meta:
        ordering = ['id']


class customer(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length = 255,null = True)
    phone = models.CharField(max_length = 10)
    gstin = models.CharField(max_length = 255,null = True)
    type = models.IntegerField(default = 1)
    #1 = retail
    #2 = wholesale


class retail_billing(models.Model):
    id = models.AutoField(primary_key=True)
    bill_number = models.CharField(max_length=255, unique=True, null=True, blank=True)
    customer = models.ForeignKey(customer, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    phonenumber = models.CharField(max_length = 10)
    datetime = models.DateTimeField(auto_now_add=True)
    grandtotal = models.DecimalField(max_digits = 10, decimal_places = 2)
    paymentmode = models.CharField(max_length=255)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.bill_number:
            self.bill_number = f"R{self.id}"
            super().save(update_fields=["bill_number"])

class wholesale_billing(models.Model):
    id = models.AutoField(primary_key=True)
    bill_number = models.CharField(max_length=255, unique=True, null=True, blank=True)
    customer = models.ForeignKey(customer, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    phonenumber = models.CharField(max_length = 10)
    datetime = models.DateTimeField(auto_now_add=True)
    grandtotal = models.DecimalField(max_digits = 10, decimal_places = 2)
    paymentmode = models.CharField(max_length=255)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.bill_number:
            self.bill_number = f"W{self.id}"
            super().save(update_fields=["bill_number"])

class retail_billing_product_mapping(models.Model):
    id = models.AutoField(primary_key=True)
    product_id = models.ForeignKey(product, on_delete=models.CASCADE)
    billing_id = models.ForeignKey(retail_billing, on_delete=models.CASCADE) 
    quantity = models.IntegerField()  
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

class wholesale_billing_product_mapping(models.Model):
    id = models.AutoField(primary_key=True)
    product_id = models.ForeignKey(product, on_delete=models.CASCADE)
    billing_id = models.ForeignKey(wholesale_billing, on_delete=models.CASCADE) 
    quantity = models.IntegerField()  
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

class barcodeMapping(models.Model):
    id = models.AutoField(primary_key=True)
    product_id = models.ForeignKey(product, on_delete=models.CASCADE)
    barcode = models.CharField(max_length = 255,unique=True)
    
    
    
class expense(models.Model):
    id = models.AutoField(primary_key=True)
    amount = models.DecimalField(max_digits = 10, decimal_places = 2)
    category = models.CharField(max_length = 255)
    description = models.CharField(max_length = 255)
    photourl = models.CharField(max_length = 255, null=True)

class unit(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length = 255, unique=True)
    print_label = models.CharField(max_length = 255)
    

