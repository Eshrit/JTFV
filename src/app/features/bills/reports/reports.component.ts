import { Component, OnInit } from '@angular/core';
import { BillsService } from 'src/app/core/services/bills.service';

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
        this.bills = data.map(bill => {
          let billItems;
          try {
            const parsed = JSON.parse(bill.billItems);
            // If parsed is array, it's a normal bill; otherwise it's lumpsum
            billItems = Array.isArray(parsed) ? parsed : [];
          } catch {
            billItems = [];
          }
          return { ...bill, billItems };
        });

        this.filteredBills = [...this.bills];
      },
      error: (err) => console.error('Failed to load bills:', err)
    });
  }

  selectBill(bill: any): void {
    this.selectedBill = {
      ...bill,
      billItems: bill.billItems
    };
  }

  closeDetail(): void {
    this.selectedBill = null;
  }

  deleteBill(billNumber: string): void {
    if (confirm(`Are you sure you want to delete Bill No: ${billNumber}?`)) {
      this.billsService.deleteBill(billNumber).subscribe({
        next: () => {
          this.filteredBills = this.filteredBills.filter(bill => bill.billNumber !== billNumber);
          alert('Bill deleted successfully.');
        },
        error: err => {
          console.error('Failed to delete bill:', err);
          alert('Error deleting bill.');
        }
      });
    }
  }

  printSelectedBill(): void {
    const printContents = document.getElementById('print-section')?.innerHTML;
    if (printContents) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  }

  getEditLink(bill: any): string[] {
    return bill.description
      ? ['/edit-lumpsum-bills', bill.billNumber]
      : ['/edit-bills', bill.billNumber];
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
