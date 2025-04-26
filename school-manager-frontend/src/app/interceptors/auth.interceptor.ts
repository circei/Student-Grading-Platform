// src/app/interceptors/auth.interceptor.ts
import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // Importă serviciul actualizat
import { environment } from '../../environments/environment';
import { Router } from '@angular/router'; // Importă Router

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private router = inject(Router); // Injectează Router
  private apiUrl = environment.apiUrl;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Interceptează doar cererile către API-ul tău
    if (req.url.startsWith(this.apiUrl)) {
      return this.authService.getCurrentUserIdToken().pipe(
        switchMap(token => {
          if (token) {
            const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
            return next.handle(authReq);
          }
          // Dacă nu e token, trimite cererea originală. Backend-ul va da 401 dacă ruta e protejată.
          return next.handle(req);
        }),
        catchError((error: HttpErrorResponse) => {
           // Gestionează global erorile 401/403 de la API
           if (error.status === 401 || error.status === 403) {
             console.error(`AuthInterceptor: ${error.status} error from API, logging out.`);
             // Deloghează utilizatorul și redirecționează la login
             // Folosește un mic delay sau o altă strategie dacă logout face și el un request
             // pentru a evita potențiale bucle în cazuri rare.
             this.authService.logout().subscribe(); // Nu ne pasă de rezultat aici neapărat
           }
           return throwError(() => error); // Retransmite eroarea
        })
      );
    } else {
      // Lasă celelalte cereri (ex: către alte domenii) să treacă nemodificate
      return next.handle(req);
    }
  }
}