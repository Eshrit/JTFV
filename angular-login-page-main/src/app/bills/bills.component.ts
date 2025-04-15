import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BillService } from './bills.service';

@Component({
  selector: 'app-bills',
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.css']
})
export class BillsComponent implements OnInit {
  bills: any[] = [];
  filteredBills: any[] = [];
  searchTerm: string = '';

  constructor(private billService: BillService, private router: Router) {}

  ngOnInit(): void {
    this.loadBills();
  }

  calculateTotal(bill: any): number {
    if (!bill.items) return 0; // Safe check in case items is undefined
    return bill.items.reduce((total: number, item: any) => total + (item.price * item.quantity || 0), 0);
  }
  
  loadBills(): void {
    this.billService.getAllBills().subscribe({
      next: (res) => {
        this.bills = res;
        this.filteredBills = res;
      },
      error: (err) => {
        alert('Failed to load bills: ' + err.message);
      }
    });
  }

  deleteBill(id: number): void {
    if (confirm('Are you sure you want to delete this bill?')) {
      this.billService.deleteBill(id).subscribe({
        next: () => this.loadBills(),
        error: (err) => alert('Delete failed: ' + err.message),
      });
    }
  }

  filterBills(): void {
    const search = this.searchTerm.toLowerCase();
    this.filteredBills = this.bills.filter(b =>
      b.customerName.toLowerCase().includes(search) ||
      b.billNumber.toLowerCase().includes(search)
    );
  }

  goToEdit(id: number): void {
    this.router.navigate(['/edit-bill', id]);
  }
}
