import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { ProductService, Name } from 'src/app/core/services/products.service';

@Component({
  selector: 'app-edit-products',
  templateUrl: './edit-products.component.html',
  styleUrls: ['./edit-products.component.css']
})
export class EditProductsComponent implements OnInit {
  productId!: number;
  product: Partial<Name> = {};

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
    this.productService.getNameById(this.productId).subscribe({
      next: (name) => this.product = name,
      error: (err) => console.error('Failed to load name:', err)
    });
  }

  onSubmit(form: NgForm): void {
    if (form.valid) {
      this.productService.updateName(this.productId, form.value).subscribe({
        next: () => this.router.navigate(['/products']),
        error: (err) => console.error('Failed to update name:', err)
      });
    }
  }

  backToProducts(): void {
    this.router.navigate(['/products']);
  }
}
