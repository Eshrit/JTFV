import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ClientService } from '../client.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-merchant',
  templateUrl: './add-merchant.component.html',
  styleUrls: ['./add-merchant.component.css']
})
export class AddMerchantComponent {

  constructor(private clientService: ClientService, private router: Router) {}

  onSubmit(form: NgForm): void {
    if (form.valid) {
      const now = new Date();
      const clientData = {
        ...form.value,
        dateOfEntry: now.toLocaleDateString(),
        entryTime: now.toLocaleTimeString()
      };

      this.clientService.saveClient(clientData).subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: err => console.error('Failed to save client:', err)
      });
    }
  }

  backToHome(): void {
    this.router.navigate(['/dashboard']);
  }
}
