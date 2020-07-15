import { LightningElement, api, wire } from 'lwc';
import D3jsFile from '@salesforce/resourceUrl/D3js';
import { loadScript } from 'lightning/platformResourceLoader';//To load custom JS Scripts
import getHistoryOwner from '@salesforce/apex/HistoryGraphsCntrl.getHistoryOwner';
import { getRecord } from 'lightning/uiRecordApi';

export default class D3v4GanttChart extends LightningElement {
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
    @api leftMargin;
    @api recordId;
    fields;
    count;
    inputDataSet;
    clientWidth;
    @wire(getRecord, { recordId: '$recordId', fields: '$fields' })
    getSObject({ error, data }) {
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
                    d3.select(this.template.querySelector('.chart')).html('');
                    this.createChart();
                });
            }
        }
    }
    connectedCallback() {
        this.count = 0
        //alert(window.innerWidth());
        this.fields = new Array();
        this.strObjectField.split(',').forEach(iter => {
            this.fields.push(`${this.strObjectName}.${iter}`);
        });
        if (window.location.href.indexOf('devMode=true') != -1) {
            this.recordId = '5000I00001gV8ANQA0';
            this.strObjectName = 'Case';
            this.strHistoryObj = 'CaseHistory';
            this.strFieldName = 'Status,Owner';
            this.strHistoryFName = 'CaseId';
            this.strObjectField = 'Status,Owner.Name';
            this.strTitle = 'Case Status Timeline';
            this.leftMargin = 50;
        }

        this.inputDataSet = {
            strObjectName: this.strObjectName,
            strHistoryObj: this.strHistoryObj,
            recordId: this.recordId,
            strFieldName: this.strFieldName,
            strHistoryFName: this.strHistoryFName,
            strObjectField: this.strObjectField
        };

        Promise.all([
            loadScript(this, D3jsFile),
            getHistoryOwner(this.inputDataSet).then(ret => {
                console.log(ret);
                this.mapData = new Map();
                this.mapTimeline = new Map();
                let str = this.strObjectField.split(',');
                ret.forEach((element, index) => {
                    if (index === 0) this.baseField = str[0];
                    this.analyseData(element, str[index]);
                });
                console.log(this.mapTimeline);
            })
        ]).then(ret => {
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
            'green',
            'blue',
            'grey',
            'tomato',
            'yellowgreen',
            'brown',
            'teal'
        ];
        var tasks = [];
        var taskStatus = {};
        [...this.mapData.keys()].forEach(field => {//Status,Owner.name
            if (field != this.baseField) {//Owner.Name
                let lstChildKeys = this.mapData.get(field).keys();//User1,User2
                [...lstChildKeys].forEach(iter => {
                    taskStatus[iter] = colors.pop();
                });
                tasks = this.fabricateNewDataset(field);// Timeline for Owner.Name relative to Status
            }
        });
        var taskNames = [...this.mapData.get(this.baseField).keys()];
        //var taskNames = [ "D Job", "P Job", "E Job", "A Job", "N Job" ];

        tasks.sort(function (a, b) {
            return a.endDate - b.endDate;
        });
        var maxDate = tasks[tasks.length - 1].endDate;
        tasks.sort(function (a, b) {
            return a.startDate - b.startDate;
        });
        var minDate = tasks[0].startDate;

        var format = "%d %B %H:%M";//"%a %H:%M";
        //if(!this.objGant){
        if (!this.clientWidth)
            this.clientWidth = this.template.querySelector('.chart').clientWidth;
        var gantt = run(tasks, this.clientWidth, taskNames.length, this.leftMargin).taskTypes(taskNames).taskStatus(taskStatus).tickFormat(format);
        gantt(tasks, this.template.querySelector('.chart'), this.template.querySelector('.tag'), this.strFieldName);
        //}else{
        //  this.objGant.redraw(tasks, this.template.querySelector('.chart'), taskNames.length, this.template.querySelector('.tag'));
        //}
    }
    fabricateNewDataset(field) {
        let tempInner;//temp Timeline from this object
        let tempStartTime;//start Time
        let tempStopTime;//stop Time
        let mapData = new Array();
        this.mapTimeline.get(this.baseField).forEach((lstBaseTimeline, baseFieldValue) => {
            this.mapTimeline.get(field).forEach((lstTimeline, key) => {//Key is the field value like the Name of the Owner
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
                            mapData.push({ startDate: new Date(tempStartTime), endDate: new Date(tempStopTime), taskName: baseFieldValue, status: key });
                        }
                    }
                });
            })
        });
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
    for (var obj in conversion) {
        temp = (value / conversion[obj]).toFixed(2);
        if (temp > 1)
            return obj;
    }
}

