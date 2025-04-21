import { OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ProductService } from '../products.service';

@Component({
  selector: 'app-edit-products',
  templateUrl: './edit-products.component.html',
  styleUrls: ['./edit-products.component.css']
})
export class EditProductsComponent implements OnInit {
  productId!: number;
  currentDate = new Date().toLocaleDateString();
  currentTime = new Date().toLocaleTimeString();
  product: any = {};

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct();
  }

  loadProduct(): void {
    this.productService.getProductById(this.productId).subscribe({
      next: (product) => {
        this.product = product;
      },
      error: (err) => console.error('Failed to load product:', err)
    });
  }

  onSubmit(form: NgForm): void {
    if (form.valid) {
      const updatedProduct = {
        ...form.value,
        id: this.productId,  // Keep the ID intact
        dateOfEntry: this.currentDate,
        entryTime: this.currentTime
      };

      this.productService.updateProduct(this.productId, updatedProduct).subscribe({
        next: () => this.router.navigate(['/products']),
        error: (err) => console.error('Failed to update product:', err)
      });
    }
  }

  backToHome(): void {
    this.router.navigate(['/products']);
  }
}
