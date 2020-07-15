import { LightningElement, api } from 'lwc';

export default class SmallClock extends LightningElement {
    @api timeZone;
    dateVar;
    cx;
    cy;
    hoursAngle;
    minuteAngle;
    secAngle;
    secAngleTextFrom;
    minAngleTextFrom;
    hourAngleTextFrom ;

    secAngleTextTo;
    minAngleTextTo;
    hourAngleTextTo;
    dateString;
    dayIsOn;
    isRenderCallbackActionExecuted = false;
    digitalTime;
    hourHand;
    minuteHand;
    secondHand;
     
    
    run_the_clock(timeZoneParam){

        this.dayIsOn = true;
        this.dateVar = new Date();
        this.dateString = this.dateVar.toLocaleString("en-US", {timeZone: timeZoneParam});
        this.digitalTime = this.dateString;
        //converting to date after time zone converison
        this.dateVar = new Date(this.dateString);
        if(this.dateVar.getHours() <= 6 || this.dateVar.getHours() >= 16  ){
            this.dayIsOn = false;
        }  

        this.cx = 100;
        this.cy = 100;
        this.hoursAngle = 360 * this.dateVar.getHours() / 12 + this.dateVar.getMinutes() / 2;
        this.minuteAngle = 360 * this.dateVar.getMinutes() / 60;
        this.secAngle = 360 * this.dateVar.getSeconds() / 60;

        this.secAngleTextFrom = [this.secAngle, this.cx, this.cy].join(' ');
        this.minAngleTextFrom = [this.minuteAngle, this.cx, this.cy].join(' ');
        this.hourAngleTextFrom = [this.hoursAngle, this.cx, this.cy].join(' ');

        this.secAngleTextTo = [this.secAngle+360, this.cx, this.cy].join(' ');
        this.minAngleTextTo = [this.minuteAngle+360, this.cx, this.cy].join(' ');
        this.hourAngleTextTo = [this.hoursAngle+360, this.cx, this.cy].join(' ');



        let hr = this.dateVar.getHours();
        let min = this.dateVar.getMinutes();
        let sec = this.dateVar.getSeconds();
     
    
        let hrPosition = hr*360/12 + ((min * 360/60)/12) ;
        let minPosition = (min * 360/60) + (sec* 360/60)/60;
        let secPosition = sec * 360/60;
    
        //Then we need to apply these numbers as degrees in the inline styles for transform on each of the objects.
        this.hourHand = "rotate(" + hrPosition + "deg)";
        this.minuteHand = "rotate(" + minPosition + "deg)";
        this.secondHand = "rotate(" + secPosition + "deg)";
        }
   
}