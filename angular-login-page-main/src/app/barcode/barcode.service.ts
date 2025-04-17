import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BarcodeService {
  private apiUrl = 'http://localhost:3001/api/barcodes';

  constructor(private http: HttpClient) {}

  saveProducts(data: any[]): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
