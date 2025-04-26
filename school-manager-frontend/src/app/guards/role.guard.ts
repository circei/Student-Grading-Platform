import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Calea corectă
import { Role } from '../database/models/role.model'; // Calea corectă
import { map, take } from 'rxjs/operators';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  // Preia rolurile permise definite în data rutei
  const allowedRoles = route.data['allowedRoles'] as Role[];

  if (!allowedRoles || allowedRoles.length === 0) {
    // Dacă nu sunt specificate roluri permise, permitem accesul (dacă AuthGuard a permis deja)
    console.warn("RoleGuard: No 'allowedRoles' defined for route:", route.routeConfig?.path);
    return true;
  }

  return authService.currentUser$.pipe(
      take(1), // Ia doar valoarea curentă
      map(user => {
          if (!user || !user.roles) {
              console.log('RoleGuard: User not logged in or has no roles. Redirecting.');
              router.navigate(['/login']); // Sau o pagină 'unauthorized'
              return false;
          }

          // Verifică dacă utilizatorul are cel puțin unul din rolurile permise
          const hasPermission = allowedRoles.some(role => user.roles.includes(role));

          if (hasPermission) {
              console.log(`RoleGuard: Access granted for roles [<span class="math-inline">\{allowedRoles\.join\(', '\)\}\] to user with roles \[</span>{user.roles.join(', ')}]`);
              return true;
          } else {
              console.log(`RoleGuard: Access denied for roles [<span class="math-inline">\{allowedRoles\.join\(', '\)\}\]\. User roles\: \[</span>{user.roles.join(', ')}]. Redirecting.`);
              // Poți redirecționa la o pagină specifică 'access-denied' sau la dashboard-ul default
              router.navigate(['/dashboard']); // Sau '/access-denied'
              return false;
          }
      })
  );
};