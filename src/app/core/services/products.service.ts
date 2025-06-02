import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ✅ Add Name interface for product names from 'names' table
export interface Name {
  id: number;
  name: string;
  type: 'fruit' | 'vegetable' | 'others' | null;
  priority: string;
  units: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private baseUrl = 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}

  // ✅ Fetch all names from names table
  getNames(): Observable<Name[]> {
    return this.http.get<Name[]>(`${this.baseUrl}/names`);
  }

  // ✅ Fetch all products (if needed elsewhere)
  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/products`);
  }

  // ✅ Fetch a single product by ID
  getProductById(productId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/products/${productId}`);
  }

  // ✅ Save a new product
  saveProduct(product: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/products`, product);
  }

  // ✅ Update an existing product
  updateProduct(productId: number, updatedProduct: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/products/${productId}`, updatedProduct);
  }

  // ✅ Delete a product
  deleteProduct(productId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/${productId}`);
  }

    // Get a single name by ID
  getNameById(id: number): Observable<Name> {
    return this.http.get<Name>(`${this.baseUrl}/names/${id}`);
  }

  // Update a name
  updateName(id: number, updatedData: Partial<Name>): Observable<any> {
    return this.http.put(`${this.baseUrl}/names/${id}`, updatedData);
  }
  // Add a new name to names table
  addName(data: { name: string; type: string; priority: string; units: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/names`, data);
  }
}
