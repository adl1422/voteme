# Generated by Django 3.2.12 on 2022-02-01 17:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bumpers', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='bumper',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]
