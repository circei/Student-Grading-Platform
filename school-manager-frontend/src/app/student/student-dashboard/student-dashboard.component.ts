import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Grade {
  id: number;
  course: string;
  value: number;
  date: Date;
  assignment?: string;
}

interface Course {
  name: string;
  professor: string;
  credits: number;
  averageGrade?: number;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent {
  // Date dummy - în practică acestea vor veni de la API
  student = {
    name: 'Maria Popescu',
    email: 'maria@stud.uni.ro',
    specialization: 'Informatică',
    year: 2
  };

  grades: Grade[] = [
    { id: 1, course: 'Programare Avansată', value: 9.5, date: new Date('2024-03-15'), assignment: 'Proiect 1' },
    { id: 2, course: 'Baze de Date', value: 8.0, date: new Date('2024-03-10') },
    { id: 3, course: 'Algoritmi', value: 7.5, date: new Date('2024-02-28'), assignment: 'Test Midterm' }
  ];

  courses: Course[] = [
    { name: 'Programare Avansată', professor: 'Prof. Ionescu', credits: 6, averageGrade: 8.7 },
    { name: 'Baze de Date', professor: 'Prof. Popescu', credits: 5, averageGrade: 7.2 },
    { name: 'Algoritmi', professor: 'Prof. Georgescu', credits: 4 }
  ];

  // Calculează media generală
  get overallAverage(): number | null {
    if (this.grades.length === 0) return null;
    const sum = this.grades.reduce((acc, grade) => acc + grade.value, 0);
    return parseFloat((sum / this.grades.length).toFixed(2));
  }

  // Grupează notele pe cursuri
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