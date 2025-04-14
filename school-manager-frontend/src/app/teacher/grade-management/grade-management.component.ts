// grade-management.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Grade } from '../../database/models/grade.model';
import { Student } from '../../database/models/student.model';


@Component({
  selector: 'app-grade-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grade-management.component.html',
  styleUrls: ['./grade-management.component.css']
})
export class GradeManagementComponent {
  newGrade: Grade = {
    id: 0,
    studentName: '',
    value: 0,
    course: '',
    date: new Date()
  };

  // Date dummy
  students: Student[] = [
    {
      name: 'Maria Popescu', email: 'maria@uni.ro', specialization: 'Informatică',
      id: 0,
      year: 0
    },
    {
      name: 'Andrei Ionescu', email: 'andrei@uni.ro', specialization: 'Matematică',
      id: 0,
      year: 0
    }
  ];

  grades: Grade[] = [
    {
      id: 1,
      studentName: 'Maria Popescu',
      value: 9.5,
      course: 'Programare Avansată',
      date: new Date('2024-03-15')
    },
    {
      id: 2,
      studentName: 'Andrei Ionescu',
      value: 8.0,
      course: 'Algoritmi',
      date: new Date('2024-03-14')
    }
  ];

  courses: string[] = ['Programare Avansată', 'Algoritmi', 'Baze de Date'];

  addGrade() {
    if (this.isValidGrade()) {
      const newGrade: Grade = {
        ...this.newGrade,
        id: this.grades.length + 1,
        date: new Date()
      };
      this.grades = [newGrade, ...this.grades];
      this.resetForm();
    }
  }

  deleteGrade(gradeId: number) {
    this.grades = this.grades.filter(g => g.id !== gradeId);
  }

 isValidGrade(): boolean {
    return !!this.newGrade.studentName &&
           !!this.newGrade.course &&
           this.newGrade.value >= 1 &&
           this.newGrade.value <= 10;
  }

  private resetForm() {
    this.newGrade = {
      id: 0,
      studentName: '',
      value: 0,
      course: '',
      date: new Date()
    };
  }
}