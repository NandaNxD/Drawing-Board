import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DrawingBoardComponent } from './drawing-board/drawing-board.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatIconModule} from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {MatTooltipModule} from '@angular/material/tooltip';



@NgModule({
  declarations: [
    AppComponent,
    DrawingBoardComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTooltipModule
  
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
