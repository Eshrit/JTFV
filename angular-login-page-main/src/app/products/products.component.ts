import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService } from './products.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  searchBy: string = 'vegName';  // Default search by VegName
  searchText: string = '';  // Text entered in search field
  products: any[] = [];  // Array to hold all products
  filteredProducts: any[] = [];  // Array to hold filtered products based on search

  constructor(private productService: ProductService, private router: Router) {}

  ngOnInit(): void {
    // Fetch all products on initialization
    this.productService.getProducts().subscribe(data => {
      this.products = data;
      this.filteredProducts = [...this.products];  // Set the filtered products initially to all products
    });
  }

  // Method to search for products based on the selected criteria and search text
  onSearch(): void {
    if (this.searchText.trim() === '') {
      this.filteredProducts = [...this.products];  // If no text is entered, show all products
    } else {
      // Filter products based on selected search criteria and search text
      this.filteredProducts = this.products.filter(product =>
        product[this.searchBy]?.toString().toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  }

  // Placeholder method for editing a product (redirects to edit page)
  onEdit(productId: number): void {
    this.router.navigate([`/edit-products/${productId}`]);  // Assuming you have a route for editing a product
  }


  // Placeholder method for deleting a product
  onDelete(productId: number): void {
    this.productService.deleteProduct(productId).subscribe({
      next: () => {
        // Remove the deleted product from the array after successful deletion
        this.products = this.products.filter(product => product.id !== productId);
        this.filteredProducts = [...this.products];  // Re-filter the products
      },
      error: (err) => console.error('Failed to delete product:', err)
    });
  }

  // Method to go back to the home page
  backToHome(): void {
    this.router.navigate(['/home']);
  }
}
