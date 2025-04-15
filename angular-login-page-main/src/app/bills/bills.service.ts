import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BillService {
  private apiUrl = 'http://localhost:3001/api/bills';

  constructor(private http: HttpClient) {}

  addBill(billData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, billData);
  }

  getBillById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateBill(id: number, updatedBill: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, updatedBill);
  }

  getAllBills(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  deleteBill(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}