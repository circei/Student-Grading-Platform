import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, switchMap, take, tap } from 'rxjs/operators'; // Importă operatori RxJS

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Ascultă starea de încărcare inițială și starea de login
  return authService.isLoading$.pipe(
      take(1), // Ia prima valoare emisă (starea finală de încărcare)
      switchMap(isLoading => {
          if (isLoading) {
              // Dacă încă se încarcă starea, așteaptă până se termină
               console.log('AuthGuard: Waiting for auth state to load...');
          }
           console.log('AuthGuard: Auth state loaded. Checking login status...');
           // Acum verifică starea de login
           return authService.isLoggedIn$.pipe(
               take(1), // Ia valoarea curentă a stării de login
               map(isLoggedIn => {
                   if (isLoggedIn) {
                       console.log('AuthGuard: Access granted.');
                       return true; // Permite accesul
                   } else {
                       console.log('AuthGuard: Access denied. Redirecting to login.');
                       router.navigate(['/login'], { queryParams: { returnUrl: state.url } }); // Poți salva URL-ul dorit
                       return false; // Blochează accesul
                   }
               })
           );
      })
  );
};