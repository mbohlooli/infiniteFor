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
  map = new Map();

  constructor(private renderer: Renderer2) {
    for (let i = 0; i < 1000; i++)
      this.items.push(i);
    this.paddingBottom = this.totalPadding = this.items.length * this.rowHeight;
  }
  //TODO: dont intialize all divs at first, initialize when scrolled
  //TODO: for removing stage use a hashmap, the divs get in hashmap when inserted to be uniquely identified
  ngOnInit() {
    this.renderer.setStyle(this.scrollContainer?.element?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.scrollContainer?.element?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    // for (let i = 0; i < this.items.length; i++) {
    //   let div = this.renderer.createElement("div");
    //   this.renderer.setStyle(div, 'height', `${this.rowHeight}px`);
    //   this.renderer.setStyle(div, 'width', `100%`);
    //   this.renderer.setStyle(div, 'border-bottom', '1px solid blue')
    //   this.renderer.setStyle(div, 'position', 'absolute');
    //   this.renderer.appendChild(div, this.renderer.createText(`${i}`));
    //   this.divs.push(div);
    // }

    for (let i = this.previousStartIndex; i < this.previousEndIndex; i++) {
      let div = this.renderer.createElement("div");
      this.renderer.setStyle(div, 'height', `${this.rowHeight}px`);
      this.renderer.setStyle(div, 'width', `100%`);
      this.renderer.setStyle(div, 'border-bottom', '1px solid blue')
      this.renderer.setStyle(div, 'position', 'absolute');
      this.renderer.appendChild(div, this.renderer.createText(`${i}`));
      this.renderer.setStyle(div, 'transform', `translate3d(0, ${i * this.rowHeight}px, 0)`);
      // this.scrollContainer?.insert(this.divs[i]);
      this.renderer.appendChild(this.scrollContainer?.element.nativeElement, div);
      this.map.set(i, div);
    }
  }

  onScroll() {
    const scrollTop = this.viewport?.nativeElement.scrollTop;
    const scrollTopMax = this.viewport?.nativeElement.scrollTopMax;
    if (!scrollTop) return;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
    let startIndex = Math.floor(scrollTop / this.rowHeight);
    let endIndex = startIndex + Math.ceil((500 + this.paddingTop - startIndex * this.rowHeight) / this.rowHeight);
    console.log(startIndex, endIndex);
    console.log(this.map)

    if (scrollTop == scrollTopMax) console.log('load more items!');
    for (let i = this.previousStartIndex; i < this.previousEndIndex; i++) {
      if (this.map.has(i)) {
        this.renderer.removeChild(this.scrollContainer?.element.nativeElement, this.map.get(i));
        // this.map.delete(i);
      }
    }

    for (let i = startIndex; i < Math.min(endIndex + 5, this.items.length); i++) {

      let div = this.renderer.createElement("div");
      this.renderer.setStyle(div, 'height', `${this.rowHeight}px`);
      this.renderer.setStyle(div, 'width', `100%`);
      this.renderer.setStyle(div, 'border-bottom', '1px solid blue')
      this.renderer.setStyle(div, 'position', 'absolute');
      this.renderer.appendChild(div, this.renderer.createText(`${i}`));
      this.renderer.setStyle(div, 'transform', `translate3d(0, ${this.rowHeight * (i - startIndex) - (scrollTop % this.rowHeight)}px, 0)`);
      // this.scrollContainer?.insert(this.divs[i]);
      this.renderer.appendChild(this.scrollContainer?.element.nativeElement, div);
      this.map.set(i, div);
    }

    this.renderer.setStyle(this.scrollContainer?.element.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.scrollContainer?.element.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    this.previousStartIndex = startIndex;
    this.previousEndIndex = endIndex;
  }
}
