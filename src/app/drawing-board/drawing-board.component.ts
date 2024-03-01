import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { withNoHttpTransferCache } from '@angular/platform-browser';
import { fabric } from "fabric";
import { log } from 'fabric/fabric-impl';
import { v1 as uuid } from 'uuid'
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Database, Unsubscribe, getDatabase, onChildAdded, onChildChanged, onDisconnect, push, ref, set} from 'firebase/database';
import { FirebaseService } from '../services/firebase.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-drawing-board',
  templateUrl: './drawing-board.component.html',
  styleUrls: ['./drawing-board.component.scss']
})
export class DrawingBoardComponent implements OnInit,AfterViewInit,OnDestroy {

  constructor(private firebaseService:FirebaseService,private activatedRouter:ActivatedRoute,private router:Router){

    if(activatedRouter.snapshot.queryParams['roomId']){
      this.roomId=activatedRouter.snapshot.queryParams['roomId'];
    }

    this.firebaseApp=initializeApp(this.firebaseService.firebaseConfig);
    
    this.realtimeDb=getDatabase();

    if(this.roomId){
      this.setUserId();
      onDisconnect(ref(this.realtimeDb,`Whiteboard/${this.roomId}`)).set(null);
    }

    window.addEventListener('resize',()=>{
      this.resizeHandler();
    })
  }
  
  ngOnInit(): void {
   
  }

  ngAfterViewInit(): void {
    /**
     * Fabric Init
     */
    this.canvas=new fabric.Canvas('drawingBoard',{width:window.innerWidth*this.canvasScreenWidthPercentage,height:window.innerHeight*this.canvasScreenHeightPercentage,isDrawingMode:this.drawingMode,backgroundColor:'white',selection:false});
    /**
    * Free Drawing Brush settings
    */
    this.setFreeDrawingBrushSettings(this.selectedColor,this.rangeValue);
    // Handle Mouse Events on Fabric
    if(this.canvas){
      this.canvas.on('mouse:down',(event:fabric.IEvent<MouseEvent>)=>this.canvasMouseDownHandler(event));
      this.canvas.on('mouse:up',(event:fabric.IEvent<MouseEvent>)=>this.canvasMouseUpHandler(event));
      this.canvas.on('mouse:move',(event:fabric.IEvent<MouseEvent>)=>this.canvasMouseMoveHandler(event));

      if(this.roomId)
      this.listenToObjectEvents();

      if(this.roomId)
      this.listenToPeerChanges();

    }
  }

  
  ngOnDestroy(): void {
   this.unsubscribeSubscriptions();
  }

  userId:string='';
  roomId:string='';

  firebaseApp!:FirebaseApp;
  realtimeDb!:Database;

  objectAdditionUnsubscribe!:Unsubscribe;
  objectModifiedUnsubscribe!:Unsubscribe;
  objectRemovedUnsubscribe!:Unsubscribe;

  canvas!:fabric.Canvas;
  vpt:number[]=[]

  canvasBgImage!:fabric.Image;

  requiredKeys=['id','userId','key'];

  toolsList=[
    // {fontIcon:'back_hand', toolTipText:'hand', toolName:'hand',visibility:false},
    {fontIcon:'arrow_back', toolTipText:'Select', toolName:'select',visibility:true},
    {fontIcon:'edit', toolTipText:'Pencil',toolName:'pencil',visibility:true},
    {fontIcon:'title', toolTipText:'Text',toolName:'text',visibility:true},
    {fontIcon:'format_color_fill', toolTipText:'Fill Color',toolName:'fill_color',visibility:true},
    {fontIcon:'border_color', toolTipText:'Border Color',toolName:'border_color',visibility:true},
    {fontIcon:'rectangle', toolTipText:'Rectangle',toolName:'rectangle',visibility:true},
    {fontIcon:'circle', toolTipText:'Circle',toolName:'circle',visibility:true},
    {fontIcon:'delete', toolTipText:'Delete',toolName:'delete',visibility:true},
    {fontIcon:'upload', toolTipText:'Upload Background Image',toolName:'upload',visibility:false},
    {fontIcon:'download', toolTipText:'Download',toolName:'download',visibility:true},
    {fontIcon:'undo', toolTipText:'Undo',toolName:'undo',visibility:false},
    {fontIcon:'redo', toolTipText:'Redo',toolName:'redo',visibility:false},
    {fontIcon:'info', toolTipText:'Press Alt Key+Drag to move canvas around',toolName:'info',visibility:false}
  ]

