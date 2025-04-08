import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { AdminComponent } from './admin/admin.component';

export const routes: Routes = [
    {path: '', redirectTo: 'admin', pathMatch: 'full'},
    { path: 'auth', component: AuthComponent },
    {path: 'forgot-password', component: ForgotPasswordComponent},
    { path: 'admin', component: AdminComponent}
];
