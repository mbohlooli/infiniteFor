import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecyclerViewComponent } from './recycler-view/recycler-view.component';
import { InfiniteForOfDirective } from './infinite-for-of.directive';



@NgModule({
  declarations: [
    RecyclerViewComponent,
    InfiniteForOfDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    RecyclerViewComponent,
    InfiniteForOfDirective
  ],
})
export class ScrollModule { }
