import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  isLoginMode = true;
  isLoading = false;

  error: string | null = null;
  successMessage: string | null = null;
  private router = inject(Router);
  private authService = inject(AuthService);

  onSwitchMode() {
    this.isLoginMode = !this.isLoginMode;
  }

  onSubmit(form: NgForm) {
    console.log(form.value);
    console.log("Form values:", form.value);
    console.log("Confirm Password:", form.value.confirmPassword);

    if (!form.valid) {
      return;
    }
    const email = form.value.email;
    const password = form.value.password;


    if (this.isLoginMode) {
      this.isLoading = true;
      this.authService.login(email, password).subscribe({
        next: (resData) => {
          console.log('Logged in:', resData);
          this.isLoading = false;
          this.router.navigate(['/forgot-password']);                       //setezi ruta unde vrei sa mearga dupa login
        },
        error: (errorMessage) => {
          console.log(errorMessage);
          this.error = errorMessage;
          this.isLoading = false;
        }
      });
    }
    else {
      const confirmPassword = form.value.confirmPassword;
      if (password.trim() !== confirmPassword.trim()) {
        this.error = "Passwords do not match.";
        return;
      }
      if (!password || password.trim() === '') {
        this.error = "Please enter a password.";
        return;
      }
      this.isLoading = true;
      this.authService.signup(email, password).subscribe({
        next: (resData) => {
          console.log(resData);
          this.isLoading = false;
          this.isLoginMode = !this.isLoginMode;
          this.successMessage = "Verification email sent! Please check your inbox.";
        },
        error: (errorMessage) => {
          console.log(errorMessage);
          this.error = errorMessage;
          this.isLoading = false;
        }
      });
    }
    form.reset();
  }
  clearMessages() {
    this.error = null;
    this.successMessage = null;
  }
  onForgotPassword(emailInput: HTMLInputElement) {
    this.router.navigate(['/forgot-password']);
  }

}
