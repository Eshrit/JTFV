import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BillService {
  private apiUrl = 'http://localhost:3001/api/bills';

  constructor(private http: HttpClient) {}

  // Add a new bill
  addBill(billData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, billData);
  }

  // Get a bill by its ID
  getBillById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // Update an existing bill by its ID
  updateBill(id: number, updatedBill: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, updatedBill);
  }

  // Get all bills
  getAllBills(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // Delete a bill by its ID
  deleteBill(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Method to fetch all bills for the 'bills' page
  getBillsPage(): Observable<any> {
    return this.http.get(this.apiUrl); // This fetches the list of bills (you can later add pagination if necessary)
  }
  
  // Method to filter bills based on specific criteria (like date or customer name)
  filterBills(criteria: any): Observable<any> {
    // Here, you could add query parameters based on your filtering criteria
    return this.http.get(`${this.apiUrl}?${criteria}`);
  }
}
