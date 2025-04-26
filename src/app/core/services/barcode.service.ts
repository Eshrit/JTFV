import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  private apiUrl = 'http://localhost:3001/api/barcodes';

  constructor(private http: HttpClient) {}

  // Save array of barcode items to backend
  saveProducts(data: any[]): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  // Fetch all saved barcodes from backend
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
