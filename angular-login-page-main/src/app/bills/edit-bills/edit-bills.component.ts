import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ProductService } from 'src/app/products/products.service';
import { BillsService } from '../bills.service';

interface BillItem {
  productId: number | null;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

@Component({
  selector: 'app-edit-bills',
  templateUrl: './edit-bills.component.html',
  styleUrls: ['./edit-bills.component.css']
})
export class EditBillsComponent implements OnInit {
  products: any[] = [];
  billItems: BillItem[] = [];
  clientName = '';
  address = '';
  billNumber = '';
  billDate = new Date().toISOString().substring(0, 10);
  discount = 0;
  totalAmount = 0;
  finalAmount = 0;
  clients: string[] = ['HAIKO', 'STAR BAZAAR', 'BIG BASKET'];

  constructor(
    private productService: ProductService,
    private billsService: BillsService,
    private route: ActivatedRoute,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Edit Bill - J.T. Fruits & Vegetables');

    this.productService.getProducts().subscribe(data => this.products = data);

    this.route.paramMap.subscribe(params => {
      const billNumber = params.get('billNumber');
      if (billNumber) {
        this.loadBillForEdit(billNumber);
      }
    });

    // Fill with empty rows (if needed)
    for (let i = 0; i < 30; i++) {
      this.billItems.push({ productId: null, productName: '', quantity: 0, price: 0, total: 0 });
    }
  }

  loadBillForEdit(billNumber: string) {
    this.billsService.getBillByNumber(billNumber).subscribe({
      next: bill => {
        this.clientName = bill.clientName;
        this.address = bill.address;
        this.billNumber = bill.billNumber;
        this.billDate = bill.billDate;
        this.discount = bill.discount;
        this.totalAmount = bill.totalAmount;
        this.finalAmount = bill.finalAmount;
        this.billItems = bill.billItems || [];

        this.billItems.forEach(item => {
          const match = this.products.find(p => p.id === item.productId);
          if (match) item.productName = match.vegName;
        });
      },
      error: err => {
        console.error('Failed to load bill:', err);
        alert('Failed to load bill.');
      }
    });
  }

  onProductChange(index: number): void {
    const selectedId = this.billItems[index].productId;
    const product = this.products.find(p => p.id === selectedId);
    if (product) {
      this.billItems[index].productName = product.vegName;
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
      next: () => alert('Email sent!'),
      error: (err) => {
        console.error('Email failed:', err);
        alert('Failed to send email.');
      }
    });
  }

  saveBill(): void {
    const updatedBill = {
      clientName: this.clientName,
      address: this.address,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount: this.totalAmount,
      finalAmount: this.finalAmount,
      billItems: this.billItems
    };

    this.billsService.updateBill(this.billNumber, updatedBill).subscribe({
      next: () => alert('Bill updated successfully!'),
      error: (err) => {
        alert('Failed to update bill.');
        console.error('Error updating bill:', err);
      }
    });
  }
}
