import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private baseUrl = 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}

  saveClient(client: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/clients`, client);
  }

  getClients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/clients`);
  }
}
