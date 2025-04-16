import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'; // Importă Reactive Forms
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule], // Adaugă ReactiveFormsModule
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private loginSubscription: Subscription | null = null;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  isLoading = false;
  errorMessage: string | null = null;

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // Marchează câmpurile pentru afișarea erorilor
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const credentials = {
      email: this.loginForm.get('email')?.value as string,
      password: this.loginForm.get('password')?.value as string
    }; // Ia valorile și le convertește la string

    this.loginSubscription = this.authService.login(credentials).subscribe({
      next: () => {
        // Navigarea se face în AuthService după login reușit
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'A apărut o eroare necunoscută.'; // Afișează eroarea primită de la service
        this.isLoading = false;
        console.error("Login Component Error:", err);
      }
    });
  }

  ngOnDestroy(): void {
      // Anulează subscripția dacă componenta e distrusă în timpul request-ului
      this.loginSubscription?.unsubscribe();
  }
}