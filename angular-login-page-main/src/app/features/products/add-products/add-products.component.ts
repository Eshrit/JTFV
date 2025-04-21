import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from 'src/app/core/services/products.service';

@Component({
  selector: 'app-add-products',
  templateUrl: './add-products.component.html',
  styleUrls: ['./add-products.component.css']
})
export class AddProductsComponent {
  currentDate = new Date().toLocaleDateString();
  currentTime = new Date().toLocaleTimeString();

  constructor(private productService: ProductService, private router: Router) {}

  onSubmit(form: NgForm): void {
    if (form.valid) {
      const productData = {
        ...form.value,
        dateOfEntry: this.currentDate,
        entryTime: this.currentTime
      };

      this.productService.saveProduct(productData).subscribe({
        next: () => {
        alert('Product Added!')},
        error: err => console.error('Failed to save product:', err)
      });
    }
  }

  backToHome(): void {
    this.router.navigate(['/products']);
  }
}