let run = function (tasks, clientWidth, yCount, leftMargin) {
    var FIT_TIME_DOMAIN_MODE = "fit";
    var FIXED_TIME_DOMAIN_MODE = "fixed";

    var margin = {
        top: 20,
        right: 10,
        bottom: 120,
        left: leftMargin
    };
    var timeDomainStart = d3.timeDay.offset(new Date(), -3);
    var timeDomainEnd = d3.timeHour.offset(new Date(), +3);
    var timeDomainMode = FIT_TIME_DOMAIN_MODE;// fixed or fit
    var taskTypes = [];
    var taskStatus = [];
    var height = 30 * yCount;//divData.clientWidth/4 - margin.top - margin.bottom - 5;// 50 * yCount;//- margin.top - margin.bottom - 5;//document.body.clientHeight
    var width = clientWidth - margin.right - margin.left - 5;
    var tickFormat = "%d %B %H:%M";

    var keyFunction = function (d) {
        return d.startDate + d.endDate;//+ d.taskName
    };

    var rectTransform = function (d) {
        return "translate(" + x(d.startDate) + "," + y(d.taskName) + ")";
    };

    var x, y, xAxis, yAxis;

    initAxis();

    var initTimeDomain = function () {
        if (timeDomainMode === FIT_TIME_DOMAIN_MODE) {
            if (tasks === undefined || tasks.length < 1) {
                timeDomainStart = d3.time.day.offset(new Date(), -3);
                timeDomainEnd = d3.time.hour.offset(new Date(), +3);
                return;
            }
            tasks.sort(function (a, b) {
                return a.endDate - b.endDate;
            });
            timeDomainEnd = tasks[tasks.length - 1].endDate;
            tasks.sort(function (a, b) {
                return a.startDate - b.startDate;
            });
            timeDomainStart = tasks[0].startDate;
        }
    };

    function initAxis() {
        x = d3.scaleTime().domain([timeDomainStart, timeDomainEnd]).range([0, width]).nice().clamp(true);

        y = d3.scaleBand().domain(taskTypes).rangeRound([0, height], .1);// - margin.top - margin.bottom

        xAxis = d3.axisBottom().scale(x).tickFormat(d3.timeFormat(tickFormat)).ticks(8)
            .tickSize(8).tickPadding(8);

        yAxis = d3.axisLeft().scale(y).tickSize(0);
    };

    function gantt(tasks, chartDiv, helpText, fields) {

        initTimeDomain();
        initAxis();

        var svg = d3.select(chartDiv)
            .append("svg")
            .attr("class", "chart")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("class", "gantt-chart")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

        //Creating Rectangles

        var rect = svg.selectAll(".chart")
            .data(tasks, keyFunction).enter()
            .append("rect");

        rect.attr("rx", 5)
            .attr("ry", 5)
            .attr("class", "rect")
            .attr("style", function (d) {
                if (taskStatus[d.status] == null) { return "bar"; }
                return `fill : ${taskStatus[d.status]};`;
            })
            .attr("y", 0)
            .attr("transform", rectTransform)
            .attr("height", function (d) { return 12; })
            .attr("width", function (d) {
                return (x(d.endDate) - x(d.startDate));
            });
        rect.on('mouseover', function (e) {
            let age = e.endDate.getTime() - e.startDate.getTime();
            let lstData = fields.split(',');
            let rate = getConversionRate(age);
            var tag = `${lstData[0]}: ${e.taskName} <br/>`;
            if (lstData.length > 1)
                tag += `${lstData[1]}: ${e.status} <br/>`;
            tag += `Time Spent: ${(age / conversion[rate]).toFixed(2)} ${rate}<br/>` +
                `Starts: ${e.startDate} <br/>` +
                `Ends: ${e.endDate}<br/>`;
            d3.select(helpText)
                .style('visibility', 'visible')
                .html(tag);
        }).on('mouseout', function () {
            d3.select(helpText)
                .style('visibility', 'hidden');
        });

        //Create Axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0, " + (height) + ")")//- margin.top - margin.bottom
            .transition()
            .call(xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start")
            .style("font-family", '"Salesforce Sans", Arial, sans-serif')
            .style("color", 'rgb(150, 148, 146)');

        svg.append("g")
            .attr("class", "y axis")
            .transition()
            .call(yAxis)
            .selectAll("text")
            .attr("y", -7)
            .style("font-family", '"Salesforce Sans", Arial, sans-serif')
            .style("color", 'rgb(150, 148, 146)');

        return gantt;

    };

    /*gantt.redraw = function (tasks, divData, yCount, helpText) {
        height = 30 * yCount;
        initTimeDomain();
        initAxis();

        var svg = d3.select(divData);

        var ganttChartGroup = svg.select(".gantt-chart");
        var rect = ganttChartGroup.selectAll("rect").data(tasks, keyFunction);

        rect.enter()
            .insert("rect", ":first-child")
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("style", function (d) {
                if (taskStatus[d.status] == null) { return "bar"; }
                return `fill : ${taskStatus[d.status]};`;
            })
            .transition()
            .attr("y", 0)
            .attr("transform", rectTransform)
            .attr("height", function (d) { return y.range()[1]; })
            .attr("width", function (d) {
                return (x(d.endDate) - x(d.startDate));
            });

        rect.transition()
            .attr("transform", rectTransform)
            .attr("height", function (d) { return y.range()[1]; })
            .attr("width", function (d) {
                return (x(d.endDate) - x(d.startDate));
            });
        rect.on('mouseover', function (e) {
            let age = e.endDate.getTime() - e.startDate.getTime();
            let lstData = fields.split(',');
            let rate = getConversionRate(age);
            var tag = `${lstData[0]}: ${e.taskName} <br/>`;
            if (lstData.length > 1)
                tag += `${lstData[1]}: ${e.status} <br/>`;
            tag += `Time Spent: ${(age / conversion[rate]).toFixed(2)} ${rate}<br/>` +
                `Starts: ${e.startDate} <br/>` +
                `Ends: ${e.endDate}<br/>`;
            d3.select(helpText)
                .style('visibility', 'visible')
                .html(tag);
        }).on('mouseout', function () {
            d3.select(helpText)
                .style('visibility', 'hidden');
        }); Ï

        rect.exit().remove();

        svg.select(".x").transition().call(xAxis);
        svg.select(".y").transition().call(yAxis);

        return gantt;
    };*/

    gantt.margin = function (value) {
        if (!arguments.length)
            return margin;
        margin = value;
        return gantt;
    };

    gantt.timeDomain = function (value) {
        if (!arguments.length)
            return [timeDomainStart, timeDomainEnd];
        timeDomainStart = +value[0], timeDomainEnd = +value[1];
        return gantt;
    };

    /**
  * @param {string}
  *                vale The value can be "fit" - the domain fits the data or
  *                "fixed" - fixed domain.
  */
    gantt.timeDomainMode = function (value) {
        if (!arguments.length)
            return timeDomainMode;
        timeDomainMode = value;
        return gantt;

    };

    gantt.taskTypes = function (value) {
        if (!arguments.length)
            return taskTypes;
        taskTypes = value;
        return gantt;
    };

    gantt.taskStatus = function (value) {
        if (!arguments.length)
            return taskStatus;
        taskStatus = value;
        return gantt;
    };

    gantt.width = function (value) {
        if (!arguments.length)
            return width;
        width = +value;
        return gantt;
    };

    gantt.height = function (value) {
        if (!arguments.length)
            return height;
        height = +value;
        return gantt;
    };

    gantt.tickFormat = function (value) {
        if (!arguments.length)
            return tickFormat;
        tickFormat = value;
        return gantt;
    };

    return gantt;
};