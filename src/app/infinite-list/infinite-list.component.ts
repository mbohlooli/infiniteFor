import { AfterViewInit, Component, ElementRef, EmbeddedViewRef, OnInit, Renderer2, TemplateRef, ViewChild, ViewContainerRef, ViewRef } from '@angular/core';

@Component({
  selector: 'app-infinite-list',
  templateUrl: './infinite-list.component.html',
  styleUrls: ['./infinite-list.component.css']
})
export class InfiniteListComponent {
  //TODO: refactor (remove unused properties)
  //TODO: transform into a reusable directive
  @ViewChild('v') viewport!: ElementRef;
  @ViewChild('l', { static: true }) listHolder!: ElementRef;
  @ViewChild('s', { static: true, read: ViewContainerRef }) scrollContainer!: ViewContainerRef;
  @ViewChild('li') listItem!: TemplateRef<any>;

  items: number[] = [];
  totalPadding: number = 0;
  paddingBottom: number = 0;
  paddingTop: number = 0;
  rowHeight: number = 200;
  viewportHeight: number = 500;
  previousStartIndex = 0;
  previousEndIndex = Math.ceil(500 / this.rowHeight);
  map: Map<number, ViewRef> = new Map();
  loading: boolean = false;

  constructor(private renderer: Renderer2) {
    for (let i = 0; i < 1000; i++)
      this.items.push(i);
  }
}
