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
    return (index % 2 == 0) ? 210 : 108;
  }

  log = () => {
    let initialLength = this.items.length;

    for (let i = 0; i < 10; i++)
      this.items.push(initialLength + i)

    console.log(this.items)
  }
}
