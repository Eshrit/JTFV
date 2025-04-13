import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AddMerchantComponent } from './add-merchant/add-merchant.component';
import { BillsComponent } from './bills/bills.component';
import { AdbComponent } from './adb/adb.component';
import { AlbComponent } from './alb/alb.component';
import { ReportsComponent } from './reports/reports.component';
import { VendorsComponent } from './vendors/vendors.component';
import { BarcodeComponent } from './barcode/barcode.component';
import { RegisterComponent } from './register/register.component';
import { AddProductsComponent } from './products/add-products/add-products.component';
import { ProductsComponent } from './products/products.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-merchants', component: AddMerchantComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'bills', component: BillsComponent },
  { path: 'adb', component: AdbComponent },
  { path: 'alb', component: AlbComponent },
  { path: 'reports', component: ReportsComponent },
  { path: 'vendors', component: VendorsComponent },
  { path: 'barcode', component: BarcodeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'add-products', component: AddProductsComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
