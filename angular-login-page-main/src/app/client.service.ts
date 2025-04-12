import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class ClientService {
  addClient(newClient: any) {
    throw new Error('Method not implemented.');
  }
  private apiUrl = 'http://localhost:3000/api/clients';

  constructor(private http: HttpClient) {}

  saveClient(data: any) {
    return this.http.post(this.apiUrl, data);
  }

  getClients() {
    return this.http.get<any[]>(this.apiUrl);
  }
}
