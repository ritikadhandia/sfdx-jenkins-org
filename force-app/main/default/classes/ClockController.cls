/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */    

public with sharing class ClockController {
    // Empty constructor
    public ClockController() {

    }

    // Called when the component is launched
    // Cacheable set to true coz the data does not change often
    @AuraEnabled(cacheable=true)
    public static List<Clock_Preference__c> getAllPreferences(){
        return [SELECT id, Time_Zone__c 
                FROM Clock_Preference__c 
                WHERE createdbyId =:userInfo.getUserId() 
                ORDER BY createddate ASC];
    }
}