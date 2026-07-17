import {Component} from '@angular/core';
import {RailDashboardComponent} from './components/rail-dashboard/rail-dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RailDashboardComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {}
