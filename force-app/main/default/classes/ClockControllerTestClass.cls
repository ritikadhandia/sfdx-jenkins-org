@isTest

/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */    
public class ClockControllerTestClass {
	static testMethod void ClockControllerTestCase1() {
        // Mimic user adding a time zone
    	wclock__Clock_Preference__c  b = new wclock__Clock_Preference__c (
                                                wclock__Time_Zone__c ='Asia/Koloata');
        // Insert world clock
        insert b;

        // Access the class similar to how the component would
        ClockController c = new ClockController();

        // Since we inserted only one time zone, we will get only one record back
        system.assertEquals(1, ClockController.getAllPreferences().size(), 
            'Number of time zones returned does not match what the user saved.');
    }
}