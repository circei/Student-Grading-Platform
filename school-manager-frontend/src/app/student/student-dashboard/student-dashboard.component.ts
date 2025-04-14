import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GradeTableComponent } from "../../shared/grade-table/grade-table.component";


import { Grade } from '../../database/models/grade.model';
import { Course } from '../../database/models/course.model';


@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, GradeTableComponent],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent {
  student = {
    id: 101, 
    name: 'Maria Popescu',
    email: 'maria@stud.uni.ro',
    specialization: 'Informatică',
    year: 2
  };

  grades: Grade[] = [
    { id: 1, studentName: this.student.name, course: 'Programare Avansată', value: 9.5, date: new Date('2024-03-15') }, 
    { id: 2, studentName: this.student.name, course: 'Baze de Date', value: 8.0, date: new Date('2024-03-10') },
    { id: 3, studentName: this.student.name, course: 'Algoritmi', value: 7.5, date: new Date('2024-02-28') }
  ];

  courses: Course[] = [
    { name: 'Programare Avansată', professor: 'Prof. Ionescu', credits: 6  },
    { name: 'Baze de Date', professor: 'Prof. Popescu', credits: 5 },
    { name: 'Algoritmi', professor: 'Prof. Georgescu', credits: 4 }
  ];

  get overallAverage(): number | null {
    if (this.grades.length === 0) return null;
    const sum = this.grades.reduce((acc, grade) => acc + grade.value, 0);
    return parseFloat((sum / this.grades.length).toFixed(2));
  }

  get gradesByCourse() {
    return this.grades.reduce((acc: {[key: string]: Grade[]}, grade) => {
      if (!acc[grade.course]) {
        acc[grade.course] = [];
      }
      acc[grade.course].push(grade);
      return acc;
    }, {});
  }
}