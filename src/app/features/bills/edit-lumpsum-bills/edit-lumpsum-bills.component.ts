import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BillsService } from 'src/app/core/services/bills.service';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-edit-lumpsum-bills',
  templateUrl: './edit-lumpsum-bills.component.html',
  styleUrls: ['./edit-lumpsum-bills.component.css']
})
export class EditLumpsumBillsComponent implements OnInit {
  clients: any[] = [];
  selectedClient: any = null;
  clientName = '';
  address = '';
  description = '';
  amount = 0;
  discount = 0;
  finalAmount = 0;
  billNumber = '';
  billDate = '';
  manualEmail = '';

  constructor(
    private route: ActivatedRoute,
    private billsService: BillsService,
    private http: HttpClient,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Edit Lumpsum Bill');
    this.billNumber = this.route.snapshot.paramMap.get('billNumber') || '';

    // Fetch all clients
    this.http.get<any[]>('http://localhost:3001/api/clients').subscribe(data => {
      this.clients = data;
    });

    // Load bill data
    this.billsService.getBillByNumber(this.billNumber).subscribe(bill => {
      this.clientName = bill.clientName;
      this.address = bill.address;
      this.description = bill.description;
      this.amount = bill.totalAmount;
      this.discount = bill.discount;
      this.finalAmount = bill.finalAmount;
      this.billDate = bill.billDate;

      // Try to preselect the client
      const matchingClient = this.clients.find(c => c.firstName === bill.clientName);
      if (matchingClient) {
        this.selectedClient = matchingClient;
      }
    });
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

  updateBill(): void {
    const updatedBill = {
      clientName: this.clientName,
      address: this.address,
      billNumber: this.billNumber,
      billDate: this.billDate,
      discount: this.discount,
      totalAmount: this.amount,
      finalAmount: this.finalAmount,
      description: this.description,
      billItems: [] // Always empty for lumpsum bills
    };

    this.billsService.updateBill(this.billNumber, updatedBill).subscribe({
      next: () => alert('Bill updated successfully!'),
      error: () => alert('Failed to update bill. Please try again.')
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
      email: this.manualEmail
    };

    this.billsService.sendBillByEmail(billData).subscribe({
      next: () => alert('Email Sent!'),
      error: () => alert('Failed to send email. Please try again.')
    });
  }
}
