import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'scroll';
  newScrollPosition = 0;

  log(x: any) {
    console.log(x);
  }
}
