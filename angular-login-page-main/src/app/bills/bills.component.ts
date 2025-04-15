import { Component, OnInit } from '@angular/core';
import { ProductService } from '../products/products.service';

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
  clients: string[] = ['HAIKO', 'STAR BAZAAR', 'BIG BASKET']; // you can populate dynamically if needed
  clientName: string = '';
  address: string = '';
  billNumber: string = '';
  billDate: string = new Date().toISOString().substring(0, 10); // default to today
  discount: number = 0;
  totalAmount: number = 0;
  finalAmount: number = 0;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.productService.getProducts().subscribe(data => {
      this.products = data;
    });

    // Initialize with 10 blank rows
    for (let i = 0; i < 10; i++) {
      this.billItems.push({
        productId: null,
        productName: '',
        quantity: 0,
        price: 0,
        total: 0
      });
    }
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
    // Placeholder for email logic
    alert('Email sent!');
  }

  saveBill(): void {
    // Placeholder for saving logic
    alert('Bill saved!');
  }
}