  activeTool='select';
  drawingMode=false;
  colors=['red','green','purple','yellow','blue','white','black']

  lastPosX=0;
  lastPosY=0;

  /**
   * Size related variables
   */

  pencilRangeValue=20;
  pencilRangeMax=50;
  pencilRangeMin=10;

  textRangeValue=50;
  textRangeMax=100;
  textRangeMin=40;

  shapeRangeValue=20;
  shapeRangeMaxValue=50;
  shapeRangeMinValue=10;

  rangeMin=5;
  rangeMax=50;
  rangeValue=10;

  /**
   * Sub tool variables
   */
  rangeToolEnabled=false;
  colorsToolEnabled=false;

  selectedBorderColor='blue';
  selectedFillColor='blue';
  selectedColor='blue';

  /**
   * Shape related Variables
   */
  shapeMouseDownStartX=0;
  shapeMouseDownStartY=0;

  rectangleRef!: fabric.Rect;
  circleRef!:fabric.Circle;
  isMouseDown=false;

  canvasScreenWidthPercentage=100/100;
  canvasScreenHeightPercentage=87/100;


  setUserId(){
    this.userId=push(ref(this.realtimeDb,'Whiteboard')).key as string;
  }


  changeRoom(){
    this.unsubscribeSubscriptions();
    
    this.listenToObjectEvents();

    this.listenToPeerChanges();

  }


  listenToPeerChanges(){
    this.unsubscribeSubscriptions();

    this.objectAdditionUnsubscribe=onChildAdded(ref(this.realtimeDb,`Whiteboard/${this.roomId}/Added`),(snapshot)=>{
      if(snapshot.val().userId==this.userId)return;
      
      console.log(snapshot.val());

      fabric.util.enlivenObjects([snapshot.val()] as any[],(enlivenedObjects:any[])=>{
        if(enlivenedObjects[0].type=='path')
        enlivenedObjects[0].set('fill','rgba(0,0,0,0)')

        if(!enlivenedObjects[0].styles){
          enlivenedObjects[0].styles=[];
        }

        this.canvas.add(enlivenedObjects[0]);
        this.canvas.renderAll();

        enlivenedObjects[0].set('userId',this.userId);
      },'')

      this.canvas.requestRenderAll();

     
    })

    this.objectModifiedUnsubscribe=onChildChanged(ref(this.realtimeDb,`Whiteboard/${this.roomId}/Added`),(snapshot)=>{
      if(snapshot.val().userId==this.userId)return;
      console.log(snapshot.val());
      this.canvas.getObjects().forEach((object)=>{
        let json=snapshot.val() as any;

        let alreadyAddedCanvasObject:any=object;
        console.log(alreadyAddedCanvasObject);
       

        if(json.id==alreadyAddedCanvasObject.key){
          Object.keys(json).forEach((key)=>{
            console.log('ok');
            object.set(key as keyof fabric.Object,json[key]);   
          })
        }


        this.canvas.discardActiveObject()

        alreadyAddedCanvasObject.setCoords();
    

        alreadyAddedCanvasObject.set('userId',this.userId);
        
        this.canvas.requestRenderAll();
      })
    })

    this.objectRemovedUnsubscribe=onChildAdded(ref(this.realtimeDb,`Whiteboard/${this.roomId}/Removed`),(snapshot)=>{
      if(snapshot.val().userId==this.userId)return;

      this.canvas.remove(this.canvas.getObjects().find((obj:any)=>{
        return obj.id===snapshot.val().id;
      }) as fabric.Object);

      this.canvas.requestRenderAll();
      console.log(snapshot.val());
    })
  }


