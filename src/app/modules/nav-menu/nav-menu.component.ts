import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DepthSelectComponent } from '../../depth-select/depth-select.component';
import { MatDialog } from '@angular/material/dialog';
import { PlayAgainstComputerDialogComponent } from '../../play-against-computer-dialog/play-against-computer-dialog.component';
@Component({
  selector: 'app-nav-menu',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    DepthSelectComponent,
    RouterLink,
    RouterOutlet,
  ],
  templateUrl: './nav-menu.component.html',
  styleUrl: './nav-menu.component.css',
})
export class NavMenuComponent {
  constructor(private dialog: MatDialog) {}

  public playAgainstComputer(): void {
    this.dialog.open(PlayAgainstComputerDialogComponent);
  }
}
