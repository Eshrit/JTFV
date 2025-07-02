import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  constructor(private router: Router, private http: HttpClient) {}

  logout(): void {
    localStorage.removeItem('isLoggedIn');
    this.router.navigate(['/login']);
  }

  manualSync(): void {
    this.http.post('/api/manual-sync', {}).subscribe({
      next: () => alert('Cloud sync started successfully.'),
      error: (err) => alert('Cloud sync failed: ' + err.message)
    });
  }
}
