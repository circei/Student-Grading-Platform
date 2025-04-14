import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Grade } from '../../database/models/grade.model';


@Component({
  selector: 'app-grade-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './grade-view.component.html',
  styleUrls: ['./grade-view.component.css']
})
export class GradeViewComponent implements OnInit {
  allGrades: Grade[] = [
    // Dummy data updated (assignment removed)
    { id: 1, course: 'Programare Avansată', value: 9.5, date: new Date('2024-03-15'), studentName: 'Maria Popescu' },
    { id: 2, course: 'Baze de Date', value: 8.0, date: new Date('2024-03-10'), studentName: 'Maria Popescu' },
    { id: 3, course: 'Algoritmi', value: 7.5, date: new Date('2024-02-28'), studentName: 'Maria Popescu' },
    { id: 4, course: 'Structuri de Date', value: 10.0, date: new Date('2024-03-20'), studentName: 'Maria Popescu' },
    { id: 5, course: 'Programare Avansată', value: 8.8, date: new Date('2024-04-01'), studentName: 'Maria Popescu' },
    { id: 6, course: 'Baze de Date', value: 7.0, date: new Date('2024-04-05'), studentName: 'Maria Popescu' },
    { id: 7, course: 'Algoritmi', value: 9.0, date: new Date('2024-04-10'), studentName: 'Maria Popescu' }
  ];

  filteredGrades: Grade[] = [];
  courseFilter: string | null = null;
  studentName: string = 'Maria Popescu'; // Assuming a single student view for now

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.courseFilter = params.get('courseName');
      this.filterGrades();
    });
  }

  filterGrades(): void {
    if (this.courseFilter) {
      this.filteredGrades = this.allGrades.filter(
        grade => grade.course === this.courseFilter
      );
    } else {
      this.filteredGrades = this.allGrades;
    }
  }

  get averageGrade(): number | null {
      if (this.filteredGrades.length === 0) return null;
      const sum = this.filteredGrades.reduce((acc, grade) => acc + grade.value, 0);
      return parseFloat((sum / this.filteredGrades.length).toFixed(2));
  }
}