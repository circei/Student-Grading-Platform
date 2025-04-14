import { Component, OnInit } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { RouterLink } from '@angular/router';
import { Class } from '../../database/models/class.model';
import { Grade } from '../../database/models/grade.model';
import { GradeTableComponent } from '../../shared/grade-table/grade-table.component'; 

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    GradeTableComponent 
  ],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css']
})
export class TeacherDashboardComponent implements OnInit {
  teacherName = 'Prof. Ionescu';

  classes: Class[] = [
    { id: 1, name: 'Clasa a IX-a A', studentCount: 25 },
    { id: 2, name: 'Clasa a X-a B', studentCount: 28 },
    { id: 3, name: 'Clasa a XI-a C', studentCount: 22 }
  ];

  recentGrades: Grade[] = [
    {
      id: 1,
      studentName: 'Maria Popescu',
      value: 9.5,
      course: 'Matematică',
      date: new Date('2024-03-15')
    },
    {
      id: 2,
      studentName: 'Andrei Vasile',
      value: 8.0,
      course: 'Fizică',
      date: new Date('2024-03-14')
    },
    {
      id: 3,
      studentName: 'Elena Dumitru',
      value: 10.0,
      course: 'Informatică',
      date: new Date('2024-03-13')
    },
     {
      id: 4,
      studentName: 'Ion Grigorescu',
      value: 7.0,
      course: 'Matematică',
      date: new Date('2024-03-16')
    }
  ];

  addNewClass() {
    const newClass: Class = {
      id: this.classes.length + 1,
      name: `Clasa nouă ${this.classes.length + 1}`,
      studentCount: 0
    };
    this.classes.push(newClass);
  }

  manageClass(classId: number) {
    console.log('Managing class with ID:', classId);
  }

  ngOnInit(): void {
    this.recentGrades.sort((a, b) => b.date.getTime() - a.date.getTime());

    this.teacherName = 'Prof. Ionescu'; 
 }
}