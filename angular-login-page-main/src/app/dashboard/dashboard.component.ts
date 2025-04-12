import { Component, OnInit } from '@angular/core';
import { ClientService } from '../client.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  searchBy = 'firstName';
  searchText = '';
  clients: any[] = [];
  filteredClients: any[] = [];

  constructor(private clientService: ClientService) {}

  ngOnInit(): void {
    this.clientService.getClients().subscribe(data => {
      this.clients = data;
      this.filteredClients = [...this.clients];
    });
  }
  
  onSearch() {
    if (this.searchText.trim() === '') {
      this.filteredClients = [...this.clients];
    } else {
      this.filteredClients = this.clients.filter(client =>
        client[this.searchBy]?.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  }
}