  listenToObjectEvents(){
    this.removeCanvasObjectEventListeners();

    this.canvas.on('object:added',(event:fabric.IEvent<MouseEvent>)=>{
      let object=event.target as any;

      if(object.userId!=this.userId && object.userId){
        return;
      }

      console.log('Object Added',event.target);
      let pushRef=push(ref(this.realtimeDb,`Whiteboard/${this.roomId}/Added`));
      
      let key=pushRef.key as string;

      let targetObject:any=event.target;

      targetObject.id=key;
      targetObject.userId=this.userId;
      targetObject.key=key;

      console.log(targetObject,targetObject.toJSON(this.requiredKeys));

      set(pushRef,targetObject.toJSON(this.requiredKeys));

    })

    this.canvas.on('object:modified',(event:fabric.IEvent<MouseEvent>)=>{
      let object=event.target as any;

      console.log('modify',object.userId,this.userId);

      if(object.userId!=this.userId && object.userId){
        return;
      }


      console.log('Object Modified',event.target);

      console.log(object._objects);

      if(false){
        object._objects.forEach((targetObject:any)=>{

          console.log(targetObject);

          targetObject.userId=this.userId;
    
          console.log(targetObject,targetObject.toJSON(this.requiredKeys));

          let objectLeft = targetObject.left
          let objectTop = targetObject.top
          let groupLeft = object.left
          let groupTop = object.top
          let objectInGroupLeft = objectLeft + groupLeft + object.width / 2
          let objectInGroupTop = objectTop + groupTop + object.height / 2

          let json=targetObject.toJSON(this.requiredKeys);
          json['left']=objectInGroupLeft;
          json['top']=objectInGroupTop;
    
    
          set((ref(this.realtimeDb,`Whiteboard/${this.roomId}/Added/${targetObject.key}`)),json);
        })
      }
      else{
        let targetObject:any=event.target;
        targetObject.userId=this.userId;
  
        console.log(targetObject.toJSON);

        console.log(targetObject,targetObject.toJSON(this.requiredKeys));

        console.log(4);
  
  
        set((ref(this.realtimeDb,`Whiteboard/${this.roomId}/Added/${targetObject.key}`)),targetObject.toJSON(this.requiredKeys));
      }


    })

    this.canvas.on('object:removed',(event:fabric.IEvent<MouseEvent>)=>{
      let object=event.target as any;

      if(object.userId!=this.userId && object.userId){
        return;
      }

      let targetObject:any=event.target;

      targetObject.userId=this.userId;

      console.log(targetObject,targetObject.toJSON(this.requiredKeys));

      set(push(ref(this.realtimeDb,`Whiteboard/${this.roomId}/Removed`)),targetObject.toJSON(this.requiredKeys));

      console.log(targetObject);
    })
  }


  removeCanvasObjectEventListeners(){
    this.canvas.off('object:added');
    this.canvas.off('object:modified');
    this.canvas.off('object:removed');
  }



  unsubscribeSubscriptions(){
    if(this.objectAdditionUnsubscribe)
    this.objectAdditionUnsubscribe();

    if(this.objectModifiedUnsubscribe)
    this.objectModifiedUnsubscribe();

    if(this.objectRemovedUnsubscribe)
    this.objectRemovedUnsubscribe();
  }


  resizeHandler(){
    if(this.canvas){
      if(this.canvasBgImage){
        this.canvas.setBackgroundImage(this.canvasBgImage, this.canvas.renderAll.bind(this.canvas), {
          scaleX: this.canvas.width! / this.canvasBgImage.width!,
          scaleY: this.canvas.height! / this.canvasBgImage.height!
        }).requestRenderAll();
      }
      this.canvas.setDimensions({width:window.innerWidth*this.canvasScreenWidthPercentage,height:window.innerHeight*this.canvasScreenHeightPercentage})
    }
  }

