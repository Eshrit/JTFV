import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService, Name } from 'src/app/core/services/products.service';

type NameField = 'name' | 'type' | 'priority' | 'units' | 'mrp' | 'expiryDays';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  searchBy: NameField = 'name';
  searchText: string = '';
  products: Name[] = [];
  filteredProducts: Name[] = [];
  sortAsc: boolean = true;

  constructor(private productService: ProductService, private router: Router) {}

  ngOnInit(): void {
    this.productService.getNames().subscribe(names => {
      this.products = names;
      this.filteredProducts = [...this.products].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  onSearch(): void {
    const searchText = this.searchText.trim();
    const numericFields: NameField[] = ['mrp', 'expiryDays'];

    if (!searchText) {
      this.filteredProducts = [...this.products];
      return;
    }

    const isNumericField = numericFields.includes(this.searchBy);

    this.filteredProducts = this.products.filter(product => {
      const fieldValue = product[this.searchBy];

      if (fieldValue === undefined || fieldValue === null) return false;

      if (isNumericField) {
        const searchNumber = Number(searchText);
        return !isNaN(searchNumber) && Number(fieldValue) === searchNumber;
      }

      return fieldValue.toString().toLowerCase().includes(searchText.toLowerCase());
    });

    this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }

  sortField: NameField | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  sortBy(field: NameField): void {
    if (this.sortField === field) {
      // Toggle direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New sort field, reset direction
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.filteredProducts.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      const isNumeric = typeof aVal === 'number' && typeof bVal === 'number';

      const result = isNumeric
        ? (aVal as number) - (bVal as number)
        : aVal.toString().toLowerCase().localeCompare(bVal.toString().toLowerCase());

      return this.sortDirection === 'asc' ? result : -result;
    });
  }

  onEdit(productId: number): void {
    this.router.navigate(['/edit-products', productId]);
  }

  backToHome(): void {
    this.router.navigate(['/dashboard']);
  }
}