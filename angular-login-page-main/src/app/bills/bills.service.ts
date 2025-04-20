import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BillsService {
  getBillByNumber(billNumber: string) {
    throw new Error('Method not implemented.');
  }
  private apiUrl = 'http://localhost:3001/api/bills';

  constructor(private http: HttpClient) {}

  saveBill(billData: any): Observable<any> {
    return this.http.post('http://localhost:3001/api/bills', billData);
  }
  
  getLatestBillNumber(): Observable<{ billNumber: string }> {
    return this.http.get<{ billNumber: string }>('http://localhost:3001/api/bills/latest');
  }

  sendBillByEmail(billData: any): Observable<any> {
    return this.http.post('http://localhost:3001/api/send-bill', billData);
  }

  getAllBills(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3001/api/bills');
  }
  
  getBillById(id: number): Observable<any> {
    return this.http.get<any>(`http://localhost:3001/api/bills/${id}`);
  }
  
}


