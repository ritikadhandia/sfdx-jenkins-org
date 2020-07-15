public with sharing class HistoryGraphsCntrl {
    @AuraEnabled
    public static List<sObject> getHistory(String strObjectName,String strHistoryObj,String recordId,String strFieldName,String strHistoryFName,String strObjectField){
        List<sObject> lstReturn = new List<sObject>();
        sObject obj = Database.query('SELECT CreatedDate,'+strObjectField+' FROM '+strObjectName+' WHERE Id=:recordId LIMIT 1');
        lstReturn.add(obj);
        List<sObject> lstHistory = Database.query('SELECT OldValue, NewValue, CreatedDate FROM '+strHistoryObj+' WHERE Field=:strFieldName AND '+strHistoryFName+'=:recordId ORDER BY CreatedDate');
        if(lstHistory!=null && !lstHistory.isEmpty()){
            for(sObject objIter:lstHistory){
                if(!(objIter.get('OldValue') instanceof Id)){
                    lstReturn.add(objIter);
                }
            }
        }
        return lstReturn;
    }
    @AuraEnabled
    public static List<List<sObject>> getHistoryOwner(String strObjectName,String strHistoryObj,String recordId,String strFieldName,String strHistoryFName,String strObjectField){
        List<List<sObject>> lstReturn = new List<List<sObject>>();
        Map<String,Integer> mapSobjIndexing = new Map<String,Integer>();
        sObject obj = Database.query('SELECT CreatedDate,'+strObjectField+' FROM '+strObjectName+' WHERE Id=:recordId LIMIT 1');
        Integer index = 0;
        for(String str:strFieldName.split(',')){
            lstReturn.add(new List<sObject>{obj});
            if(!str.contains('.'))
                mapSobjIndexing.put(str.toLowerCase(),index);
            else
                mapSobjIndexing.put(str.toLowerCase().split('.').get(0),index);//taking Owner.Name => owner
            index++;
        }
        List<sObject> lstHistory = Database.query('SELECT OldValue, NewValue, CreatedDate, Field FROM '+strHistoryObj+' WHERE Field IN (\''+String.join(new List<String>(mapSobjIndexing.keySet()),'\',\'')+'\') AND '+strHistoryFName+'=:recordId ORDER BY CreatedDate');
        if(lstHistory!=null && !lstHistory.isEmpty()){
            for(sObject objIter:lstHistory){
                if(!(objIter.get('OldValue') instanceof Id)){
                    index = mapSobjIndexing.get(((String) objIter.get('Field')).toLowerCase());
                    lstReturn.get(index).add(objIter);
                }
            }
        }
        return lstReturn;
    }
}