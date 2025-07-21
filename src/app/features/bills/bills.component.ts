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
  products: Name[] = [];
  namesMap: { [id: number]: string } = {};
  billItems: BillItem[] = [];

  clients: any[] = [];
  selectedClient: any = null;
  clientName: string = '';
  address: string = '';
  billNumber: string = '';
  billDate: string = new Date().toISOString().substring(0, 10);
  discount: number = 0;
  totalAmount: number = 0;
  finalAmount: number = 0;
  manualEmail: string = '';

  constructor(
    private titleService: Title,
    private productService: ProductService,
    private billsService: BillsService,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Invoice - J.T. Fruits & Vegetables');

    this.productService.getNames().subscribe((names: Name[]) => {
      this.products = names.sort((a, b) => a.name.localeCompare(b.name));
      this.namesMap = Object.fromEntries(this.products.map(n => [n.id, n.name]));

      this.route.paramMap.subscribe(params => {
        const billNumber = params.get('billNumber');
        if (billNumber) this.loadBillForEdit(billNumber);
      });
    });

    this.http.get<any[]>('http://localhost:3001/api/clients').subscribe(data => {
      this.clients = data;
    });

    for (let i = 0; i < 20; i++) {
      this.billItems.push({ productId: null, productName: '', quantity: 0, price: 0, total: 0 });
    }

    this.billsService.getLatestBillNumber().subscribe({
      next: (res: { billNumber: string }) => this.billNumber = res.billNumber,
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

        const match = this.clients.find(c => c.firstName === bill.clientName);
        if (match) this.selectedClient = match;
      },
      error: err => console.error('Failed to load bill for edit:', err)
    });
  }

  onClientChange(): void {
    if (this.selectedClient) {
      const c = this.selectedClient;
      const parts = [c.address1, c.address2, c.area, c.city].filter(Boolean);
      this.clientName = c.firstName;
      this.address = parts.join(', ');
    }
  }

  onPriceKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Tab' && !event.shiftKey && index === this.billItems.length - 1) {
      setTimeout(() => {
        this.billItems.push({
          productId: null,
          productName: '',
          quantity: 0,
          price: 0,
          total: 0
        });
      }, 0);
    }
  }

  onProductChange(index: number): void {
    const selectedId = this.billItems[index].productId;
    const selectedProduct = this.products.find(p => p.id === selectedId);

    if (selectedProduct) {
      const nameWithUnits = selectedProduct.name + (selectedProduct.units ? ' ' + selectedProduct.units : '');
      this.billItems[index].productName = nameWithUnits;
    } else {
      this.billItems[index].productName = '(Unknown)';
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
    const validItems = this.billItems.filter(
      item => item.productId !== null && item.quantity > 0 && item.price > 0
    );

    if (validItems.length === 0) {
      alert('No valid items to print. Please check quantity and price fields.');
      return;
    }

    const allItems = [...this.billItems];
    this.billItems = validItems.map(item => ({
      ...item,
      productName: (() => {
        const prod = this.products.find(p => p.id === item.productId);
        return prod ? prod.name + (prod.units ? ' ' + prod.units : '') : '(Unknown)';
      })()
    }));

    setTimeout(() => {
      window.print();
      this.billItems = allItems;
    }, 300);
  }

  highlightInvalidRows(): void {
    this.billItems.forEach((item, index) => {
      if (!item.productId || item.quantity <= 0 || item.price <= 0) {
        console.warn(`Row ${index + 1} is incomplete.`);
      }
    });
  }

  emailBill(): void {
    const validItems = this.billItems.filter(
      item => item.productId !== null && item.productName && item.quantity > 0 && item.price > 0
    );

    if (!this.manualEmail || !this.manualEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    const billData = {
      clientName: this.clientName,
      address: this.address,
      billNumber: this.billNumber,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount: this.totalAmount,
      finalAmount: this.finalAmount,
      billItems: validItems,
      email: this.manualEmail // ✅ email passed to backend
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
