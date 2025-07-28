import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { BillsService } from 'src/app/core/services/bills.service';
import { AfterViewInit, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-add-lumpsum-bills',
  templateUrl: './add-lumpsum-bills.component.html',
  styleUrls: ['./add-lumpsum-bills.component.css']
})

export class AddLumpsumBillsComponent implements OnInit, AfterViewInit {
  @ViewChild('addressBox') addressBox!: ElementRef<HTMLTextAreaElement>;

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

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.addressBox && this.addressBox.nativeElement) {
        const textArea = this.addressBox.nativeElement;
        textArea.style.height = 'auto';
        textArea.style.height = textArea.scrollHeight + 'px';
      }
    });
  }
  
  onClientChange(): void {
    if (this.selectedClient) {
      const c = this.selectedClient;
      this.clientName = c.firstName;
      this.address = [c.address1, c.address2, c.area, c.city].filter(Boolean).join(', ');

      // Trigger auto-resize even for short addresses like "MUMBAI"
      setTimeout(() => {
        const textArea = document.querySelector('.address-area') as HTMLTextAreaElement;
        if (textArea) {
          textArea.style.height = 'auto';
          textArea.style.height = textArea.scrollHeight + 'px';
        }
      });
    }
  }

  calculateFinalAmount(): void {
    const discountAmount = this.amount * (this.discount / 100);
    this.finalAmount = this.amount - discountAmount;
  }

  saveBill(): void {
    const active = document.activeElement as HTMLElement;
    if (active && active.tagName === 'TEXTAREA') active.blur();

    const billData = {
      clientName: this.clientName,
      address: this.address,
      billNumber: this.billNumber,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount: this.amount,
      finalAmount: this.finalAmount,
      description: this.description,
      billItems: []
    };

    this.billsService.saveBill(billData).subscribe({
      next: () => {
        alert('Bill saved successfully!');
      },
      error: () => alert('Failed to save bill. Please try again.')
    });
  }

  printBill(): void {
    window.print();
  }

emailBill(): void {
  // ✅ Force Angular to flush textarea binding
  const active = document.activeElement as HTMLElement;
  if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
    active.blur();
  }

  // ✅ Allow model to update
  setTimeout(() => {
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
      description: this.description,  // ✅ guaranteed defined now
      billItems: [],
      email: this.manualEmail
    };

    console.log('✅ SENDING:', billData); // debug

    this.billsService.sendBillByEmail(billData).subscribe({
      next: () => alert('Email Sent!'),
      error: () => alert('Failed to send email. Please try again.')
    });
  }, 10); // delay ensures ngModel flushes into component
}

  autoResize(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto'; // Reset
    target.style.height = target.scrollHeight + 'px'; // Resize
  }
}
