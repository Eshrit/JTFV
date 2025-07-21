import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { BillsService } from 'src/app/core/services/bills.service';

@Component({
  selector: 'app-add-lumpsum-bills',
  templateUrl: './add-lumpsum-bills.component.html',
  styleUrls: ['./add-lumpsum-bills.component.css']
})

export class AddLumpsumBillsComponent implements OnInit {
  clients: any[] = [];
  selectedClient: any = null;
  clientName: string = '';
  address: string = '';
  description: string = '';
  amount: number = 0;
  discount: number = 0;
  finalAmount: number = 0;
  billNumber: string = '';
  billDate: string = new Date().toISOString().substring(0, 10);
  manualEmail: string = '';

  constructor(
    private http: HttpClient,
    private billsService: BillsService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Add Lumpsum Bill');
    this.http.get<any[]>('http://localhost:3001/api/clients').subscribe(data => {
      this.clients = data;
    });

    this.billsService.getLatestBillNumber().subscribe({
      next: (res: { billNumber: string }) => this.billNumber = res.billNumber,
      error: () => this.billNumber = '001'
    });

    this.calculateFinalAmount();
  }

  onClientChange(): void {
    if (this.selectedClient) {
      const c = this.selectedClient;
      this.clientName = c.firstName;
      this.address = [c.address1, c.address2, c.area, c.city].filter(Boolean).join(', ');
    }
  }

  calculateFinalAmount(): void {
    const discountAmount = this.amount * (this.discount / 100);
    this.finalAmount = this.amount - discountAmount;
  }

  saveBill(): void {
    const billData = {
      clientName: this.clientName,
      address: this.address,
      billNumber: this.billNumber,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount: this.amount,
      finalAmount: this.finalAmount,
      description: this.description,
      billItems: [] // No item list for lumpsum
    };

    this.billsService.saveBill(billData).subscribe({
      next: () => {
        alert('Bill saved successfully!');
        if (this.manualEmail && this.manualEmail.includes('@')) {
          const emailData = { ...billData, email: this.manualEmail };
          this.billsService.sendBillByEmail(emailData).subscribe({
            next: () => alert('Email Sent!'),
            error: () => alert('Failed to send email. Please try again.')
          });
        }
      },
      error: () => alert('Failed to save bill. Please try again.')
    });
  }

  printBill(): void {
    window.print();
  }

  emailBill(): void {
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
      totalAmount: this.amount,
      finalAmount: this.finalAmount,
      billItems: [],
      description: this.description,
      email: this.manualEmail
    };

    this.billsService.sendBillByEmail(billData).subscribe({
      next: () => alert('Email Sent!'),
      error: () => alert('Failed to send email. Please try again.')
    });
  }

  autoResize(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto'; // Reset height
    target.style.height = `${target.scrollHeight}px`; // Set to scroll height
  }
}
