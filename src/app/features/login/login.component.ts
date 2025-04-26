import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  logoUrl: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.logoUrl = 'assets/logo.jpg'; // Ensure this path is valid
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.http.post('http://localhost:3001/api/login', this.loginForm.value).subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: () => alert('Invalid email or password. Please try again.')
      });
    }
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
