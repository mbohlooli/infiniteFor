import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { RecyclerViewComponent } from './recycler-view/recycler-view.component';

@NgModule({
  declarations: [
    AppComponent,
    RecyclerViewComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
