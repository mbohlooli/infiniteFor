import { AfterViewInit, Component, ElementRef, EmbeddedViewRef, OnInit, Renderer2, TemplateRef, ViewChild, ViewContainerRef, ViewRef } from '@angular/core';
import { WindowScrollingService } from '../services/window-scrolling.service';

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
  @ViewChild('li') listItem!: TemplateRef<any>;

  items: number[] = [];
  totalPadding: number = 0;
  paddingBottom: number = 0;
  paddingTop: number = 0;
  rowHeight: number = 200;
  // TODO: make this dynamic
  viewportHeight: number = 611;
  previousStartIndex = 0;
  previousEndIndex = Math.ceil(500 / this.rowHeight);
  map: Map<number, ViewRef> = new Map();
  loading: boolean = false;

  constructor(private windowScrollingService: WindowScrollingService) {
    for (let i = 0; i < 1000; i++)
      this.items.push(i);
  }

  raiseScroll() {
    this.windowScrollingService.scrollY.next(this.viewport.nativeElement.scrollTop);
  }

  getHeight(index: number): number {
    return Math.random() * 150 + 40;
  }

  addItems() {
    for (let i = 0; i < 10; i++) {
      this.items.push(i);
    }
  }
}
