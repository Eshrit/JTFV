import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
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
  selector: 'app-bills',
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.css']
})
export class BillsComponent implements OnInit {
  products: Name[] = []; // from names table
  namesMap: { [id: number]: string } = {};
  billItems: BillItem[] = [];
  clients: string[] = [
    'HAIKO', 'AVENUE SUPER MARTS GR FLOOR SPECTRA BUILDING HIGH STREET CORNER',
    'CHEK MARKET', 'AVENUE E-COMMERCE LIMITED', 'AVENUE E- COMMERCE LTD',
    'HAIKO MARKET', 'AVENUE E-COMMERCE LTD'
  ];
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
    private billsService: BillsService,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Invoice - J.T. Fruits & Vegetables');

    // ✅ Fetch product names from names table
    this.productService.getNames().subscribe(names => {
      this.products = names;
      this.namesMap = Object.fromEntries(names.map(n => [n.id, n.name]));

      this.route.paramMap.subscribe(params => {
        const billNumber = params.get('billNumber');
        if (billNumber) this.loadBillForEdit(billNumber);
      });
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

    this.billsService.getLatestBillNumber().subscribe({
      next: (res: { billNumber: string }) => {
        this.billNumber = res.billNumber;
      },
      error: () => this.billNumber = '001'
    });
  }

  loadBillForEdit(billNumber: string) {
    this.http.get<any>(`http://localhost:3001/api/bills/${billNumber}`).subscribe({
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
      error: err => console.error('Failed to load bill for edit:', err)
    });
  }

  onProductChange(index: number): void {
    const selectedId = this.billItems[index].productId;
    const selectedName = this.namesMap[selectedId!] || '(Unknown)';
    this.billItems[index].productName = selectedName;
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
      .filter(item => item.productId !== null && item.productName && item.quantity > 0 && item.price > 0)
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
      next: () => alert('Email Sent!'),
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

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
}
