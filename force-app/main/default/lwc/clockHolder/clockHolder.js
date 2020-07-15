/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LightningElement, wire, api } from 'lwc';
import {getRecord} from 'lightning/uiRecordApi';
import CURRENTUSERID from '@salesforce/user/Id';
import TIME_ZONE_KEY from '@salesforce/schema/User.TimeZoneSidKey';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import TYPE_FIELD from '@salesforce/schema/User.TimeZoneSidKey'; 
import { createRecord, updateRecord, deleteRecord } from 'lightning/uiRecordApi';
import TIME_ZONE_FIELD from '@salesforce/schema/Clock_Preference__c.Time_Zone__c';
import TIME_PREFERENCES_OBJECT from '@salesforce/schema/Clock_Preference__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllPreferences from '@salesforce/apex/ClockController.getAllPreferences';

const FIELDS = [
    'User.Email',
    'User.TimeZoneSidKey'
];

/*
parent component which interacts with apex and brings preference.
Handles creating and deleting preference
*/
export default class ClockHolder extends LightningElement {
    userId = CURRENTUSERID;
    timeZoneArray= [];
    showData = false;
    editMode =false;
    newClock = false;
    timeZoneArrayObject=[];
    timeZoneSelected;
    error;
    @api defaultTimeZone;
    @api flexipageRegionWidth;
    flexiClass;
    flexiClassNew;
    
    //for user, there is no record type. Hence for all orgs , below is master record type.
    //need type field to display all time zones on user object
    @wire(getPicklistValues, {
        recordTypeId: '012000000000000AAA',
        fieldApiName: TYPE_FIELD
    })
    picklistValues;

    //earlier functionality was to add default time zone. 
    //Default time zone is users salesforce time zone. Later commented this functionality.
    @wire(getRecord, {
        recordId: CURRENTUSERID,
        fields: [TIME_ZONE_KEY]
    }) wireuser({error,data}) {
        if(this.defaultTimeZone){
            if (error != undefined) {
            //this.error = error ; 
            } else if (data != undefined && data.fields != undefined) {
                this.timeZoneKey = data.fields.TimeZoneSidKey.value;
                //defaut time zone cannot be deleted. hence passes last parameter as false
                this.loadArray(this.timeZoneKey,null,true);
            }
        }
    }

    //method to take time zone and ocnstruct arary of time zones
    loadArray(timezoneVal,recordId,UnDeletable){
        if(this.timeZoneArray.indexOf(timezoneVal) == -1){
            //this.timeZoneArray.push(this.timeZoneKey);
            this.timeZoneArray = [...this.timeZoneArray, timezoneVal];
            let timeZoneFriendlyFormat = timezoneVal.substring(timezoneVal.indexOf('/')+1);
            //lwc bindings does not change when push is done. hence this temporary workaround
            this.timeZoneArrayObject =[...this.timeZoneArrayObject, {id:recordId,timeZoneKey:timezoneVal,cannotDelete:UnDeletable,timeZoneFriendlyFormat:timeZoneFriendlyFormat}];
            this.showData = true;
        } 
    }

    //method to take time zone and delete from array
    deleteFromArray(timezoneVal){
        try{
        //delete from array and delete from array object
        for(let i = this.timeZoneArray.length-1; i>= 0; i--){    
                if(this.timeZoneArray[i]==timezoneVal){
                    this.timeZoneArray.splice(i,1);
                    //break;
                }
                if(this.timeZoneArrayObject[i].timeZoneKey==timezoneVal){
                    this.timeZoneArrayObject.splice(i,1);
                }

            }
            let tempArray =[] ;
            //lwc bindings does not change when array is modified. hence this temporary workaround
            tempArray.push.apply(tempArray, this.timeZoneArrayObject);
            this.timeZoneArrayObject = tempArray;
        }
        catch(e){
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error While Deleting record',
                    message: e.message,
                    variant: 'error',
                }),
            );
        }
    }

   /* method to get stored clock preferences from apex.
   */     
    @wire(getAllPreferences)wiredPreferences({ error, data }) {
        if (data != undefined) {
            for(let i= 0; i< data.length;i++ ){
                this.loadArray(data[i].wclock__Time_Zone__c,data[i].Id,false);
            }
            console.log(data);
        } else if (error != undefined) {
            this.error = error;
        }
    }
            
    //if user does not have preference. then by default add button appears
    get newClockVisible(){
        return this.picklistValues.data != undefined && this.editMode == true && this.newClock == true;
    }

    //method to decide new button
    get newButtonVisible(){
        return this.editMode == true && this.newClock == false  ;
    }

    handleEdit(){
        this.editMode = true;
    }

    resetEdit(){
        this.editMode = false;
    }

    handleNew(){
        this.newClock = true;
    }
    //when users hits add , but does not add , hits reject mode. This cancels edit mode
    handleReject(){
        this.newClock = false;
        this.editMode = false;
    }

    //method called when users adds new time zone
    handleSave(){
        let j  = this.template.querySelector('[data-id="timeZoneSelect"]').value;
        if (j == ""){
            //throw error
            this.template.querySelector('[data-id="timeZoneSelect"]').classList.add('red');
            return ;
        }
        else {
            this.createPreference(j);
        }
    }

    handleDelete(event){
        //delete happens here
        let recordIdToDelete = event.target.dataset.id;
        let timeZoneToDelete = event.target.dataset.item;
      
        deleteRecord(recordIdToDelete)
            .then(() => {
                this.deleteFromArray(timeZoneToDelete);
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error While Deleting record',
                        message: error.message,
                        variant: 'error',
                    }),
                );
            });
    }

    //method to store preference in salesforce backend
    createPreference(timeZonefield) {
        const fields = {};
        fields[TIME_ZONE_FIELD.fieldApiName] = timeZonefield;
        const recordInput = { apiName: TIME_PREFERENCES_OBJECT.objectApiName, fields };
        createRecord(recordInput)
            .then(recordOut => {
                //this.accountId = recordOut.id;
                this.loadArray(timeZonefield,recordOut.id,false);
                //enable flasg again
                this.editMode = true;
                this.newClock = false;
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error creating Preference',
                        message: reduceErrors(error).join(', '),
                        variant: 'error'
                    })
                );
            });
    }

    // ConnectedCallBack
    // Verify Components Width and set the class for each Div
    connectedCallback(){
        //"slds-text-align_center slds-size_1-of-1 slds-medium-size_6-of-12 slds-large-size_4-of-12"
        if(!this.flexipageRegionWidth){
            this.flexiClass = 'slds-size_6-of-12 '+'SMALL';
        }
        switch(this.flexipageRegionWidth) {
            case 'LARGE':
                this.flexiClass = 'slds-size_4-of-12 '+this.flexipageRegionWidth;
                break;
            case 'MEDIUM':
                this.flexiClass = 'slds-size_3-of-12 '+this.flexipageRegionWidth;
                break;
            case 'SMALL':
                this.flexiClass = 'slds-size_6-of-12 '+this.flexipageRegionWidth;
                break;
            default:
                this.flexClass = 'slds-size_6-of-12 '+'SMALL';
        }
        this.flexiClassNew = 'slds-text-align_center '+ this.flexiClass;
    }


    renderedCallback() {
        if(this.template.querySelector('datalist') != undefined){
            let listId = this.template.querySelector('datalist').id;
            this.template.querySelector('[data-id="timeZoneSelect"]').setAttribute("list", listId);
        }
    }
}