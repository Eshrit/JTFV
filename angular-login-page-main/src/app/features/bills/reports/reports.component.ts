import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BillsService } from '../bills.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  searchBy = 'billNumber';
  searchText = '';
  bills: any[] = [];
  filteredBills: any[] = [];
  selectedBill: any = null;

  constructor(private billsService: BillsService) {}

  ngOnInit(): void {
    this.billsService.getAllBills().subscribe({
      next: (data) => {
        this.bills = data.filter(bill => {
          try {
            const items = JSON.parse(bill.billItems);
            return Array.isArray(items) && items.length > 0;
          } catch {
            return false;
          }
        });
        this.filteredBills = [...this.bills]; // initial copy
      },
      error: (err) => console.error('Failed to load bills:', err)
    });
  }

  selectBill(bill: any): void {
    this.selectedBill = {
      ...bill,
      billItems: JSON.parse(bill.billItems)
    };
  }

  closeDetail(): void {
    this.selectedBill = null;
  }

  printSelectedBill(): void {
    const printContents = document.getElementById('print-section')?.innerHTML;
    if (printContents) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // optional: refresh to restore bindings
    }
  }
  
  onSearch(): void {
    const query = this.searchText.toLowerCase();
    if (!query) {
      this.filteredBills = [...this.bills];
      return;
    }

    this.filteredBills = this.bills.filter(bill => {
      if (this.searchBy === 'billNumber') {
        return bill.billNumber?.toLowerCase().includes(query);
      } else if (this.searchBy === 'clientName') {
        return bill.clientName?.toLowerCase().includes(query);
      }
      return false;
    });
  }
}