  canvasMouseDownHandler(event:fabric.IEvent<MouseEvent>){
    // Trying to detect canvas drag move

    if(event.e.altKey && this.activeTool==this.toolsList[0].toolName){
      this.isMouseDown=true;

      this.canvas.discardActiveObject().renderAll()

      let evt = event.e;
    
      this.lastPosX = evt.clientX;
      this.lastPosY = evt.clientY;

      this.selectTool(this.toolsList[0].toolName);
      return;
    }
    if(this.activeTool==this.toolsList[2].toolName){
      /**
       * Text tool
       */
      console.log('Text tool');
      console.log(this.rangeValue);
      
      this.canvas.add(new fabric.IText('Text',{
        left:event.pointer?.x,
        top:event.pointer?.y,
        fill:this.selectedFillColor,
        fontSize:this.rangeValue
      }))

      let text=new fabric.IText('Text',{
        left:event.pointer?.x,
        top:event.pointer?.y,
        fill:this.selectedFillColor,
        fontSize:this.rangeValue
      })

      // Change Tool After Drawing Text on canvas back to Select Tool
      this.activeTool=this.toolsList[0].toolName
      this.selectTool(this.activeTool);
    }
    else if(this.activeTool==this.toolsList[5].toolName){
      /**
       * Rectangle tool
       */

      console.log('Rectangle tool');
      this.shapeMouseDownStartX=this.canvas.getPointer(event.e).x;
      this.shapeMouseDownStartY=this.canvas.getPointer(event.e).y;
      
      this.rectangleRef=new fabric.Rect({
        originX:'left',
        originY:'top',
        fill:this.selectedFillColor,
        stroke:this.selectedBorderColor,
        strokeWidth:5,
        left:this.shapeMouseDownStartX,
        top:this.shapeMouseDownStartY,
      })
      if(!event.pointer?.x){
        console.error('Mouse Down Event Error in Rectangle Tool in: canvasMouseDownHandler');
      }
      this.canvas.add(this.rectangleRef);
    
      this.canvas.requestRenderAll();
    }
    else if(this.activeTool==this.toolsList[6].toolName){
      /**
       * Circle tool
       */
      console.log('Circle tool');

      this.shapeMouseDownStartX=this.canvas.getPointer(event.e).x;
      this.shapeMouseDownStartY=this.canvas.getPointer(event.e).y;
      
      this.circleRef=new fabric.Circle({
        fill:this.selectedFillColor,
        stroke:this.selectedBorderColor,
        strokeWidth:5,
        left:this.shapeMouseDownStartX,
        top:this.shapeMouseDownStartY,
        radius:0
      })
      this.canvas.add(this.circleRef);
      this.canvas.requestRenderAll();
      if(!event.pointer?.x){
        console.error('Mouse Down Event Error in Circle Tool in: canvasMouseDownHandler');
      }
      
    }
    this.isMouseDown=true;
  }

  canvasMouseMoveHandler(event:fabric.IEvent<MouseEvent>){

    if(this.isMouseDown && event.e.altKey && this.activeTool==this.toolsList[0].toolName){
      let e = event.e;

      this.vpt = this.canvas.viewportTransform as number[];
      if(this.vpt){
        this.vpt[4] += e.clientX - this.lastPosX;
        this.vpt[5] += e.clientY - this.lastPosY;
      }
     
      this.canvas.requestRenderAll();
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
      return;
    }
    
    if(this.isMouseDown){
      if(this.activeTool==this.toolsList[5].toolName){
        /**
         * Rectangle tool
         */
        let ptr=this.canvas.getPointer(event.e);

        if(this.rectangleRef){
          let pointer=this.canvas.getPointer(event.e)

          if((pointer.x)<this.shapeMouseDownStartX){
            this.rectangleRef.set({left:pointer.x})
          }
          else{
            this.rectangleRef.set({left:this.shapeMouseDownStartX});
          }
    
          if((pointer.y)<this.shapeMouseDownStartY){
            this.rectangleRef.set({top:pointer.y});
          }
          else{
            this.rectangleRef.set({top:this.shapeMouseDownStartY});
          }
    
          this.rectangleRef.set('width',Math.abs(pointer.x-this.shapeMouseDownStartX));
          this.rectangleRef.set('height',Math.abs(pointer.y-this.shapeMouseDownStartY));

          this.rectangleRef.setCoords();

          this.canvas.requestRenderAll();          
        }
        else{
          console.error('No Rectangle Ref in : canvasMouseMoveHandler');
        }
       
        
      }
      else if(this.activeTool==this.toolsList[6].toolName){
        /**
         * Circle tool
         */

        let ptr=this.canvas.getPointer(event.e);
        
         
        if(this.circleRef){

          let pointer=this.canvas.getPointer(event.e)

          if((pointer.x)<this.shapeMouseDownStartX){
            this.circleRef.set({left:pointer.x})
          }
          else{
            this.circleRef.set({left:this.shapeMouseDownStartX});
          }
    
    
          this.circleRef.set('radius',Math.abs(pointer.x-this.shapeMouseDownStartX)/2);

          this.circleRef.setCoords();
    
          this.canvas.requestRenderAll();
        }
        else{
          console.error('No Circle Ref in : canvasMouseMoveHandler');
        }
        
      }
    }
    
  }

