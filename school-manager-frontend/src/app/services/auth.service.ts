// src/app/services/auth.service.ts
import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, getIdTokenResult, Unsubscribe } from '@angular/fire/auth';
import { BehaviorSubject, Observable, from, of } from 'rxjs'; // Am eliminat 'Subscription' nefolosit
import { map, tap, switchMap, catchError } from 'rxjs/operators'; // Am adăugat 'tap' aici
import { LoginCredentials } from '../database/models/login-credentials.model'; // Asigură-te că ai acest model
import { SignupCredentials } from '../database/models/signup-credentials.model'; // Definește și acest model
import { Role } from '../database/models/role.model'; // Importă enum-ul Role (verifică calea)

// Definește o interfață pentru datele utilizatorului stocate în serviciu
export interface AppUser {
    uid: string;
    email: string | null;
    name: string | null; // Poate fi actualizat ulterior din profil
    roles: Role[];
}

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
    private auth: Auth = inject(Auth); // Injectează serviciul Firebase Auth
    private router: Router = inject(Router);
    private authStateListener: Unsubscribe; // Am redenumit pentru claritate

    // BehaviorSubject pentru a ține starea curentă a utilizatorului
    private currentUserSubject = new BehaviorSubject<AppUser | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable(); // Expune ca Observable

    // BehaviorSubject pentru starea de logare
    private isLoggedInSubject = new BehaviorSubject<boolean>(false);
    public isLoggedIn$ = this.isLoggedInSubject.asObservable();

    constructor() {
        // Atribuie rezultatul (funcția Unsubscribe) variabilei
        this.authStateListener = onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                console.log('Firebase Auth State Changed: User Logged In', user.uid);
                try {
                    // Forțează reîmprospătarea token-ului pentru a obține cele mai recente claims
                    const tokenResult = await getIdTokenResult(user, true);
                    const roles = (tokenResult.claims['roles'] as Role[]) || []; // Extrage rolurile din custom claims
                    const appUser: AppUser = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName, // Folosește display name din Firebase inițial
                        roles: roles
                    };
                    this.currentUserSubject.next(appUser);
                    this.isLoggedInSubject.next(true);
                } catch (error) {
                    console.error("Error getting token result:", error);
                    // Tratează cazul în care token-ul nu poate fi obținut/validat
                    // Deloghează utilizatorul dacă nu putem confirma rolurile/token-ul
                    this.currentUserSubject.next(null);
                    this.isLoggedInSubject.next(false);
                    // Poate vrei să faci logout forțat și din Firebase aici, deși onAuthStateChanged ar trebui să se ocupe
                    // await signOut(this.auth);
                    // Poate vrei să navighezi la login
                    // this.router.navigate(['/login']);
                }
            } else {
                console.log('Firebase Auth State Changed: User Logged Out');
                // Utilizator delogat
                this.currentUserSubject.next(null);
                this.isLoggedInSubject.next(false);
            }
        });
    }

    ngOnDestroy(): void {
        // Apelează direct funcția Unsubscribe pentru a curăța listener-ul
        if (this.authStateListener) {
            this.authStateListener();
            console.log('Firebase auth state listener unsubscribed.');
        }
    }

    // Metodă pentru a obține ID token-ul curent (necesar pentru interceptor)
    getCurrentUserIdToken(): Observable<string | null> {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            return of(null); // Returnează un Observable cu null dacă nu există utilizator curent
        }
        return from(currentUser.getIdToken()); // Folosește `from` pentru a converti Promise-ul
    }

    // Login folosind Firebase - METODA CORECTATĂ
    login(credentials: LoginCredentials): Observable<User> {
        // Trebuie să returnezi Observable-ul creat de 'from' și să aplici operatorii cu 'pipe'
        return from(signInWithEmailAndPassword(this.auth, credentials.email, credentials.password)).pipe(
            map(userCredential => userCredential.user), // Extrage obiectul User din UserCredential
            tap((user) => { // Folosește tap pentru side-effects precum navigarea
                console.log('Firebase Login successful for:', user.email);
                this.router.navigate(['/dashboard']); // Navighează la dashboard după login
            }),
            catchError((error) => {
                console.error('Firebase Login Error:', error);
                // Poți trata diferite coduri de eroare Firebase aici (ex: 'auth/user-not-found', 'auth/wrong-password')
                // Poți arunca o eroare specifică sau returna un Observable de eroare
                throw new Error('Login failed: ' + error.message); // Aruncă eroarea mai departe pentru a fi prinsă în componentă
            })
        );
    }

    // Signup folosind Firebase
    signup(credentials: SignupCredentials): Observable<User> {
        return from(createUserWithEmailAndPassword(this.auth, credentials.email, credentials.password)).pipe(
            map(userCredential => userCredential.user),
            // Aici ai putea dori să faci un apel suplimentar la backend-ul tău
            // pentru a crea înregistrarea în baza de date locală (dacă e necesar)
            // sau să setezi roluri inițiale (printr-un Cloud Function care ascultă la creare user)
            // ex: switchMap(user => this.syncUserWithBackend(user))
            tap((user) => {
                console.log('Firebase Signup successful for:', user.email);
                // Poate dorești să navighezi la login sau direct la dashboard
                this.router.navigate(['/dashboard']);
            }),
            catchError((error) => {
                console.error('Firebase Signup Error:', error);
                // Poți trata diferite coduri de eroare Firebase aici (ex: 'auth/email-already-in-use')
                throw new Error('Signup failed: ' + error.message);
            })
        );
    }

    // Logout folosind Firebase
    logout(): Observable<void> {
        return from(signOut(this.auth)).pipe(
            tap(() => {
                console.log('Firebase Logout successful');
                // Starea va fi actualizată automat de onAuthStateChanged
                this.router.navigate(['/login']); // Navighează la pagina de login
            }),
            catchError((error) => {
                console.error('Firebase Logout Error:', error);
                throw new Error('Logout failed: ' + error.message);
            })
        );
    }

    // Helper pentru a obține utilizatorul curent sincron (dacă e deja încărcat)
    getCurrentUserSnapshot(): AppUser | null {
        return this.currentUserSubject.value;
    }

    // Helper pentru a obține starea de login sincronă
    isLoggedInSnapshot(): boolean {
        return this.isLoggedInSubject.value;
    }

    // TODO: Adaugă o metodă pentru a prelua/actualiza rolurile utilizatorului dacă acestea
    // nu sunt setate automat ca custom claims la crearea contului Firebase
    // ex: fetchUserRoles(userId: string): Observable<Role[]> { ... }
    // Aceasta ar necesita probabil un apel la backend-ul tău.
}