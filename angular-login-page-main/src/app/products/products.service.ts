import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private baseUrl = 'http://localhost:3001/api';  // URL of your backend

  constructor(private http: HttpClient) {}

  // Fetch all products
  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/products`);
  }

  // Save a new product
  saveProduct(product: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/products`, product);
  }

  // Delete a product by its ID
  deleteProduct(productId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/${productId}`);
  }
}