  canvasMouseUpHandler(event:fabric.IEvent<MouseEvent>){
    this.isMouseDown=false;

    if(event.e.altKey && this.activeTool==this.toolsList[0].toolName){
      this.canvas.setViewportTransform(this.vpt);
     
      
      this.canvas.requestRenderAll();
      return;
    }

    if(this.activeTool==this.toolsList[5].toolName){
      /**
       * Rectangle tool
       */
            // Change Tool After Drawing Text on canvas back to Select Tool
      this.activeTool=this.toolsList[0].toolName
      this.selectTool(this.activeTool);
      this.shapeMouseDownStartX=-1;
      this.shapeMouseDownStartY=-1;

      this.rectangleRef.setCoords();

      this.canvas.fire('object:modified',{target:this.rectangleRef});

      this.rectangleRef!=null;
    }
    else if(this.activeTool==this.toolsList[6].toolName){
      /**
       * Circle tool
       */
            // Change Tool After Drawing Text on canvas back to Select Tool
      this.activeTool=this.toolsList[0].toolName
      this.selectTool(this.activeTool);
      this.shapeMouseDownStartX=-1;
      this.shapeMouseDownStartY=-1;

      this.circleRef.setCoords();

      this.canvas.fire('object:modified',{target:this.circleRef});

      this.circleRef!=null;
    }
  }

  changeRangeLimits(rangeMin:number,rangeMax:number,rangeValue:number){
    this.rangeMax=rangeMax;
    this.rangeMin=rangeMin;
    this.rangeValue=rangeValue;
  }

  selectTool(toolName:string){
    if(toolName=='info'){
      return;
    }

    this.allowObjectSelection();

    this.activeTool=toolName;

    if(toolName==this.toolsList[0].toolName){
      /**
       * Select Tool
       */
      this.canvas.isDrawingMode=false;
      this.rangeToolEnabled=false;
      this.colorsToolEnabled=false;
      
    }
    else if(toolName==this.toolsList[1].toolName){
      /**
       * Pencil Too1
       */
      this.canvas.isDrawingMode=true;
      this.rangeToolEnabled=true;
      this.colorsToolEnabled=true;
      this.changeRangeLimits(this.pencilRangeMin,this.pencilRangeMax,this.pencilRangeValue);
      this.setFreeDrawingBrushSettings(this.selectedColor,this.rangeValue);
    }
    else if(toolName==this.toolsList[2].toolName){
      /**
       * Text Too1
       */
      this.canvas.isDrawingMode=false;
      this.rangeToolEnabled=true;
      this.colorsToolEnabled=true;
      this.changeRangeLimits(this.textRangeMin,this.textRangeMax,this.textRangeValue);
      
    }
    else if(toolName==this.toolsList[3].toolName){
      /**
       * Fill Color Too1
       */
      this.canvas.isDrawingMode=false;
      this.rangeToolEnabled=false;
      this.colorsToolEnabled=true;
      this.selectedColor=this.selectedFillColor;
    }
    else if(toolName==this.toolsList[4].toolName){
      /**
       * Border Color Too1
       */
      this.canvas.isDrawingMode=false;
      this.rangeToolEnabled=false;
      this.colorsToolEnabled=true;
      this.selectedColor=this.selectedBorderColor;
    }
    else if(toolName==this.toolsList[5].toolName){
      /**
       * Rectangle Too1
       */

      this.stopObjectSelection();

      this.canvas.isDrawingMode=false;
      this.rangeToolEnabled=true;
      this.colorsToolEnabled=true;
      this.changeRangeLimits(this.shapeRangeMinValue,this.shapeRangeMaxValue,this.shapeRangeValue);
      this.canvas.discardActiveObject();
    }
    else if(toolName==this.toolsList[6].toolName){
      /**
       * Circle Too1
       */

      this.stopObjectSelection();
      
      this.canvas.isDrawingMode=false;
      this.rangeToolEnabled=true;
      this.colorsToolEnabled=true;
      this.changeRangeLimits(this.shapeRangeMinValue,this.shapeRangeMaxValue,this.shapeRangeValue);
      this.canvas.discardActiveObject();

    }
    else if(toolName==this.toolsList[7].toolName){
      /**
       * Delete Too1
       */

      
      for(let object of  this.canvas.getActiveObjects()){
        this.canvas.remove(object);
      }
      // After Deleting the objects set the tool back to select 
      this.selectTool(this.toolsList[0].toolName);

    }
    else if(toolName==this.toolsList[8].toolName){
      /**
       * Upload Too1
       */
      document.getElementById('fileInput')?.click();
      this.selectTool(this.toolsList[0].toolName);


    }
    else if(toolName==this.toolsList[9].toolName){
      /**
       * Download Too1
       */

      console.log('Downlaoding scan')
      let a = document.createElement('a')
      let dt = this.canvas.toDataURL({
        format: 'jpeg',
        quality: 1,
      })

      a.href = dt
      a.download = 'canvas.jpeg'
      a.click()
     
    }
    else if(toolName==this.toolsList[10].toolName){
      /**
       * Undo Too1
       */
      
    }
    else if(toolName==this.toolsList[11].toolName){
      /**
       * Redo Too1
       */
     
    }

  }

