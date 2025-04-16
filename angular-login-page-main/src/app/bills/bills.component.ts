import { Component, OnInit } from '@angular/core';
import { ProductService } from '../products/products.service';
import { HttpErrorResponse } from '@angular/common/http';
import { BillsService } from './bills.service';
import { Title } from '@angular/platform-browser';

interface BillItem {
  productId: number | null;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

@Component({
  selector: 'app-bills',
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.css']
})
export class BillsComponent implements OnInit {
  products: any[] = [];
  billItems: BillItem[] = [];
  clients: string[] = ['HAIKO', 'STAR BAZAAR', 'BIG BASKET'];
  clientName: string = '';
  address: string = '';
  billNumber: string = '';
  billDate: string = new Date().toISOString().substring(0, 10);
  discount: number = 0;
  totalAmount: number = 0;
  finalAmount: number = 0;

  constructor(
    private titleService: Title,
    private productService: ProductService,
    private billsService: BillsService
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Invoice - J.T. Fruits & Vegetables');
    this.productService.getProducts().subscribe(data => {
      this.products = data;
    });

    for (let i = 0; i < 30; i++) {
      this.billItems.push({
        productId: null,
        productName: '',
        quantity: 0,
        price: 0,
        total: 0
      });
    }

    // ✅ Fetch next bill number
    this.billsService.getLatestBillNumber().subscribe({
      next: (res: { billNumber: string }) => {
        this.billNumber = res.billNumber;
      },
      error: (err: any) => {
        console.error('Failed to get latest bill number', err);
        this.billNumber = '001'; // fallback if server fails
      }
    });
  }

  onProductChange(index: number): void {
    const selectedId = this.billItems[index].productId;
    const selectedProduct = this.products.find(p => p.id === selectedId);
    if (selectedProduct) {
      this.billItems[index].productName = selectedProduct.vegName;
    }
    this.calculateRowTotal(index);
  }

  calculateRowTotal(index: number): void {
    const item = this.billItems[index];
    item.total = (item.quantity || 0) * (item.price || 0);
    this.calculateTotalAmount();
  }

  calculateTotalAmount(): void {
    this.totalAmount = this.billItems.reduce((acc, item) => acc + item.total, 0);
    this.calculateFinalAmount();
  }

  calculateFinalAmount(): void {
    const discountAmount = this.totalAmount * (this.discount / 100);
    this.finalAmount = this.totalAmount - discountAmount;
  }

  printBill(): void {
    window.print();
  }

  emailBill(): void {
    const billData = {
      clientName: this.clientName,
      address: this.address,
      billNumber: this.billNumber,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount: this.totalAmount,
      finalAmount: this.finalAmount,
      billItems: this.billItems
    };
  
    this.billsService.sendBillByEmail(billData).subscribe({
      next: () => {
        alert('Email Sent!');
      },
      error: (err) => {
        console.error('Email failed:', err);
        alert('Failed to send email. Please try again.');
      }
    });
  }

  saveBill(): void {
    const billData = {
      clientName: this.clientName,
      address: this.address,
      billNumber: this.billNumber,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount: this.totalAmount,
      finalAmount: this.finalAmount,
      billItems: this.billItems
    };

    this.billsService.saveBill(billData).subscribe({
      next: (response) => {
        alert('Bill saved successfully!');
        console.log('Saved bill response:', response);
      },
      error: (error: HttpErrorResponse) => {
        alert('Failed to save bill. Please try again.');
        console.error('Error saving bill:', error);
      }
    });
  }
}
