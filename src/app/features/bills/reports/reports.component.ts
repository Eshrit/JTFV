import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(
    private billsService: BillsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.billsService.getAllBills().subscribe({
      next: (data) => {
        this.bills = data.map(bill => {
          let billItems;
          try {
            const parsed = JSON.parse(bill.billItems);
            billItems = Array.isArray(parsed) ? parsed : [];
          } catch {
            billItems = [];
          }

          // Derive a fallback billType for older rows with no billType
          const derivedBillType =
            typeof bill.billType === 'string' && bill.billType
              ? String(bill.billType).toLowerCase()
              : this.deriveBillType(bill);

          return { ...bill, billItems, billType: derivedBillType };
        });

        this.filteredBills = [...this.bills];
      },
      error: (err) => console.error('Failed to load bills:', err)
    });
  }

  /** BEST-EFFORT classifier for old records without billType. Tweak as needed. */
  private deriveBillType(bill: any): string | null {
    const name = (bill.clientName || '').toString().toLowerCase();

    // If your Reliance bills always used this client name, this will catch them:
    if (name.includes('freshpik spectra powai')) return 'reliance';

    // Heuristic: if billItems look like product-line items (have productId/price),
    // and clientName is empty/unknown (as in your Reliance template), classify as reliance.
    const items = Array.isArray(bill.billItems) ? bill.billItems : [];
    const looksLikeProductLines = items.some((it: any) => it && (it.productId || it.price || it.quantity));
    if (!bill.clientName && looksLikeProductLines) return 'reliance';

    return null;
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

  /** Old helper still used by goToEdit; returns the intended link parts. */
  getEditLink(bill: any): string[] {
    if (this.isRelianceBill(bill)) {
      return ['/edit-reliance-bills', bill.billNumber];
    }
    if (bill.description) {
      return ['/edit-lumpsum-bills', bill.billNumber];
    }
    return ['/edit-bills', bill.billNumber];
  }

  /** More robust Reliance detector. */
  private isRelianceBill(bill: any): boolean {
    // 1) Explicit tag
    if (bill.billType && String(bill.billType).toLowerCase() === 'reliance') return true;

    // 2) Fallback on client name
    const name = (bill.clientName || '').toString().toLowerCase();
    if (name.includes('freshpik spectra powai')) return true;

    // 3) Heuristic fallback for legacy rows
    const items = Array.isArray(bill.billItems) ? bill.billItems : [];
    const looksLikeProductLines = items.some((it: any) => it && (it.productId || it.price || it.quantity));
    if (!bill.clientName && looksLikeProductLines) return true;

    return false;
    }

  /** Do navigation in TS so we can debug and ensure params are correct. */
  goToEdit(bill: any): void {
    const link = this.getEditLink(bill);
    // Quick sanity log (check DevTools console if it still doesn't navigate)
    console.log('Navigating to:', link);
    this.router.navigate(link);
  }

  onRowClick(bill: any) {
    if (bill.billType === 'reliance') {
      this.router.navigate(['/edit-reliance-bills', bill.billNumber]);
    } else {
      this.router.navigate(['/edit-bills', bill.billNumber]);
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
