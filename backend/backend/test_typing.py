from django.db import models
class A(models.Model):
    b_set: models.Manager['B']
class B(models.Model):
    a = models.ForeignKey(A, on_delete=models.CASCADE)
