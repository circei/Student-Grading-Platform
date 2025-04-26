import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService, AppUser } from '../../../services/auth.service'; // Asigură-te că ai calea corectă
import { Role } from '../../../database/models/role.model'; // Asigură-te că ai calea corectă

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule], // Nu uita CommonModule pentru pipe-ul async și directive
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {

 
  public authService = inject(AuthService);

  // Expune enum-ul Role pentru a fi folosit în template
  public RoleEnum = Role;

  constructor() { }

  ngOnInit(): void {
    
    // Serviciul AuthService gestionează deja actualizarea stării interne.
  }

  ngOnDestroy(): void {
    // Nu mai este necesară anularea subscripției aici.
  }

  logout(): void {
    // Apelează metoda logout din serviciu. Nu e nevoie de subscribe neapărat aici
    // dacă nu vrei să faci ceva specific DUPĂ ce logout-ul s-a terminat.
    this.authService.logout().subscribe({
        // next/error/complete pot fi goale dacă navigarea se face în service
        // error: (err) => console.error("Logout error in header component", err)
    });
  }
}