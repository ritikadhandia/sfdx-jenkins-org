/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LightningElement, api } from 'lwc';

export default class IndividualClock extends LightningElement {
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

     ProcessData(timeZoneParam){
        this.timeZoneFriendlyFormat = this.timeZone.substring(this.timeZone.indexOf('/')+1);
        this.timeZoneFriendlyFormat = this.timeZoneFriendlyFormat.replace(/_/g, " ");
        this.dayIsOn = true;
        this.dateVar = new Date();
        this.dateString = this.dateVar.toLocaleString("en-US", {timeZone: timeZoneParam});
        this.digitalTime = this.dateString;
        //converting to date after time zone converison
        this.dateVar = new Date(this.dateString);
        if(this.dateVar.getHours() >= 6 && this.dateVar.getHours() <= 18  ){
            this.dayIsOn = true;
        }
        else {
            this.dayIsOn = false;
        }
        this.cx = 70;
        this.cy = 70;
        this.hoursAngle = 360 * this.dateVar.getHours() / 12 + this.dateVar.getMinutes() / 2;
        this.minuteAngle = 360 * this.dateVar.getMinutes() / 60;
        this.secAngle = 360 * this.dateVar.getSeconds() / 60;

        this.secAngleTextFrom = [this.secAngle, this.cx, this.cy].join(' ');
        this.minAngleTextFrom = [this.minuteAngle, this.cx, this.cy].join(' ');
        this.hourAngleTextFrom = [this.hoursAngle, this.cx, this.cy].join(' ');

        this.secAngleTextTo = [this.secAngle+360, this.cx, this.cy].join(' ');
        this.minAngleTextTo = [this.minuteAngle+360, this.cx, this.cy].join(' ');
        this.hourAngleTextTo = [this.hoursAngle+360, this.cx, this.cy].join(' ');
    }
    
    get linesTransform(){
        var lines = [];
        for(var i=0; i<=12; i++){
            lines.push({'transform':'rotate(' + (i*360/12) + ' 70 70)', 'key':'key'+i});
        }
        return lines;
        
    }

    connectedCallback(){
       if(this.timeZone != null){
        this.ProcessData(this.timeZone);
       }
   }  
   
   renderedCallback() {
       console.log('rendered callback'+this.isRenderCallbackActionExecuted);
        if (this.isRenderCallbackActionExecuted) {
            return;
        }

        this.isRenderCallbackActionExecuted = true;
        // Method action implementation.
    }

}