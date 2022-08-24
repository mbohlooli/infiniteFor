import {
  Directive,
  TemplateRef,
  HostListener,
  Input,
  ViewContainerRef,
  AfterViewInit,
  DoCheck,
  IterableDiffer,
  IterableDiffers,
  OnChanges,
  SimpleChanges,
  IterableChanges,
  ElementRef,
  OnInit,
  ViewRef,
  EmbeddedViewRef
} from '@angular/core';
import { InfiniteListComponent } from './infinite-list/infinite-list.component';

@Directive({
  selector: '[infiniteFor][infiniteForOf]'
})
export class InfiniteForDirective<T> implements DoCheck, OnChanges, AfterViewInit, OnInit {
  @Input('infiniteForOf') data: T[] = [];
  @Input('containerHeight') containerHeight: number = 0;

  private _differ: IterableDiffer<T> | undefined;
  private _displayedData: T[] = [];
  private _firstIndex = 0;
  private _lastIndex = 0;

  constructor(
    private _infinteList: InfiniteListComponent,
    private _viewContainer: ViewContainerRef,
    private _template: TemplateRef<any>,
    private _differs: IterableDiffers
  ) { }

  ngOnChanges(changes: SimpleChanges) {
    if (!('data' in changes)) return;

    const value = changes['data'].currentValue;
    if (this._differ || !value) return;

    this._differ = this._differs.find(value).create();
  }

  ngOnInit(): void {
    this._infinteList.scrollPosition.subscribe((scrollTop: any) => {
      const { width, height } = this._infinteList.measure();
      this._firstIndex = Math.floor(scrollTop / this._infinteList.rowHeight);
      this._lastIndex = Math.ceil(height / this._infinteList.rowHeight) + this._firstIndex;
    });
  }

  ngAfterViewInit() {
    const { width, height } = this._infinteList.measure();
    let lastIndex = Math.ceil(height / this._infinteList.rowHeight);
    // this._displayedData = this.data.slice(0, lastIndex);
    this._displayedData = this.data;
  }

  ngDoCheck() {
    if (!this._differ) return;
    const changes = this._differ.diff(this._displayedData);
    if (changes) this.applyChanges(changes);
  }

  applyChanges(changes: IterableChanges<T> | null | undefined) {
    this._displayedData = [];
    changes?.forEachOperation((item, previousIndex, currentIndex) => {
      if (item.previousIndex == null) {
        if (currentIndex == null) return;
        this._displayedData.splice(currentIndex, 0, item.item);
      } else if (currentIndex == null) {
        if (previousIndex == null) return;
        this._displayedData.splice(previousIndex, 1);
      } else {
        if (currentIndex == null || previousIndex == null) return;
        this._displayedData.splice(currentIndex, 0, this._displayedData.splice(previousIndex, 1)[0]);
      }
    });

    this.requestLayout();
  }

  requestLayout() {
    for (let i = this._firstIndex; i < this._lastIndex; i++) {
      this._viewContainer.detach(i);
      i--;
    }
    this.insertViews();
  }

  insertViews() {
    for (let i = 0; i < this._displayedData.length; i++) {
      let view = this.getView(i);
      // this.dispatchLayout(i, view, false);
      // let view = this._template.createEmbeddedView({ $implicit: this._displayedData[i] });
      this._viewContainer.insert(view);
    }
  }

  getView(index: number) {
    return this._template.createEmbeddedView({ $implicit: this._displayedData[index] });
  }

  private applyStyles(viewElement: HTMLElement, y: number) {
    const { width, height } = this._infinteList.measure();
    viewElement.style.transform = `translate3d(0, ${y}px, 0)`;
    viewElement.style.webkitTransform = `translate3d(0, ${y}px, 0)`;
    viewElement.style.width = `${width}px`;
    viewElement.style.height = `${this._infinteList.rowHeight}px`;
    viewElement.style.position = 'absolute';
  }

  dispatchLayout(position: number, view: ViewRef, addBefore: boolean) {
    let startPositionY = position * this._infinteList.rowHeight;
    this.applyStyles((view as EmbeddedViewRef<any>).rootNodes[0], startPositionY);
    if (addBefore)
      this._viewContainer.insert(view, 0);
    else
      this._viewContainer.insert(view);
    view.reattach();
  }
}
