import { AfterViewInit, Directive, ElementRef, EmbeddedViewRef, HostListener, Input, OnInit, Renderer2, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';

@Directive({
  selector: '[infiniteScroll]'
})
export class InfiniteScrollDirective implements OnInit, AfterViewInit {
  @Input('viewport') viewport!: ElementRef;
  @Input('listHolder') listHolder!: ElementRef;
  @Input('scrollContainer') scrollContainer!: ViewContainerRef;
  @Input('listItem') listItem!: TemplateRef<any>;
  @Input('items') items: number[] = [];
  @Input('rowHeight') rowHeight: number = 200;
  @Input('viewportHeight') viewportHeight: number = 500;

  totalPadding: number = 0;
  paddingBottom: number = 0;
  paddingTop: number = 0;
  previousStartIndex = 0;
  previousEndIndex = Math.ceil(500 / this.rowHeight);
  map: Map<number, ViewRef> = new Map();
  loading: boolean = false;

  constructor(private renderer: Renderer2) {
    console.log('hello');

  }

  ngOnInit() {
    this.paddingBottom = this.totalPadding = (this.items.length - 3) * this.rowHeight;

  }

  ngAfterViewInit() {
    console.log(this.totalPadding)
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    for (let i = this.previousStartIndex; i < this.previousEndIndex; i++) {
      let view = this.listItem.createEmbeddedView({});
      view.rootNodes[0].style.transform = `translate3d(0, ${i * this.rowHeight}px, 0)`;
      this.scrollContainer.insert(view);
      this.map.set(i, view);
    }
  }

  @HostListener('scroll') onScroll() {
    console.log('scrolled');
    const scrollTop = this.viewport?.nativeElement.scrollTop;
    if (!scrollTop) return;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
    let startIndex = Math.floor(scrollTop / this.rowHeight);
    let endIndex = startIndex + Math.ceil((500 + this.paddingTop - startIndex * this.rowHeight) / this.rowHeight);
    console.log(startIndex, endIndex);

    if (endIndex >= this.items.length && !this.loading) {
      console.log('loading more items...');
      this.loading = true;
      return;
    }

    for (let i = 0; i < this.scrollContainer.length; i++)
      this.scrollContainer.detach(i);

    for (let i = startIndex; i < Math.min(endIndex + 5, this.items.length); i++) {
      if (!this.map.has(i)) {
        let view = this.listItem.createEmbeddedView({});
        view.rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
        this.scrollContainer.insert(view);
        this.map.set(i, view);
        view.reattach();
      } else {
        let view = this.map.get(i);
        (view as EmbeddedViewRef<any>).rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
        if (view)
          this.scrollContainer.insert(view);
      }
    }

    this.renderer.setStyle(this.listHolder.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    this.previousStartIndex = startIndex;
    this.previousEndIndex = endIndex;
  }
}
