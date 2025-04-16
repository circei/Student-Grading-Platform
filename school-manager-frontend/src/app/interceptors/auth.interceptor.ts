// src/app/interceptors/auth.interceptor.ts
import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // Importă serviciul actualizat
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl; // Preia URL-ul API din environment

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Verifică dacă cererea este către API-ul tău
    if (req.url.startsWith(this.apiUrl)) {
      // Obține token-ul în mod asincron
      return this.authService.getCurrentUserIdToken().pipe(
        switchMap(token => {
          if (token) {
            // Clonează cererea și adaugă header-ul Authorization
            const authReq = req.clone({
              setHeaders: { Authorization: `Bearer ${token}` }
            });
            // Trimite cererea modificată
            return next.handle(authReq);
          } else {
            // Dacă nu există token (utilizatorul nu e logat), trimite cererea originală
            // Backend-ul ar trebui să returneze 401 Unauthorized pentru rutele protejate
            console.warn('AuthInterceptor: No token found, sending original request to API.');
            return next.handle(req);
          }
        }),
        catchError(error => {
           // Poți adăuga aici logică globală de gestionare a erorilor de autentificare (ex: 401/403)
           console.error('AuthInterceptor Error:', error);
           if (error.status === 401 || error.status === 403) {
               this.authService.logout(); // Fii atent la bucle infinite dacă logout-ul face și el un request
           }
           return throwError(() => error);
        })
      );
    } else {
      // Dacă cererea nu este către API-ul tău, trimite-o nemodificată
      return next.handle(req);
    }
  }
}