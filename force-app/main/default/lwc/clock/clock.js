import { LightningElement, wire } from 'lwc';
//import getAllAvailableTimeZones from '@salesforce/apex/ClockController.getAllAvailableTimeZones';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import TYPE_FIELD from '@salesforce/schema/User.TimeZoneSidKey'; 

export default class Clock extends LightningElement {

   @wire(getPicklistValues, {
        recordTypeId: '012000000000000AAA',
        fieldApiName: TYPE_FIELD
    })
    picklistValues;

    dateVar = new Date();
    cx = 100;
    cy = 100;
    hoursAngle = 360 * this.dateVar.getHours() / 12 + this.dateVar.getMinutes() / 2;
    minuteAngle = 360 * this.dateVar.getMinutes() / 60;
    secAngle = 360 * this.dateVar.getSeconds() / 60;

    secAngleTextFrom = [this.secAngle, this.cx, this.cy].join(' ');
    minAngleTextFrom = [this.minuteAngle, this.cx, this.cy].join(' ');
    hourAngleTextFrom = [this.hoursAngle, this.cx, this.cy].join(' ');

    secAngleTextTo = [this.secAngle+360, this.cx, this.cy].join(' ');
    minAngleTextTo = [this.minuteAngle+360, this.cx, this.cy].join(' ');
    hourAngleTextTo = [this.hoursAngle+360, this.cx, this.cy].join(' ');

    
    get linesTransform(){
        var lines = [];
        for(var i=0; i<=12; i++){
            lines.push({'transform':'rotate(' + (i*360/12) + ' 100 100)', 'key':'key'+i});
        }
        return lines;
        
    }

    get hasPicklistValues() {
        return this.picklistValues && this.picklistValues.data && this.picklistValues.data.values;
    }

    
}