import { LightningElement, api, wire } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';//To load custom JS Scripts
import { CurrentPageReference } from 'lightning/navigation';
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub';//To load PubSub communication across independent components
import chartsJS from '@salesforce/resourceUrl/ChartJS23';
import getHistory from '@salesforce/apex/HistoryGraphsCntrl.getHistory';

export default class HistoryGraphs extends LightningElement {
    mapData;
    conversionRate;
    objChart;
    chartProperties;
    mapTimeline;
    @api strObjectName;
    @api strHistoryObj;
    @api strFieldName;
    @api strTitle;
    @api strHistoryFName;
    @api strObjectField;
    @api strColorScheme;
    @api isPublisher;
    @api isListener;
    @api recordId;
    @wire(CurrentPageReference) pageRef;

    connectedCallback() {
        /*console.log(this.strObjectName);
        console.log(this.strHistoryObj);
        console.log(this.strFieldName);
        console.log(this.strHistoryFName);
        console.log(this.recordId);
        
        strObjectName: this.strObjectName,
        strHistoryObj: this.strHistoryObj,
        recordId: this.recordId,
        strFieldName: this.strFieldName,
        strHistoryFName: this.strHistoryFName,
        strObjectField: this.strObjectField

        strObjectName: 'Case',
        strHistoryObj: 'CaseHistory',
        recordId: '5000I00001gV8AN',
        strFieldName: 'Status',
        strHistoryFName: 'CaseId'
        */
        let inputDataSet = {
            strObjectName: this.strObjectName,
            strHistoryObj: this.strHistoryObj,
            recordId: this.recordId,
            strFieldName: this.strFieldName,
            strHistoryFName: this.strHistoryFName,
            strObjectField: this.strObjectField
        };
        Promise.all([
            loadScript(this, chartsJS),
            getHistory(inputDataSet).then(ret => this.analyseData(ret))
        ]).then(ret => {
            //console.log(this.mapData);
            this.createChart()
        });
        if (this.isListener && !this.isPublisher)
            registerListener('historyGraphs', this.fabricateNewDataset, this);
    }
    analyseData(data) {
        let mapData = new Map();
        let oldTime;// To maintain start time
        let iter;//Iteration variable
        let newTime;//temp variable
        this.mapTimeline = new Map();//Variable to maintain timeline span per entry
        //Format the first data so that all the elements are symetric for usage  
        iter = data[0];
        if (data.length > 1)
            iter['NewValue'] = data[1].OldValue;
        else if (this.strObjectField.indexOf('.') === -1) //This if else is added to work for Relational fields where the name is on the other object
            iter['NewValue'] = iter[this.strObjectField];
        else {
            let strSplit = this.strObjectField.split('.');
            iter['NewValue'] = iter[strSplit[0]][strSplit[1]];
        }
        //Iterate and collect data
        for (let index = 0; index < data.length; index++) {
            iter = data[index];
            newTime = Date.parse(iter.CreatedDate);
            if (iter.OldValue) {
                //Create Default data set
                this.addToMap(mapData, iter.OldValue, (newTime - oldTime));
                //Create Timeline for extended reactive rendering across components
                if (!this.mapTimeline.has(iter.OldValue)) //Initialize value on the map
                    this.mapTimeline.set(iter.OldValue, new Array());
                this.mapTimeline.get(iter.OldValue).push({ startTime: oldTime, endTime: newTime });
            }
            oldTime = newTime;
        }
        iter = data[data.length - 1];
        //calculate the current entry on the data with current time 
        this.addToMap(mapData, iter.NewValue, ((new Date()).getTime() - oldTime));
        //Timeline Data
        if (!this.mapTimeline.has(iter.NewValue)) //Initialize value on the map
            this.mapTimeline.set(iter.NewValue, new Array());
        this.mapTimeline.get(iter.NewValue).push({ startTime: oldTime, endTime: (new Date()).getTime() });
        //check what would be the division factor - days/hours/minutes/seconds
        this.conversionRate = getConversionRate([...mapData.values()].sort(function (a, b) { return b - a })[0]);
        console.log(this.conversionRate);
        //Convert the dataset to the required division factor for better visibility
        mapData.forEach((value, key) => {
            mapData.set(key, (value / conversion[this.conversionRate]).toFixed(2))
        });
        //console.log(mapData);
        this.mapData = mapData;
    }
    addToMap(mapData, value, timeDiff) {
        if (mapData.has(value))
            mapData.set(value, mapData.get(value) + timeDiff);
        else
            mapData.set(value, timeDiff);
    }
    createChart() {
        console.log('Creating Chart')
        var labels = [...this.mapData.keys()];//X axis headers
        var datasets = [];// List of multiple datasets // Each dataset is an object where the label is the key & data is the list of corresponding data
        //console.log(this.mapData.values());
        datasets.push({
            label: this.strTitle,
            data: [...this.mapData.values()],
            fill: false,
            borderWidth: 1.5,
            backgroundColor: this.strColorScheme,
            borderColor: this.strColorScheme,
            pointBackgroundColor: "#FFFFFF",
            pointBorderWidth: 4,
            pointHoverRadius: 8,
            pointRadius: 6,
            pointHitRadius: 10,
        });
        // eslint-disable-next-line vars-on-top
        var ctx = this.template.querySelector('canvas');
        // eslint-disable-next-line vars-on-top
        this.chartProperties = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                legend: {
                    display: false
                },
                responsive: true,
                maintainAspectRatio: false,
                title: {
                    display: true,
                    text: this.strTitle,
                    fontSize: 25,
                    fontFamily: 'Salesforce Sans,Arial,sans-serif',
                    fontStyle: ''
                },
                scales: {
                    yAxes: [{
                        id: 'first-y-axis',
                        type: 'linear',
                        scaleLabel: {
                            display: true,
                            fontSize: 14,
                            fontFamily: 'Salesforce Sans,Arial,sans-serif',
                            fontStyle: '',
                            labelString: `Duration in ${this.conversionRate}`
                        },
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                },
                onClick: event => {
                    var elements = this.objChart.getElementAtEvent(event);
                    console.log("elements");
                    //console.log(this.mapTimeline);
                    //console.log(elements);
                    if (elements.length === 1 && !this.isListener && this.isPublisher) {
                        console.log("in");
                        let payload = {
                            origin: datasets[elements[0]._datasetIndex].label,
                            data: this.mapTimeline.get(labels[elements[0]._index])
                        }
                        fireEvent(this.pageRef, 'historyGraphs', payload);
                    }
                    /*if (elements.length === 1) {
                        var year = labels[elements[0]._index];
                        var country = datasets[elements[0]._datasetIndex].label;
						var chartEvent = $A.get("e.c:ChartEvent");
                        chartEvent.setParams({
                            data: {year: year, country: country}
                        });
        				chartEvent.fire();
                    }*/
                }
            }
        }
        this.objChart = new Chart(ctx, this.chartProperties);
    }
    //Method the creates new dataset for the required list of timelines
    fabricateNewDataset(requiredTimeline) {
        console.log(requiredTimeline.data);
        console.log(Array.isArray(requiredTimeline.data));
        let tempOuter;
        let tempInner;//temp Timeline from this object
        let tempStartTime;//start Time
        let tempStopTime;//stop Time
        let mapData = new Map();
        /*requiredTimeline.data.forEach(tempOuter => {
            console.log(tempOuter)
            this.mapTimeline.forEach((lstTimeline, key) => {
                console.log(lstTimeline);
                console.log(key);
            });
        });*/
        requiredTimeline.data.forEach(tempOuter => {
            //for (let i = 0; i < requiredTimeline.data.length; i++) {
            //  tempOuter = requiredTimeline.data[i];
            //console.log('In');
            this.mapTimeline.forEach((lstTimeline, key) => {
                for (let j = 0; j < lstTimeline.length; j++) {
                    tempInner = lstTimeline[j];
                    if (tempInner.startTime > tempOuter.endTime) break; // exit iteration if the current element is outside the timeframe of main element
                    if (tempInner.startTime < tempOuter.endTime && tempInner.endTime > tempOuter.startTime) {
                        //Start/Stop time to be considered for calculation as it has to be altered due to partial overlap
                        if (tempInner.startTime >= tempOuter.startTime)
                            tempStartTime = tempInner.startTime;
                        else
                            tempStartTime = tempOuter.startTime;
                        if (tempInner.endTime <= tempOuter.endTime)
                            tempStopTime = tempInner.endTime;
                        else
                            tempStopTime = tempOuter.endTime;
                        //Push to dataset
                        this.addToMap(mapData, key, (tempStopTime - tempStartTime));
                    }
                }
            });
        });
        console.log(mapData);
        //this.objChart.data.labels = [...mapData.keys()];//X axis headers
        this.objChart.data.datasets = [...mapData.values()];//Y axis and data
        this.objChart.update();
    }
    handleMessage(ret) {
        alert('Test');
        console.log(ret);
    }
    /*changeHandler(event) {
        //var ctx = this.template.querySelector('canvas');
        this.chartProperties.type = event.target.value;
        this.objChart.destroy();
        //this.objChart = new Chart(ctx,this.chartProperties);
        console.log('Test');
    }
    runCode() {
        var ctx = this.template.querySelector('canvas');
        this.objChart = new Chart(ctx, this.chartProperties);
    }*/
    disconnectCallback() {
        unregisterAllListeners(this);
    }
}

const conversion = {
    Days: 86400000,
    Hours: 3600000,
    Minutes: 60000,
    Seconds: 1000
}

function getConversionRate(value) {
    let temp;
    console.log(value);
    for (var obj in conversion) {
        temp = (value / conversion[obj]).toFixed(2);
        console.log(temp);
        if (temp > 1)
            return obj;
    }
}