import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Grade } from '../../database/models/grade.model';
import { Course } from '../../database/models/course.model';
import { CourseProgress } from '../../database/models/courseProgress.model';

@Component({
  selector: 'app-progress-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './progress-view.component.html',
  styleUrls: ['./progress-view.component.css']
})
export class ProgressViewComponent implements OnInit {
  // Date dummy - acestea ar trebui să vină de la API în mod normal
  student = {
    name: 'Maria Popescu',
    specialization: 'Informatică',
    year: 2
  };

  grades: Grade[] = [
    { id: 1, course: 'Programare Avansată', value: 9.5, date: new Date('2024-03-15'), studentName: 'Maria Popescu' },
    { id: 2, course: 'Baze de Date', value: 8.0, date: new Date('2024-03-10'), studentName: 'Maria Popescu' },
    { id: 3, course: 'Algoritmi', value: 7.5, date: new Date('2024-02-28'), studentName: 'Maria Popescu' },
    { id: 4, course: 'Structuri de Date', value: 10.0, date: new Date('2024-03-20'), studentName: 'Maria Popescu' },
    { id: 5, course: 'Programare Avansată', value: 8.8, date: new Date('2024-04-01'), studentName: 'Maria Popescu' },
    { id: 6, course: 'Baze de Date', value: 7.0, date: new Date('2024-04-05'), studentName: 'Maria Popescu' },
    { id: 7, course: 'Algoritmi', value: 9.0, date: new Date('2024-04-10'), studentName: 'Maria Popescu' },
    { id: 8, course: 'Programare Web', value: 8.5, date: new Date('2024-04-12'), studentName: 'Maria Popescu' } // Curs nou
  ];

  courses: Course[] = [
    { name: 'Programare Avansată', professor: 'Prof. Ionescu', credits: 6 },
    { name: 'Baze de Date', professor: 'Prof. Popescu', credits: 5 },
    { name: 'Algoritmi', professor: 'Prof. Georgescu', credits: 4 },
    { name: 'Structuri de Date', professor: 'Prof. Andreescu', credits: 5 },
    { name: 'Programare Web', professor: 'Prof. Diaconu', credits: 5 }
  ];

  progressData: CourseProgress[] = [];
  overallAverage: number | null = null;
  totalCreditsEarned: number = 0;

  evaluatedCoursesCount: number = 0;
  totalCoursesCount: number = 0;

  ngOnInit(): void {
    this.calculateProgress();
  }

  calculateProgress(): void {
    const gradesByCourse: { [key: string]: Grade[] } = {};

    for (const grade of this.grades) {
      if (!gradesByCourse[grade.course]) {
        gradesByCourse[grade.course] = [];
      }
      gradesByCourse[grade.course].push(grade);
    }

    this.progressData = this.courses.map(course => {
       const courseGrades = gradesByCourse[course.name] || [];
      let sum = 0;
      let average: number | null = null;

      if (courseGrades.length > 0) {
        sum = courseGrades.reduce((acc, grade) => acc + grade.value, 0);
        average = parseFloat((sum / courseGrades.length).toFixed(2));
      }

      return {
        courseName: course.name,
        average: average,
        credits: course.credits,
        gradesCount: courseGrades.length
      };
    });

    const coursesWithAverage = this.progressData.filter(p => p.average !== null);
    if (coursesWithAverage.length > 0) {
        const totalAverageSum = coursesWithAverage.reduce((acc, p) => acc + p.average!, 0);
        this.overallAverage = parseFloat((totalAverageSum / coursesWithAverage.length).toFixed(2));
    } else {
        this.overallAverage = null;
    }


     this.totalCreditsEarned = this.progressData
        .filter(p => p.average !== null && p.average >= 5)
        .reduce((acc, p) => acc + p.credits, 0);

    this.evaluatedCoursesCount = this.progressData.filter(p => p.gradesCount > 0).length;
    this.totalCoursesCount = this.courses.length;
  }

   getAverageClass(average: number | null): string {
    if (average === null) return 'average-na';
    if (average >= 5) return 'average-pass';
    return 'average-fail';
   }
}