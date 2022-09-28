import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'scroll';
  newScrollPosition = 0;

  items: number[] = [];

  constructor() {
    for (let i = 0; i < 1000; i++)
      this.items.push(i);
  }

  getHeight(index: number) {
    if (index % 2 == 0) return 50;
    return 130;
  }

  log(x: any) {
    // console.log(x);
  }
}
