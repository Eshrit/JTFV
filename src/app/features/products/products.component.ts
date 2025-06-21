import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService, Name } from 'src/app/core/services/products.service';

type NameField = 'name' | 'type' | 'priority' | 'units'; // ✅ Define valid keys

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  searchBy: NameField = 'name'; // ✅ Type-safe dropdown options
  searchText: string = '';
  products: Name[] = [];
  filteredProducts: Name[] = [];

  constructor(private productService: ProductService, private router: Router) {}

  ngOnInit(): void {
    this.productService.getNames().subscribe(names => {
      this.products = names;
      this.filteredProducts = [...this.products].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  onSearch(): void {
    if (this.searchText.trim() === '') {
      this.filteredProducts = [...this.products];
    } else {
      this.filteredProducts = this.products.filter(product =>
        (product[this.searchBy] || '').toLowerCase().includes(this.searchText.toLowerCase())
      );
    }

    // ✅ Always sort by name alphabetically
    this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }

  sortAsc: boolean = true; // toggle flag

  sortByType(): void {
    this.sortAsc = !this.sortAsc;

    this.filteredProducts.sort((a, b) => {
      const typeA = (a.type || '').toLowerCase();
      const typeB = (b.type || '').toLowerCase();
      return this.sortAsc ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
    });
  }

  onEdit(productId: number): void {
    this.router.navigate(['/edit-products', productId]);
  }

  onDelete(productId: number): void {
    // Optional: implement delete
  }

  backToHome(): void {
    this.router.navigate(['/dashboard']);
  }
}
