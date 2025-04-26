import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service'; // Verifică calea

// Validator custom pentru a verifica dacă parolele se potrivesc
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  // Returnează null dacă unul dintre câmpuri nu există sau nu a fost modificat încă
  if (!password || !confirmPassword || !password.value || !confirmPassword.value) {
    return null;
  }

  // Returnează eroarea dacă parolele nu se potrivesc
  return password.value === confirmPassword.value ? null : { passwordsMismatch: true };
};


@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private signupSubscription: Subscription | null = null;

  // Folosim validatorul custom la nivel de grup
  signupForm = this.fb.group({
    // Poți adăuga și 'name' dacă dorești să-l colectezi aici
    // name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]], // Firebase cere minim 6 caractere
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator }); // Aplică validatorul pe grup

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    // Extragem doar email și password pentru Firebase Auth
    const { email, password } = this.signupForm.getRawValue();
    // const name = this.signupForm.value.name; // Dacă ai adăugat câmpul name

    // Asigură-te că valorile nu sunt null/undefined (deși validatorii ar trebui să prevină asta)
     if (!email || !password) {
        this.errorMessage = "Email și parolă sunt obligatorii.";
        this.isLoading = false;
        return;
     }


    this.signupSubscription = this.authService.signup({ email, password /*, name */ }).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.successMessage = "Cont creat cu succes! Vei fi redirecționat către pagina de login.";
        console.log('Signup successful in component for:', user.email);
        // Navigare la login după un mic delay pentru a afișa mesajul
        setTimeout(() => {
            this.router.navigate(['/login']);
        }, 2000); // Așteaptă 2 secunde
      },
      error: (err) => {
        this.errorMessage = err.message || 'A apărut o eroare necunoscută la înregistrare.';
        this.isLoading = false;
        console.error("Signup Component Error:", err);
      }
    });
  }

  ngOnDestroy(): void {
      this.signupSubscription?.unsubscribe();
  }
}