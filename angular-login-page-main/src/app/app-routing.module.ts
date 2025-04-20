import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AddMerchantComponent } from './add-merchant/add-merchant.component';
import { BillsComponent } from './bills/bills.component';
import { AdbComponent } from './adb/adb.component';
import { AlbComponent } from './alb/alb.component';
import { BarcodeComponent } from './barcode/barcode.component';
import { RegisterComponent } from './register/register.component';
import { AddProductsComponent } from './products/add-products/add-products.component';
import { EditProductsComponent } from './products/edit-products/edit-products.component'; // New route for editing products
import { ProductsComponent } from './products/products.component';
import { ReportsComponent } from './bills/reports/reports.component';
import { EditBillsComponent } from './bills/edit-bills/edit-bills.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-merchants', component: AddMerchantComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'bills', component: BillsComponent },
  { path: 'adb', component: AdbComponent },
  { path: 'alb', component: AlbComponent },
  { path: 'reports', component: ReportsComponent },
  { path: 'barcode', component: BarcodeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'add-products', component: AddProductsComponent },
  { path: 'edit-products/:id', component: EditProductsComponent },
  { path: 'edit-bills/:billNumber', component: EditBillsComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
