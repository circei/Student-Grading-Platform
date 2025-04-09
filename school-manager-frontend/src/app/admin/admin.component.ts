import { Component } from '@angular/core';
import { Student } from '../database/models/student.model';
import { Professor } from '../database/models/teacher.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  activeTab: string = 'studenti'; // Tab activ implicit
  students: Student[] = [];       // Listă studenți
  professors: Professor[] = [];   // Listă profesori

  newStudent: Student = {         // Date student nou
    name: '',
    email: '',
    specialization: ''
  };

  newProfessor: Professor = {     // Date profesor nou
    name: '',
    email: '',
    department: ''
  };

  // Schimbă tab-ul activ
  openTab(tabName: string): void {
    this.activeTab = tabName;
  }

  // Adaugă student
  addStudent(): void {
    if (this.newStudent.name && this.newStudent.email && this.newStudent.specialization) {
      this.students.push({...this.newStudent});
      this.newStudent = { name: '', email: '', specialization: '' }; // Resetare formular
    }
  }

  // Adaugă profesor
  addProfessor(): void {
    if (this.newProfessor.name && this.newProfessor.email && this.newProfessor.department) {
      this.professors.push({...this.newProfessor});
      this.newProfessor = { name: '', email: '', department: '' }; // Resetare formular
    }
  }

  // Șterge student
  deleteStudent(index: number): void {
    this.students.splice(index, 1);
  }

  // Șterge profesor
  deleteProfessor(index: number): void {
    this.professors.splice(index, 1);
  }
}
