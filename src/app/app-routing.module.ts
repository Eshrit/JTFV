import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddMerchantComponent } from './features/dashboard/add-merchant/add-merchant.component';
import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ProductsComponent } from './features/products/products.component';
import { ReportsComponent } from './features/bills/reports/reports.component';
import { RegisterComponent } from './features/register/register.component';
import { EditProductsComponent } from './features/products/edit-products/edit-products.component';
import { AddProductsComponent } from './features/products/add-products/add-products.component';
import { BillsComponent } from './features/bills/bills.component';
import { BarcodeComponent } from './features/barcode/barcode.component';
import { EditBillsComponent } from './features/bills/edit-bills/edit-bills.component';
import { AddLumpsumBillsComponent } from './features/bills/add-lumpsum-bills/add-lumpsum-bills.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-merchants', component: AddMerchantComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'bills', component: BillsComponent },
  { path: 'reports', component: ReportsComponent },
  { path: 'barcode', component: BarcodeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'add-products', component: AddProductsComponent },
  { path: 'edit-products/:id', component: EditProductsComponent },
  { path: 'edit-bills/:billNumber', component: EditBillsComponent },
  { path: 'add-lumpsum-bills', component: AddLumpsumBillsComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
