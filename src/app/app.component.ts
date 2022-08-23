import { Component, ElementRef, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  // data = Array(10000).fill(Math.random());
  data = [1, 2, 3, 4];

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
