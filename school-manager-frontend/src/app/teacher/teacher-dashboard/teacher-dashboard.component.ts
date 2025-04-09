import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Class } from '../../database/models/class.model';
import { Grade } from '../../database/models/grade.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-teacher-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.css'
})
export class TeacherDashboardComponent {
  teacherName = 'Prof. Ionescu';
  
  // Date dummy pentru clase
  classes: Class[] = [
    { id: 1, name: 'Clasa a IX-a A', studentCount: 25 },
    { id: 2, name: 'Clasa a X-a B', studentCount: 28 },
    { id: 3, name: 'Clasa a XI-a C', studentCount: 22 }
  ];

  // Date dummy pentru note
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
    }
  ];

  // Adăugare clasă nouă (dummy implementation)
  addNewClass() {
    const newClass: Class = {
      id: this.classes.length + 1,
      name: `Clasa nouă ${this.classes.length + 1}`,
      studentCount: 0
    };
    this.classes.push(newClass);
  }

  // Gestionează clasă (dummy implementation)
  manageClass(classId: number) {
    console.log('Managing class with ID:', classId);
    // Aici ar trebui să navighezi la o altă pagină/componentă
  }

  // Încărcare date inițiale (exemplu)
  ngOnInit() {
    // Simulează încărcarea datelor
    setTimeout(() => {
      this.teacherName = 'Prof. Ionescu';
    }, 500);
  }
}
