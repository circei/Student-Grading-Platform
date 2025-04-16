import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { authGuard } from './guards/auth.guard';
import { SignupComponent } from './auth/signup/signup.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent }, // Adaugă ruta de signup

  // Rute protejate
  {
    path: 'dashboard',
    // component: StudentDashboardComponent, // Sau TeacherDashboardComponent, sau un wrapper
    loadComponent: () => import('./student/student-dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent), // Exemplu lazy loading
    canActivate: [authGuard]
  },
   {
     path: 'profile',
     loadComponent: () => import('./shared/profile/profile.component').then(m => m.ProfileComponent),
     canActivate: [authGuard]
   },

  {
    path: 'grade-view',
    loadComponent: () => import('./student/grade-view/grade-view.component').then(m => m.GradeViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'progress-view',
    loadComponent: () => import('./student/progress-view/progress-view.component').then(m => m.ProgressViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'grade-management',
    loadComponent: () => import('./teacher/grade-management/grade-management.component').then(m => m.GradeManagementComponent),
    canActivate: [authGuard]
  },
  {
    path: 'class-management',
    loadComponent: () => import('./teacher/class-management/class-management.component').then(m => m.ClassManagementComponent),
    canActivate: [authGuard]
  },
  {
    path: 'teacher-dashboard',
    loadComponent: () => import('./teacher/teacher-dashboard/teacher-dashboard.component').then(m => m.TeacherDashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard]
  },
  // Redirecționări
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }, // Pagina principală (va fi protejată de guard)
  { path: '**', redirectTo: '/dashboard' } // Sau o pagină 404
];
