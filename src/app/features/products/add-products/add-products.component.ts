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
      const nameData = form.value;

      this.productService.addName(nameData).subscribe({
        next: () => {
          alert('Product added!');
          this.router.navigate(['/products']);
        },
        error: err => console.error('Failed to add name:', err)
      });
    }
  }

  backToHome(): void {
    this.router.navigate(['/products']);
  }
}
