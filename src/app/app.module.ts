import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AddMerchantComponent } from './features/dashboard/add-merchant/add-merchant.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { NavbarComponent } from './features/navbar/navbar.component';
import { ReportsComponent } from './features/bills/reports/reports.component';
import { RegisterComponent } from './features/register/register.component';
import { AddProductsComponent } from './features/products/add-products/add-products.component';
import { ProductsComponent } from './features/products/products.component';
import { EditProductsComponent } from './features/products/edit-products/edit-products.component';
import { BarcodeComponent } from './features/barcode/barcode.component';
import { EditBillsComponent } from './features/bills/edit-bills/edit-bills.component';
import { BillsComponent } from './features/bills/bills.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    NavbarComponent,
    BillsComponent,
    ReportsComponent,
    AddMerchantComponent,
    BarcodeComponent,
    RegisterComponent,
    AddProductsComponent,
    ProductsComponent,
    EditProductsComponent,
    EditBillsComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
