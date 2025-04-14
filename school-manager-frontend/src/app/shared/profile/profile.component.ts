import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Student } from '../../database/models/student.model';
import { Professor } from '../../database/models/teacher.model';
import { Role } from '../../database/models/role.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  currentUserRole: Role = Role.Student;

  userProfile: Student | Professor | null = null;
  
  dummyStudent: Student = {
    id: 101,
    name: 'Alexandru Ionescu',
    email: 'alex.ionescu@stud.uni.ro',
    specialization: 'Calculatoare',
    year: 3
  };
  
  dummyProfessor: Professor = {
    id: 205,
    name: 'Prof. Dr. Elena Marinescu',
    email: 'elena.marinescu@prof.uni.ro',
    department: 'Automatică și Calculatoare',
    coursesTaught: ['Sisteme de Operare', 'Programare Paralelă', 'Inteligență Artificială']
  };

  public RoleEnum = Role;
  
  ngOnInit(): void {
    // Încarcă profilul corespunzător pe baza rolului simulat
    if (this.currentUserRole === Role.Student) {
      this.userProfile = this.dummyStudent;
    } else if (this.currentUserRole === Role.Teacher) {
      this.userProfile = this.dummyProfessor;
    } else {
      this.userProfile = null;
    }
  }

  isStudent(profile: Student | Professor | null): profile is Student {
    return profile !== null && 'specialization' in profile;
  }

  isProfessor(profile: Student | Professor | null): profile is Professor {
    return profile !== null && 'department' in profile;
  }
}