  allowObjectSelection(){
    this.canvas.getObjects().forEach(obj=>{obj.set('selectable',true)});
  }

  stopObjectSelection(){
    this.canvas.getObjects().forEach(obj=>{obj.set('selectable',false)});
  }

  selectColor(color:string){
    if(this.activeTool===this.toolsList[1].toolName){
      /**
       * Pencil tool
       */
      this.selectedFillColor=color;
      this.setFreeDrawingBrushSettings(this.selectedFillColor,this.rangeValue);
    }
    if(this.activeTool===this.toolsList[2].toolName){
      /**
       * Text tool
       */
      this.selectedFillColor=color;
    }
    if(this.activeTool===this.toolsList[3].toolName){
      /**
       * Text tool
       */
      this.selectedFillColor=color;
    }
    if(this.activeTool===this.toolsList[3].toolName){
      /**
       * Fill Color tool
       */
      this.selectedFillColor=color;
      for(let activeObject of this.canvas.getActiveObjects()){
        let flag=0;
        if(activeObject.type=='i-text'){
          activeObject.set('fill',color);
          flag=1;
        }
        if(activeObject.type=='path'){
          activeObject.set('stroke',color);
          flag=1;
        }
        if(activeObject.type=='circle'){
          activeObject.set('fill',color);
          flag=1;
        }
        if(activeObject.type=='rect'){
          activeObject.set('fill',color);
          flag=1;
        }

        if(flag)
        this.canvas.fire('object:modified',{ target: activeObject })
      }
      this.canvas.requestRenderAll();
    }
    if(this.activeTool===this.toolsList[4].toolName){
      /**
       * Border Color tool
       */
      this.selectedBorderColor=color;
      for(let activeObject of this.canvas.getActiveObjects()){
        let flag=0;
        if(activeObject.type=='circle'){
          activeObject.set('stroke',color);
          flag=1;
        }
        if(activeObject.type=='rect'){
          activeObject.set('stroke',color);
          flag=1;
        }

        if(flag)
        this.canvas.fire('object:modified',{ target: activeObject });
      }
      this.canvas.requestRenderAll();

    }
    if(this.activeTool===this.toolsList[5].toolName || this.activeTool===this.toolsList[6].toolName){
      /**
       *  Fill Color Tool ||  Border Color tool => The colors displayed are fill color selection menu
       */
      this.selectedBorderColor=color;
    }
    this.selectedColor=color;
   
  }

  rangeChange(){
    if(this.activeTool===this.toolsList[1].toolName){
      /**
       * Pencil tool
       */
      this.canvas.freeDrawingBrush.width=this.rangeValue;
      this.pencilRangeValue=this.rangeValue;
    }
    else if(this.activeTool===this.toolsList[2].toolName){
      /**
       * Text tool
       */
      this.textRangeValue=this.rangeValue;
    }
    else if(this.activeTool===this.toolsList[5].toolName){
      /**
       * Rectangle Tool
       */
      this.shapeRangeValue=this.rangeValue;
    }
    else if(this.activeTool===this.toolsList[6].toolName){
      /**
       * Circle Tool
       */
      this.shapeRangeValue=this.rangeValue;
    }

  }

  setFreeDrawingBrushSettings(color:string,width:number){
    this.canvas.freeDrawingBrush.color=color;
    this.canvas.freeDrawingBrush.width=width;
  }

  handleFileInput(event:Event){
    let eventTarget:any=event.target;
    
    let uploadedFile=eventTarget.files[0] as File;

    if(uploadedFile.type.toString().toLowerCase().includes('image')){

      console.log(uploadedFile)

      let reader = new FileReader();
      reader.onload=(event)=>{ 
        let data=(event.target?.result) as string

        fabric.Image.fromURL(data, (img)=>{
          // add background image
          this.canvasBgImage=img;
          this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas), {
            scaleX: this.canvas.width! / img.width!,
            scaleY: this.canvas.height! / img.height!
          }).requestRenderAll();
        })

      }

      reader.readAsDataURL(uploadedFile);

    }    

    

  }


}
