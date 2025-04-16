import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { authGuard } from './guards/auth.guard';
import { SignupComponent } from './auth/signup/signup.component';
import { roleGuard } from './guards/role.guard';
import { Role } from './database/models/role.model';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent }, // Adaugă ruta de signup

  {
    path: 'student-dashboard',
    // component: StudentDashboardComponent,
    loadComponent: () => import('./student/student-dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent),
    canActivate: [authGuard, roleGuard], // Aplică ambele guard-uri
    data: { allowedRoles: [Role.Student] } // Specifică rolurile permise aici
  },
  {
    path: 'teacher-dashboard',
   // component: TeacherDashboardComponent,
   loadComponent: () => import('./teacher/teacher-dashboard/teacher-dashboard.component').then(m => m.TeacherDashboardComponent),
    canActivate: [authGuard, roleGuard],
    data: { allowedRoles: [Role.Teacher, Role.Admin] } // Profesorii și Adminii pot accesa
  },
   {
    path: 'grade-management',
    // component: GradeManagementComponent,
    loadComponent: () => import('./teacher/grade-management/grade-management.component').then(m => m.GradeManagementComponent),
    canActivate: [authGuard, roleGuard],
    data: { allowedRoles: [Role.Teacher, Role.Admin] }
  },
  // Redirecționări
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Redirecționează la login default
  { path: '**', redirectTo: '/login' } 
];
