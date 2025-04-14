import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { Grade } from '../../database/models/grade.model'; // Import modelul Grade

// Tip pentru a defini coloana de sortare și direcția
type SortColumn = keyof Grade | null;
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-grade-table',
  standalone: true,
  imports: [CommonModule], // Doar CommonModule este necesar aici
  templateUrl: './grade-table.component.html',
  styleUrls: ['./grade-table.component.css']
})
export class GradeTableComponent implements OnInit, OnChanges {

  // Input principal: Array-ul de note de afișat
  @Input() grades: Grade[] = [];
  // Input opțional: Controlează afișarea coloanei 'Student'
  @Input() showStudentNameColumn: boolean = true;
  // Input opțional: Mesaj afișat când nu există note
  @Input() noGradesMessage: string = 'Nu există note de afișat.';

  // Proprietăți interne pentru sortare
  currentSortColumn: SortColumn = 'date'; // Sortează inițial după dată
  currentSortDirection: SortDirection = 'desc'; // Descendent (cele mai noi primele)

  // Array intern pentru a nu modifica direct input-ul la sortare
  sortedGrades: Grade[] = [];

  ngOnInit(): void {
    // Sortează datele inițiale la încărcarea componentei
    this.sortData();
  }

  // Rulează când input-urile (ex: 'grades') se modifică
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['grades']) {
      // Dacă array-ul 'grades' primit se schimbă, resortează datele
      this.sortData();
    }
  }

  // Funcția apelată la click pe header-ul unei coloane
  sortTable(column: keyof Grade): void {
    if (this.currentSortColumn === column) {
      // Dacă se face click pe aceeași coloană, inversează direcția
      this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Dacă se face click pe altă coloană, setează coloana și direcția default (asc)
      this.currentSortColumn = column;
      this.currentSortDirection = 'asc';
    }
    this.sortData(); // Aplică sortarea
  }

  // Logica de sortare
  private sortData(): void {
    if (!this.currentSortColumn || !this.grades) {
        this.sortedGrades = [...this.grades]; // Copiază array-ul dacă nu se sortează
        return;
    }

    // Creează o copie a array-ului original pentru a nu-l modifica direct
    this.sortedGrades = [...this.grades].sort((a, b) => {
      const valA = a[this.currentSortColumn!];
      const valB = b[this.currentSortColumn!];

      let comparison = 0;

      // Compară valorile în funcție de tip
      if (valA === null || valA === undefined) comparison = -1;
      else if (valB === null || valB === undefined) comparison = 1;
      else if (valA < valB) comparison = -1;
      else if (valA > valB) comparison = 1;
      else comparison = 0;

      // Inversează rezultatul dacă direcția este descendentă
      return this.currentSortDirection === 'asc' ? comparison : comparison * -1;
    });
  }

  // Funcție helper pentru a afișa iconița de sortare corectă
  getSortIcon(column: keyof Grade): string {
    if (this.currentSortColumn !== column) {
      return 'unfold_more'; // Iconiță default (sortare inactivă)
    }
    return this.currentSortDirection === 'asc' ? 'expand_less' : 'expand_more';
  }
}