import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-teacher-dashboard',
  imports: [DatePipe],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.css'
})
export class TeacherDashboardComponent {
  public teacherName: string | undefined = 'John Doe';
  public classes: { id: number; name: string; studentCount: number }[] = [
    { id: 1, name: 'Math 101', studentCount: 25 },
    { id: 2, name: 'Physics 201', studentCount: 30 },
    { id: 3, name: 'Chemistry 301', studentCount: 20 }
  ];
  public recentGrades: { id: number; studentName: string; value: number; course: string, date: Date }[] = [
    { id: 1, studentName: 'Alice Johnson', value: 95, course: 'Math 101', date: new Date('2023-10-01') },
  ]
}
