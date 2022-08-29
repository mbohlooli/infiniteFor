import { Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  //TODO: refactor (remove unused properties)
  //TODO: transform into a reusable directive
  @ViewChild('viewport') viewport: ElementRef | undefined;
  @ViewChild('scrollContainer', { static: true, read: ViewContainerRef }) scrollContainer: ViewContainerRef | undefined;

  items: number[] = [];
  divs: any[] = [];
  totalPadding: number = 0;
  paddingBottom: number = 0;
  paddingTop: number = 0;
  rowHeight: number = 200;
  viewportHeight: number = 500;
  previousStartIndex = 0;
  previousEndIndex = Math.ceil(500 / this.rowHeight);

  constructor(private renderer: Renderer2) {
    for (let i = 0; i < 1000; i++)
      this.items.push(i);
    this.paddingBottom = this.totalPadding = this.items.length * this.rowHeight;
  }

  ngOnInit() {
    this.renderer.setStyle(this.scrollContainer?.element?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.scrollContainer?.element?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    for (let i = 0; i < this.items.length; i++) {
      let div = this.renderer.createElement("div");
      this.renderer.setStyle(div, 'height', `${this.rowHeight}px`);
      this.renderer.setStyle(div, 'width', `100%`);
      this.renderer.setStyle(div, 'border-bottom', '1px solid blue')
      this.renderer.setStyle(div, 'position', 'absolute');
      this.renderer.appendChild(div, this.renderer.createText(`${i}`));
      this.divs.push(div);
    }

    for (let i = this.previousStartIndex; i < this.previousEndIndex; i++) {
      this.renderer.setStyle(this.divs[i], 'transform', `translate3d(0, ${this.rowHeight * i}px, 0)`);
      this.renderer.appendChild(this.scrollContainer?.element.nativeElement, this.divs[i]);
    }
  }

  onScroll() {
    const scrollTop = this.viewport?.nativeElement.scrollTop;
    console.log('scrollTop', scrollTop);
    if (!scrollTop) return;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
    let startIndex = Math.floor(scrollTop / this.rowHeight);
    let endIndex = startIndex + Math.ceil((500 + this.paddingTop - startIndex * this.rowHeight) / this.rowHeight);
    console.log(startIndex, endIndex);

    for (let i = this.previousStartIndex; i < this.previousEndIndex; i++) {
      this.renderer.removeChild(this.scrollContainer?.element.nativeElement, this.divs[i]);
    }

    for (let i = startIndex; i < Math.min(endIndex + 5, this.items.length); i++) {
      this.renderer.setStyle(this.divs[i], 'transform', `translate3d(0, ${this.rowHeight * (i - startIndex) - (scrollTop % this.rowHeight)}px, 0)`);
      // this.scrollContainer?.insert(this.divs[i]);
      this.renderer.appendChild(this.scrollContainer?.element.nativeElement, this.divs[i]);
    }

    this.renderer.setStyle(this.scrollContainer?.element.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.scrollContainer?.element.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    this.previousStartIndex = startIndex;
    this.previousEndIndex = endIndex;
  }
}
