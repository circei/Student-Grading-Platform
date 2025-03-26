import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';

export const routes: Routes = [
    {path: '', redirectTo: 'auth', pathMatch: 'full'},
    { path: 'auth', component: AuthComponent },
    {path: 'forgot-password', component: ForgotPasswordComponent},
];
