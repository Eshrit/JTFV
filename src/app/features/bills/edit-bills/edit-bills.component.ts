import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ProductService, Name } from 'src/app/core/services/products.service';
import { BillsService } from 'src/app/core/services/bills.service';

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
  products: Name[] = [];
  namesMap: { [id: number]: string } = {};
  billItems: BillItem[] = [];
  clientName = '';
  address = '';
  billNumber = '';
  billDate = new Date().toISOString().substring(0, 10);
  discount = 0;
  totalAmount = 0;
  finalAmount = 0;
  clients: string[] = [
    'HAIKO', 'AVENUE SUPER MARTS GR FLOOR SPECTRA BUILDING HIGH STREET CORNER',
    'CHEK MARKET', 'AVENUE E-COMMERCE LIMITED', 'AVENUE E- COMMERCE LTD',
    'HAIKO MARKET', 'AVENUE E-COMMERCE LTD'
  ];

  constructor(
    private productService: ProductService,
    private billsService: BillsService,
    private route: ActivatedRoute,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Edit Bill - J.T. Fruits & Vegetables');

    // ✅ Get product names from names table
    this.productService.getNames().subscribe((names: Name[]) => {
      this.products = names;
      this.namesMap = Object.fromEntries(names.map(n => [n.id, n.name]));

      this.route.paramMap.subscribe(params => {
        const billNumber = params.get('billNumber');
        if (billNumber) this.loadBillForEdit(billNumber);
      });
    });

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
          item.productName = item.productId ? this.namesMap[item.productId] || '(Unknown)' : '';
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
    this.billItems[index].productName = this.namesMap[selectedId!] || '(Unknown)';
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
    const allItems = [...this.billItems];
    const printableItems = allItems
      .filter(item => item.productId !== null && item.quantity > 0 && item.price > 0)
      .map(item => ({
        ...item,
        productName: this.namesMap[item.productId!] || '(Unknown)'
      }));

    this.billItems = printableItems;

    alert('Please uncheck "Headers and footers" in the print dialog for cleaner output.');

    setTimeout(() => {
      window.print();
      this.billItems = allItems;
    }, 300);
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

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
}
