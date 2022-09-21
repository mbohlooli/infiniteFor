import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BehkhaanInfiniteScrollDirective } from './infinite-scroll.directive';
import { InfiniteListComponent } from './infinite-list/infinite-list.component';

@NgModule({
  declarations: [
    AppComponent,
    BehkhaanInfiniteScrollDirective,
    InfiniteListComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
