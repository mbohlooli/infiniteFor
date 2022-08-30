import { AfterViewInit, Component, ElementRef, EmbeddedViewRef, HostListener, OnInit, Renderer2, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  //TODO: refactor (remove unused properties)
  //TODO: transform into a reusable directive
  @ViewChild('viewport') viewport!: ElementRef;
  @ViewChild('listHolder', { static: true }) listHolder!: ElementRef;
  @ViewChild('scrollContainer', { static: true, read: ViewContainerRef }) scrollContainer!: ViewContainerRef;
  @ViewChild('listItem') listItem!: TemplateRef<any>;

  items: number[] = [];
  divs: any[] = [];
  totalPadding: number = 0;
  paddingBottom: number = 0;
  paddingTop: number = 0;
  rowHeight: number = 200;
  viewportHeight: number = 500;
  previousStartIndex = 0;
  previousEndIndex = Math.ceil(500 / this.rowHeight);
  map = new Map();

  constructor(private renderer: Renderer2) {
    for (let i = 0; i < 1000; i++)
      this.items.push(i);
    this.paddingBottom = this.totalPadding = (this.items.length - 3) * this.rowHeight;
  }

  ngAfterViewInit() {
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    for (let i = this.previousStartIndex; i < this.previousEndIndex; i++) {
      let view = this.listItem.createEmbeddedView({});
      view.rootNodes[0].style.transform = `translate3d(0, ${i * this.rowHeight}px, 0)`;
      this.scrollContainer.insert(view);
      this.map.set(i, view);
    }
  }

  onScroll() {
    const scrollTop = this.viewport?.nativeElement.scrollTop;
    if (!scrollTop) return;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
    let startIndex = Math.floor(scrollTop / this.rowHeight);
    let endIndex = startIndex + Math.ceil((500 + this.paddingTop - startIndex * this.rowHeight) / this.rowHeight);
    console.log(startIndex, endIndex);

    for (let i = 0; i < this.scrollContainer.length; i++) {
      this.scrollContainer.detach(i);
    }

    for (let i = startIndex; i < Math.min(endIndex + 5, this.items.length); i++) {
      if (!this.map.has(i)) {
        let view = this.listItem.createEmbeddedView({});
        view.rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
        this.scrollContainer.insert(view);
        this.map.set(i, view);
        view.reattach();
      } else {
        let view = this.map.get(i);
        view.rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
        this.scrollContainer.insert(view);
      }
    }

    this.renderer.setStyle(this.listHolder.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    this.previousStartIndex = startIndex;
    this.previousEndIndex = endIndex;
  }
}
