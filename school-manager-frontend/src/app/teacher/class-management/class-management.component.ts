import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Class {
  id: number;
  name: string;
  students: Student[];
}

interface Student {
  id: number;
  name: string;
  email: string;
  enrollmentDate: Date;
}

@Component({
  selector: 'app-class-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './class-management.component.html',
  styleUrls: ['./class-management.component.css']
})
export class ClassManagementComponent {
  newClassName = '';
  newStudent = {
    name: '',
    email: ''
  };
  
  // Date dummy
  classes: Class[] = [
    {
      id: 1,
      name: 'Clasa a IX-a A',
      students: [
        { id: 1, name: 'Maria Popescu', email: 'maria@example.com', enrollmentDate: new Date('2023-09-01') },
        { id: 2, name: 'Andrei Ionescu', email: 'andrei@example.com', enrollmentDate: new Date('2023-09-01') }
      ]
    },
    {
      id: 2,
      name: 'Clasa a X-a B',
      students: [
        { id: 3, name: 'Elena Vasile', email: 'elena@example.com', enrollmentDate: new Date('2023-09-01') }
      ]
    }
  ];

  // Adăugare clasă nouă
  addClass() {
    if (this.newClassName) {
      const newClass: Class = {
        id: this.classes.length + 1,
        name: this.newClassName,
        students: []
      };
      this.classes.push(newClass);
      this.newClassName = '';
    }
  }

  // Ștergere clasă
  deleteClass(classId: number) {
    this.classes = this.classes.filter(c => c.id !== classId);
  }

  // Adăugare student
  addStudent(classId: number) {
    const targetClass = this.classes.find(c => c.id === classId);
    if (targetClass && this.newStudent.name && this.newStudent.email) {
      targetClass.students.push({
        id: targetClass.students.length + 1,
        ...this.newStudent,
        enrollmentDate: new Date()
      });
      this.newStudent = { name: '', email: '' };
    }
  }

  // Ștergere student
  removeStudent(classId: number, studentId: number) {
    const targetClass = this.classes.find(c => c.id === classId);
    if (targetClass) {
      targetClass.students = targetClass.students.filter(s => s.id !== studentId);
    }
  }
}