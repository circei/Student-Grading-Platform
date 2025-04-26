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

    private isLoadingSubject = new BehaviorSubject<boolean>(true);
    public isLoading$ = this.isLoadingSubject.asObservable();

    constructor() {
        console.log('AuthService Initialized');
        this.authStateListener = onAuthStateChanged(this.auth, async (user) => {
            this.isLoadingSubject.next(true);
            if (user) {
                console.log('Auth State: Logged In - UID:', user.uid);
                try {
                    // --- PAS NOU: Obține rolurile prin metoda abstractizată ---
                    const roles = await this._resolveUserRoles(user);
                    // ------------------------------------------------------
                    const appUser: AppUser = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName,
                        roles: roles // Folosește rolurile returnate de metoda privată
                    };
                    this.currentUserSubject.next(appUser);
                    this.isLoggedInSubject.next(true);
                     console.log('Auth State: User data set - Roles (resolved):', roles);
                } catch (error) {
                    console.error("Auth State: Error resolving user roles or during state change:", error);
                    await signOut(this.auth); // Forțează logout din Firebase dacă apar erori grave
                    this.currentUserSubject.next(null);
                    this.isLoggedInSubject.next(false);
                }
            } else {
                 console.log('Auth State: Logged Out');
                this.currentUserSubject.next(null);
                this.isLoggedInSubject.next(false);
            }
             this.isLoadingSubject.next(false);
        });
    }

    // --- METODA PRIVATĂ PENTRU ROLURI ---
    private async _resolveUserRoles(user: User): Promise<Role[]> {
        // --- Implementare Temporară (Hardcodată) ---
        console.warn("AuthService: Using TEMPORARY role assignment logic!");
        // TODO: Înlocuiește această logică cu cea finală când Firebase Custom Claims sunt gata.
        const email = user.email?.toLowerCase();
        if (email?.endsWith('@prof.uni.ro') || email === 'teacher@example.com') { // Adaugă emailuri de test
            console.log(`Temporary logic: Assigning [${Role.Teacher}] based on email.`);
            return [Role.Teacher];
        } else if (email?.endsWith('@stud.uni.ro') || email === 'student@example.com') {
            console.log(`Temporary logic: Assigning [${Role.Student}] based on email.`);
            return [Role.Student];
        } else if (email === 'admin@example.com') {
             console.log(`Temporary logic: Assigning [${Role.Admin}] based on email.`);
             return [Role.Admin];
        }
         console.log(`Temporary logic: Assigning [] (no role) based on email.`);
        return []; // Default: fără roluri
        // --- Sfârșit Implementare Temporară ---


        /*
        // --- Implementare Finală (Comentată acum) ---
        // TODO: Decomentează și șterge/comentează logica temporară de mai sus când ești gata.
        console.log("AuthService: Using FINAL role assignment logic from Firebase Token Claims.");
        try {
            // false: nu forța refresh dacă nu e nevoie, true: forțează refresh (util după login/signup)
            const tokenResult = await getIdTokenResult(user, false);
            const roles = (tokenResult.claims['roles'] as Role[]) || [];
            console.log('Fetched roles from token claims:', roles);
            return roles;
        } catch (error) {
            console.error("Error fetching token result for roles:", error);
            // Decide cum gestionezi eroarea: returnezi roluri goale, deloghezi, etc.
            // Poate fi necesar un logout forțat dacă token-ul e invalid/expirat și nu poate fi reîmprospătat
            // await signOut(this.auth);
            return [];
        }
        // --- Sfârșit Implementare Finală ---
        */
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