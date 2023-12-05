import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DrawingBoardComponent } from './drawing-board/drawing-board.component';


const routes: Routes = [
  {path:'draw',component:DrawingBoardComponent},
  {path:'**',redirectTo:'draw'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
