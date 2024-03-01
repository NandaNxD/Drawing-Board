import { Component, Output } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-create-room',
  templateUrl: './create-room.component.html',
  styleUrls: ['./create-room.component.scss']
})
export class CreateRoomComponent {
  @Output()
  createRoom:Subject<string>=new Subject();

  name:string=''

  requestCreateRoom(){
    this.createRoom.next(this.name);
  }

}