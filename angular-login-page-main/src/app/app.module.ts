import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NavbarComponent } from './navbar/navbar.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { BillsComponent } from './bills/bills.component';
import { AdbComponent } from './adb/adb.component';
import { AlbComponent } from './alb/alb.component';
import { ReportsComponent } from './reports/reports.component';
import { VendorsComponent } from './vendors/vendors.component';
import { AddMerchantComponent } from './add-merchant/add-merchant.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { BarcodeComponent } from './barcode/barcode.component';
import { RegisterComponent } from './register/register.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AddProductsComponent } from './products/add-products/add-products.component';
import { ProductsComponent } from './products/products.component';
import { EditProductsComponent } from './products/edit-products/edit-products.component';
import { EditBillComponent } from './bills/edit-bills/edit-bills.component';
import { AddBillComponent } from './bills/add-bills/add-bills.component';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    NavbarComponent,
    BillsComponent,
    AdbComponent,
    AlbComponent,
    ReportsComponent,
    VendorsComponent,
    AddMerchantComponent,
    BarcodeComponent,
    RegisterComponent,
    AddProductsComponent,
    ProductsComponent,
    EditProductsComponent,
    EditBillComponent,
    AddBillComponent,
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
    MatCardModule,  
    BrowserModule,
    ReactiveFormsModule
  ],
  
  schemas: [CUSTOM_ELEMENTS_SCHEMA],  // Add this line=
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
