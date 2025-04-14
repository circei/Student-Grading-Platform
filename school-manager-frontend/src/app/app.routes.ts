import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { AdminComponent } from './admin/admin.component';
import { TeacherDashboardComponent } from './teacher/teacher-dashboard/teacher-dashboard.component';
import { ClassManagementComponent } from './teacher/class-management/class-management.component';
import { GradeManagementComponent } from './teacher/grade-management/grade-management.component';
import { StudentDashboardComponent } from './student/student-dashboard/student-dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'student-dashboard', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'teacher-dashborad', component: TeacherDashboardComponent },
  { path: 'class-management', component: ClassManagementComponent},
  { path: 'grade-management', component: GradeManagementComponent },
  {path: 'student-dashboard', component: StudentDashboardComponent}, // Adăugați ruta pentru StudentDashboardComponent
];
