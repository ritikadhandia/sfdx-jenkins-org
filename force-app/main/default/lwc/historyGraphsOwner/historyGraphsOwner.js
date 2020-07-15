import { LightningElement, api, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';//To load custom JS Scripts
import chartsJS from '@salesforce/resourceUrl/ChartJS23';
import getHistoryOwner from '@salesforce/apex/HistoryGraphsCntrl.getHistoryOwner';
import { getRecord } from 'lightning/uiRecordApi';

export default class HistoryGraphs extends LightningElement {
    mapData;
    conversionRate;
    objChart;
    chartProperties;
    mapTimeline;
    baseField;
    @api strObjectName;
    @api strHistoryObj;
    @api strFieldName;
    @api strTitle;
    @api strHistoryFName;
    @api strObjectField;
    @api strColorScheme;
    @api recordId;
    fields;
    count;
    inputDataSet;
    @wire(getRecord, { recordId: '$recordId', fields: '$fields' })
    getSObject({ error, data }) {
        console.log(data);
        console.log(error);
        if (data) {
            this.count++;
            console.log(this.count);
            if (this.count > 1) {
                getHistoryOwner(this.inputDataSet).then(ret => {
                    console.log(ret);
                    this.mapData = new Map();
                    this.mapTimeline = new Map();
                    let str = this.strObjectField.split(',');
                    ret.forEach((element, index) => {
                        if (index === 0) this.baseField = str[0];
                        this.analyseData(element, str[index]);
                    });
                    this.createChart();
                });
            }
        }
    }
    connectedCallback() {
        this.count = 0;
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
        if (window.location.href.indexOf('devMode=true') != -1) {
            this.strObjectName = 'Case';
            this.strHistoryObj = 'CaseHistory';
            this.recordId = '5000I00001zWsHtQAK';
            this.strFieldName = 'Status,Owner';
            this.strHistoryFName = 'CaseId';
            this.strObjectField = 'Status,Owner.Name';
            this.strTitle = 'Case Status';
            this.strColorScheme = 'rgba(23, 48, 91, 1)';
        }
        this.fields = new Array();
        this.strObjectField.split(',').forEach(iter => {
            this.fields.push(`${this.strObjectName}.${iter}`);
        });
        this.inputDataSet = {
            strObjectName: this.strObjectName,
            strHistoryObj: this.strHistoryObj,
            recordId: this.recordId,
            strFieldName: this.strFieldName,
            strHistoryFName: this.strHistoryFName,
            strObjectField: this.strObjectField
        };

        Promise.all([
            loadScript(this, chartsJS),
            getHistoryOwner(this.inputDataSet).then(ret => {
                console.log(ret);
                this.mapData = new Map();
                this.mapTimeline = new Map();
                let str = this.strObjectField.split(',');
                ret.forEach((element, index) => {
                    if (index === 0) this.baseField = str[0];
                    this.analyseData(element, str[index]);
                });
            })
        ]).then(ret => {
            //console.log(this.mapData);
            this.createChart()
        });
    }
    analyseData(data, field) {
        let mapData = new Map();
        let oldTime;// To maintain start time
        let iter;//Iteration variable
        let newTime;//temp variable
        let mapTimeline = new Map();//Variable to maintain timeline span per entry
        //Format the first data so that all the elements are symetric for usage  
        iter = data[0];
        if (data.length > 1)
            iter['NewValue'] = data[1].OldValue;
        else if (field.indexOf('.') === -1) //This if else is added to work for Relational fields where the name is on the other object
            iter['NewValue'] = iter[field];
        else {
            let strSplit = field.split('.');
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
                if (!mapTimeline.has(iter.OldValue)) //Initialize value on the map
                    mapTimeline.set(iter.OldValue, new Array());
                mapTimeline.get(iter.OldValue).push({ startTime: oldTime, endTime: newTime });
            }
            oldTime = newTime;
        }
        iter = data[data.length - 1];
        //calculate the current entry on the data with current time 
        this.addToMap(mapData, iter.NewValue, ((new Date()).getTime() - oldTime));
        //Timeline Data
        if (!mapTimeline.has(iter.NewValue)) //Initialize value on the map
            mapTimeline.set(iter.NewValue, new Array());
        mapTimeline.get(iter.NewValue).push({ startTime: oldTime, endTime: (new Date()).getTime() });
        //check what would be the division factor - days/hours/minutes/seconds
        if (!this.conversionRate)
            this.conversionRate = getConversionRate([...mapData.values()].sort(function (a, b) { return b - a })[0]);
        console.log(this.conversionRate);
        //Convert the dataset to the required division factor for better visibility
        mapData.forEach((value, key) => {
            mapData.set(key, (value / conversion[this.conversionRate]).toFixed(2))
        });
        this.mapData.set(field, mapData);
        this.mapTimeline.set(field, mapTimeline);
    }
    addToMap(mapData, value, timeDiff) {
        if (mapData.has(value))
            mapData.set(value, mapData.get(value) + timeDiff);
        else
            mapData.set(value, timeDiff);
    }
    createChart() {
        var colors = [
            'rgba(62, 159, 222, 1)',
            'rgba(48, 165, 154, 1)',
            'rgba(132, 220, 214, 1)',
            'rgba(222, 159, 0, 1)',
            'rgba(223, 205, 114, 1)'
        ];
        console.log('Creating Chart');
        //console.log(this.mapData.get(this.baseField));
        var labels = [...this.mapData.get(this.baseField).keys()];//X axis headers
        var datasets = [];// List of multiple datasets // Each dataset is an object where the label is the key & data is the list of corresponding data
        //console.log(this.mapData.values());
        datasets.push({
            label: this.strTitle,
            data: [...this.mapData.get(this.baseField).values()],
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
        console.log(labels);
        //console.log(datasets);
        console.log(this.mapData.keys());
        [...this.mapData.keys()].forEach((field, index) => {//Status,Owner.name
            if (field != this.baseField) {//Owner.Name
                let lstChildKeys = this.mapData.get(field).keys();//User1,User2
                let timeline = this.fabricateNewDataset(field);// Timeline for Owner.Name relative to Status
                //console.log(timeline);
                [...lstChildKeys].forEach((iter, indexI) => {//User1
                    let data = new Array()
                    labels.forEach(baseLabelIter => {//New,
                        if (timeline.has(baseLabelIter) && timeline.get(baseLabelIter).has(iter))
                            data.push((timeline.get(baseLabelIter).get(iter) / conversion[this.conversionRate]).toFixed(2));
                        else
                            data.push(0);
                    });
                    datasets.push({
                        label: iter,
                        data: data,
                        fill: false,
                        borderWidth: 1.5,
                        backgroundColor: colors[indexI * index],
                        borderColor: colors[indexI * index],
                        pointBackgroundColor: "#FFFFFF",
                        pointBorderWidth: 4,
                        pointHoverRadius: 8,
                        pointRadius: 6,
                        pointHitRadius: 10,
                    });
                });
            }
        });
        if (this.objChart) {
            this.objChart.data.labels = labels;
            this.objChart.data.datasets = datasets;
            this.objChart.update();
        } else {
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
                        display: true
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
                    }
                }
            }
            this.objChart = new Chart(ctx, this.chartProperties);
        }
    }
    //Method the creates new dataset for the required list of timelines
    /* Return From this method
    {
        'New' : {
            'User1': 212,
            'User2': 21123,
            'User3': 2145,
        },
        'In Progress' : {
            'User1': 212,
            'User2': 21123,
            'User3': 2145,
        }
    }
    */
    fabricateNewDataset(field) {
        let tempOuter;
        let tempInner;//temp Timeline from this object
        let tempStartTime;//start Time
        let tempStopTime;//stop Time
        let mapData = new Map();
        //console.log(this.mapTimeline);
        this.mapTimeline.get(this.baseField).forEach((lstBaseTimeline, baseFieldValue) => {
            //console.log(lstBaseTimeline);
            //console.log(baseFieldValue);
            mapData.set(baseFieldValue, new Map());
            this.mapTimeline.get(field).forEach((lstTimeline, key) => {//Key is the field value like the Name of the Owner
                //console.log(key);
                //console.log(lstTimeline)
                lstBaseTimeline.forEach(tempOuter => {
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
                            this.addToMap(mapData.get(baseFieldValue), key, (tempStopTime - tempStartTime));
                        }
                    }
                });
            })
        });
        //console.log(this.mapTimeline);
        return mapData;
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
    //console.log(value);
    for (var obj in conversion) {
        temp = (value / conversion[obj]).toFixed(2);
        //console.log(temp);
        if (temp > 1)
            return obj;
    }
}