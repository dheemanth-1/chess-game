import { Component, inject, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { EngineService } from '../modules/computer-mode/engine.service';

@Component({
  selector: 'app-depth-select',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './depth-select.component.html',
  styles: '',
})
export class DepthSelectComponent {
  private engineService = inject(EngineService);

  // Link the template's initial value to the service's current depth
  selected = this.engineService.currentDepth;

  onDepthChange(event: MatSelectChange) {
    // Update the service state directly when the user selects a new option
    this.engineService.currentDepth.set(event.value);
    console.log(
      'Engine depth changed to : ',
      this.engineService.currentDepth(),
    );
  }
}
