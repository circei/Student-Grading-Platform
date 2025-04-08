import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { AdminComponent } from './admin/admin.component';
import { TeacherDashboardComponent } from './teacher/teacher-dashboard/teacher-dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'teacher-dashborad', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'teacher-dashborad', component: TeacherDashboardComponent },
];
