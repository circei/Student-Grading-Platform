// src/app/services/auth.service.ts
import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, getIdTokenResult, Unsubscribe } from '@angular/fire/auth';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { LoginCredentials } from '../database/models/login-credentials.model'; // Asigură că ai calea corectă
import { SignupCredentials } from '../database/models/signup-credentials.model';// Asigură că ai calea corectă
import { Role } from '../database/models/role.model'; // Asigură că ai calea corectă

// Interfața pentru utilizatorul aplicației
export interface AppUser {
    uid: string;
    email: string | null;
    name: string | null;
    roles: Role[];
}

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
    private auth: Auth = inject(Auth);
    private router: Router = inject(Router);
    private authStateListener: Unsubscribe;

    private currentUserSubject = new BehaviorSubject<AppUser | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    private isLoggedInSubject = new BehaviorSubject<boolean>(false);
    public isLoggedIn$ = this.isLoggedInSubject.asObservable();

    private isLoadingSubject = new BehaviorSubject<boolean>(true); // Stare de încărcare inițială
    public isLoading$ = this.isLoadingSubject.asObservable();

    constructor() {
        console.log('AuthService Initialized');
        this.authStateListener = onAuthStateChanged(this.auth, async (user) => {
            this.isLoadingSubject.next(true); // Începe încărcarea stării
            if (user) {
                console.log('Auth State: Logged In - UID:', user.uid);
                try {
                    const tokenResult = await getIdTokenResult(user, false); // false - nu forța refresh dacă nu e expirat
                    const roles = (tokenResult.claims['roles'] as Role[]) || []; // Extrage roluri (asigură-te că backend/Firebase le setează!)
                    const appUser: AppUser = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName, // Numele inițial din Firebase
                        roles: roles
                    };
                    this.currentUserSubject.next(appUser);
                    this.isLoggedInSubject.next(true);
                     console.log('Auth State: User data set - Roles:', roles);
                } catch (error) {
                    console.error("Auth State: Error getting token result:", error);
                    // Eroare la obținere token/claims, tratăm ca delogat
                    await signOut(this.auth); // Forțează logout din Firebase
                    this.currentUserSubject.next(null);
                    this.isLoggedInSubject.next(false);
                }
            } else {
                 console.log('Auth State: Logged Out');
                this.currentUserSubject.next(null);
                this.isLoggedInSubject.next(false);
            }
             this.isLoadingSubject.next(false); // Finalizează încărcarea stării
        });
    }

    ngOnDestroy(): void {
        if (this.authStateListener) {
            this.authStateListener();
             console.log('Auth State: Listener unsubscribed.');
        }
    }

    getCurrentUserIdToken(): Observable<string | null> {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            return of(null);
        }
        // getIdToken(true) forțează reîmprospătarea dacă e necesar (ex: token expirat)
        return from(currentUser.getIdToken(true));
    }

    login(credentials: LoginCredentials): Observable<User> {
        return from(signInWithEmailAndPassword(this.auth, credentials.email, credentials.password)).pipe(
            map(userCredential => userCredential.user),
            tap((user) => {
                console.log('Login successful for:', user.email);
                // Starea va fi actualizată de onAuthStateChanged, inclusiv rolurile
                this.router.navigate(['/dashboard']);
            }),
            catchError((error) => {
                console.error('Login Error:', error);
                // Poți returna un mesaj specific bazat pe error.code
                let friendlyMessage = 'A apărut o eroare la autentificare.';
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    friendlyMessage = 'Email sau parolă incorectă.';
                } else if (error.code === 'auth/invalid-email') {
                     friendlyMessage = 'Formatul email-ului este invalid.';
                }
                return throwError(() => new Error(friendlyMessage)); // Aruncă eroarea cu mesaj prietenos
            })
        );
    }

    signup(credentials: SignupCredentials): Observable<User> {
         // Aici ar trebui să adaugi și logica pentru a seta numele (displayName) dacă e furnizat
         // și, mai important, logica pentru a apela un Cloud Function (sau un endpoint backend securizat)
         // pentru a seta Custom Claims (rolurile) pentru noul utilizator. Fără asta, rolurile nu vor funcționa.
         console.warn("Signup does not automatically set roles via Custom Claims in this example!");

        return from(createUserWithEmailAndPassword(this.auth, credentials.email, credentials.password)).pipe(
            map(userCredential => userCredential.user),
            tap((user) => {
                console.log('Signup successful for:', user.email);
                 // Ideal ar fi să trimiți utilizatorul la login după signup sau să aștepți setarea rolurilor
                this.router.navigate(['/login']); // Sau '/dashboard' dacă gestionezi rolurile imediat
            }),
            catchError((error) => {
                console.error('Signup Error:', error);
                 let friendlyMessage = 'A apărut o eroare la înregistrare.';
                 if (error.code === 'auth/email-already-in-use') {
                     friendlyMessage = 'Adresa de email este deja folosită.';
                 } else if (error.code === 'auth/weak-password') {
                     friendlyMessage = 'Parola este prea slabă.';
                 } else if (error.code === 'auth/invalid-email') {
                     friendlyMessage = 'Formatul email-ului este invalid.';
                 }
                return throwError(() => new Error(friendlyMessage));
            })
        );
    }

    logout(): Observable<void> {
        const userEmail = this.auth.currentUser?.email; // Păstrează emailul pentru log
        return from(signOut(this.auth)).pipe(
            tap(() => {
                 console.log(`Logout successful for: ${userEmail}`);
                // Starea e actualizată de onAuthStateChanged
                this.router.navigate(['/login']);
            }),
            catchError((error) => {
                console.error('Logout Error:', error);
                // Chiar dacă apare eroare, curățăm starea locală și navigăm
                this.currentUserSubject.next(null);
                this.isLoggedInSubject.next(false);
                this.router.navigate(['/login']);
                return throwError(() => new Error('Logout failed: ' + error.message));
            })
        );
    }

    /**
     * Verifică dacă utilizatorul curent are cel puțin unul dintre rolurile specificate.
     * Returnează un Observable<boolean>.
     * @param allowedRoles Un array de roluri permise.
     */
    hasAnyRole(allowedRoles: Role[]): Observable<boolean> {
        return this.currentUser$.pipe(
            map(user => {
                if (!user || !user.roles || user.roles.length === 0) {
                    return false; // Nu e logat sau nu are roluri
                }
                // Verifică dacă cel puțin un rol permis se regăsește în rolurile utilizatorului
                return allowedRoles.some(role => user.roles.includes(role));
            })
        );
    }

    /**
     * Verifică sincron dacă utilizatorul curent are cel puțin unul dintre rolurile specificate.
     * ATENȚIE: Folosește doar dacă ești sigur că starea AuthService este deja actualizată.
     * @param allowedRoles Un array de roluri permise.
     */
    hasAnyRoleSync(allowedRoles: Role[]): boolean {
        const user = this.currentUserSubject.value;
        if (!user || !user.roles || user.roles.length === 0) {
            return false;
        }
        return allowedRoles.some(role => user.roles.includes(role));
    }

    // Poți adăuga și verificări specifice dacă le folosești des
    isTeacher(): Observable<boolean> {
        return this.hasAnyRole([Role.Teacher]);
    }
    isStudent(): Observable<boolean> {
        return this.hasAnyRole([Role.Student]);
    }
    isAdmin(): Observable<boolean> {
        return this.hasAnyRole([Role.Admin]);
    }

    // Helpers sincroni (utili uneori, dar folosește cu precauție starea curentă)
    getCurrentUserSnapshot(): AppUser | null { return this.currentUserSubject.value; }
    isLoggedInSnapshot(): boolean { return this.isLoggedInSubject.value; }
    isLoadingSnapshot(): boolean { return this.isLoadingSubject.value; }
}