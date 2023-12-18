import { AfterViewInit, Component, OnInit } from '@angular/core';
import { fabric } from "fabric";
import { log } from 'fabric/fabric-impl';

@Component({
  selector: 'app-drawing-board',
  templateUrl: './drawing-board.component.html',
  styleUrls: ['./drawing-board.component.scss']
})
export class DrawingBoardComponent implements OnInit,AfterViewInit {
  canvas!:fabric.Canvas

  toolsList=[ 
    {fontIcon:'back_hand', toolTipText:'Select', toolName:'select',visibility:true},
    {fontIcon:'edit', toolTipText:'Pencil',toolName:'pencil',visibility:true},
    {fontIcon:'title', toolTipText:'Text',toolName:'text',visibility:true},
    {fontIcon:'format_color_fill', toolTipText:'Fill Color',toolName:'fill_color',visibility:true},
    {fontIcon:'border_color', toolTipText:'Border Color',toolName:'border_color',visibility:true},
    {fontIcon:'rectangle', toolTipText:'Rectangle',toolName:'rectangle',visibility:true},
    {fontIcon:'circle', toolTipText:'Circle',toolName:'circle',visibility:true},
    {fontIcon:'delete', toolTipText:'Delete',toolName:'delete',visibility:true},
    {fontIcon:'upload', toolTipText:'Upload Background Image',toolName:'upload',visibility:false},
    {fontIcon:'download', toolTipText:'Download',toolName:'download',visibility:true},
    {fontIcon:'undo', toolTipText:'Undo',toolName:'undo',visibility:true},
    {fontIcon:'redo', toolTipText:'Redo',toolName:'redo',visibility:true},
  ]

  activeTool='select';
  drawingMode=false;
  colors=['red','green','purple','yellow','blue','white','black']

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
  canvasScreenHeightPercentage=85/100;

  resizeHandler(){
    if(this.canvas){
      this.canvas.setDimensions({width:window.innerWidth*this.canvasScreenWidthPercentage,height:window.innerHeight*this.canvasScreenHeightPercentage})
    }
  }

  constructor(){
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
    this.canvas=new fabric.Canvas('drawingBoard',{width:window.innerWidth*this.canvasScreenWidthPercentage,height:window.innerHeight*this.canvasScreenHeightPercentage,isDrawingMode:this.drawingMode});
    /**
    * Free Drawing Brush settings
    */
    this.setFreeDrawingBrushSettings(this.selectedColor,this.rangeValue);
    // Handle Mouse Events on Fabric
    if(this.canvas){
      this.canvas.on('mouse:down',(event:fabric.IEvent<MouseEvent>)=>this.canvasMouseDownHandler(event));
      this.canvas.on('mouse:up',(event:fabric.IEvent<MouseEvent>)=>this.canvasMouseUpHandler(event));
      this.canvas.on('mouse:move',(event:fabric.IEvent<MouseEvent>)=>this.canvasMouseMoveHandler(event));
    }
    
    
  }

  canvasMouseDownHandler(event:fabric.IEvent<MouseEvent>){
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
    
    if(this.isMouseDown){
      if(this.activeTool==this.toolsList[5].toolName){
        /**
         * Rectangle tool
         */
        let ptr=this.canvas.getPointer(event.e);
        console.log(ptr.x,ptr.y,this.shapeMouseDownStartX,this.shapeMouseDownStartY)
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
        console.log(ptr.x,ptr.y,this.shapeMouseDownStartX,this.shapeMouseDownStartY)
         
        if(this.circleRef){

          let pointer=this.canvas.getPointer(event.e)

          if((pointer.x)<this.shapeMouseDownStartX){
            this.circleRef.set({left:pointer.x})
          }
          else{
            this.circleRef.set({left:this.shapeMouseDownStartX});
          }
    
          // if((pointer.y)<this.shapeMouseDownStartY){
          //   this.circleRef.set({top:pointer.y});
          // }
          // else{
          //   this.circleRef.set({top:this.shapeMouseDownStartY});
          // }
    
          this.circleRef.set('radius',Math.abs(pointer.x-this.shapeMouseDownStartX)/2);
          //this.circleRef.set('height',Math.abs(pointer.y-this.shapeMouseDownStartY)/2);
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
    if(this.activeTool==this.toolsList[5].toolName){
      /**
       * Rectangle tool
       */
            // Change Tool After Drawing Text on canvas back to Select Tool
      this.activeTool=this.toolsList[0].toolName
      this.selectTool(this.activeTool);
      this.shapeMouseDownStartX=-1;
      this.shapeMouseDownStartY=-1;
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
      this.circleRef!=null;
    }
  }

  changeRangeLimits(rangeMin:number,rangeMax:number,rangeValue:number){
    this.rangeMax=rangeMax;
    this.rangeMin=rangeMin;
    this.rangeValue=rangeValue;
  }

  selectTool(toolName:string){
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
      // dt = dt.replace(/^data:image\/[^;]*/, 'data:application/octet-stream')
      // dt = dt.replace(
      //   /^data:application\/octet-stream/,
      //   'data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=Canvas.png',
      // )

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
        if(activeObject.type=='i-text'){
          activeObject.set('fill',color);
        }
        if(activeObject.type=='path'){
          activeObject.set('stroke',color);
        }
        if(activeObject.type=='circle'){
          activeObject.set('fill',color);
        }
        if(activeObject.type=='rect'){
          activeObject.set('fill',color);
        }
      }
      this.canvas.requestRenderAll();
    }
    if(this.activeTool===this.toolsList[4].toolName){
      /**
       * Border Color tool
       */
      this.selectedBorderColor=color;
      for(let activeObject of this.canvas.getActiveObjects()){
        if(activeObject.type=='circle'){
          activeObject.set('stroke',color);
        }
        if(activeObject.type=='rect'){
          activeObject.set('stroke',color);
        }
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

  

}
