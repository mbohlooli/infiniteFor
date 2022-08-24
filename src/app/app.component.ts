import { Component, ElementRef, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  data = [1];

  constructor() {
    for (let i = 0; i < 10000; i++) {
      this.data.push(i + 2);
    }
  }

  addItem() {
    this.data.push(this.data.length + 1);
  }

  removeData(item: any) {
    this.data.splice(this.data.indexOf(item), 1);
  }

  changeData(index: any) {
    this.data[index] = 12;
  }
}
