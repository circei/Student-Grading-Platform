import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  email = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit(form: NgForm) {
    if (!form.valid) return; // Ensures the form validation runs first

    this.isLoading = true;
    this.authService.resetPassword(this.email).subscribe({
      next: () => {
        this.successMessage = "If an account exists with this email, a reset link has been sent. Check your inbox!";;
        this.errorMessage = null;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = "Please enter a valid email address.";
        this.successMessage = null;
        this.isLoading = false;
      }
    });

  }

  onBackToLogin() {
    this.router.navigate(['/auth']);
  }
}
