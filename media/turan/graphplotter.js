/**
 * Class for handeling graph plotting of pulse data.
 * Still needs loads of work and is only a cut/paste from template for now
 */
var plot;
var GraphPlotter = {
    choiceContainer: null,
    datasets: null,
    backendUrl: null,

    findMinMaxAvg: function (from, to) {
        var avgs = {};
        for (key in this.datasets) {
            var avg = { start: null, end: null, sum: 0, num: 0, avg: null, min: null, max: null, incline: null, decline: null, length: null };
            var lastAltitude = null;
            var label = this.datasets[key].label;
            for (l in this.datasets[key].data) {
                var pos = this.datasets[key].data[l][0];
                if (from != null && (pos >= from && pos <= to)) {
                    if (avg.start == null)
                        avg.start = pos;
                    avg.end = pos;

                    var value = this.datasets[key].data[l][1];
                    if (avg.min == null)
                        avg.min = value;
                    else
                        avg.min = Math.min(avg.min, value);

                    if (avg.max == null)
                        avg.max = value;
                    else
                        avg.max = Math.max(avg.max, value);

                    avg.sum += value;
                    avg.num++;

                    if (key == "altitude") {
                        if (avg.incline == null) 
                            avg.incline = 0;
                        if (avg.decline == null) 
                            avg.decline = 0;

                        var altitude = this.datasets[key].data[l][1];
                        if (lastAltitude != null) {
                            if (altitude > lastAltitude) {
                                avg.incline += altitude - lastAltitude;
                            } else if (altitude < lastAltitude) {
                                avg.decline += lastAltitude - altitude;
                            }
                        }
                        lastAltitude = altitude;
                    }
                }
            }
            if (avg.num > 0) {
                avg.avg = avg.sum / avg.num;
                avg.label = this.datasets[key].label;
                avgs[key] = avg;
            }
        }
        return avgs;
    },
    plotAccordingToChoices: function(ranges) {
        data = [];
        var that = this;
        var minIndex = null;
        var maxIndex = null;
        var min = null;
        var max = null;
        var xaxisattrs = { 
            tickDecimals: 0,
        };
        if (ranges.xaxis != undefined) {
            var xaxe = plot.getXAxes()[0];
            min = ranges.xaxis.from;
            max = ranges.xaxis.to;
            xaxisattrs.min = min;
            xaxisattrs.max = max;

            for (k in this.datasets.index) {
                if (min >= this.datasets.index[k])
                    minIndex = k;
                if (max <= this.datasets.index[k]) {
                    maxIndex = k;
                    break;
                }
            }
        }
        $("#choices").find("input:checked").each(function () {
            var key = $(this).attr("name");
            if (key && that.datasets[key])
                data.push(that.datasets[key]);
        });

        if (data.length > 0) {
            plot = $.plot($("#tripdiv"), data, {
                yaxes: [{ min: 0 }, { position: "right", min: 80 }, { position: "right"}],
                xaxis: xaxisattrs,
                legend: { container: $("#tripdiv_legend") },
                grid: { 
                    hoverable: true, 
                    clickable: true,
                },
                selection: { mode: "x" }
            });
        }

        if (minIndex != null && maxIndex != null) {
            $.getJSON(this.backendUrl, { start: minIndex, stop: maxIndex }, function (avgs) {
                var items = $("#averages ul .data");
                $("#averages h4").removeClass("hidden");

                $.each(items, function (i, elem) {
                    for (k in elem.classList) {
                        if (elem.classList[k] in avgs) {
                            var key = elem.classList[k];
                            var e = $(elem);
                            e.text(Math.round(avgs[key] * 10) / 10);
                            e.parents(".hidden").removeClass("hidden");
                        }
                    }
                });
            });
        }

    },
    showTooltip: function (x, y, contents) {
        $('<div id="tooltip">' + contents + '</div>').css( {
            position: 'absolute',
            display: 'none',
            top: y + 5,
            left: x + 5,
            border: '1px solid #fdd',
            padding: '2px',
            'background-color': '#fee',
            opacity: 0.80
        }).appendTo("body").fadeIn(200);
    },
    init: function(args) {
        this.datasets = args.datasets;
        var backendUrl = args.backendUrl;

        var that = this;
        this.backendUrl = backendUrl;
        this.choiceContainer = $("#choices");

        $.each(this.datasets, function(key, val) {
            that.choiceContainer.append('<br/><input type="checkbox" name="' + key +
                '" checked="checked" id="chk_' + key + '"><label for="chk_' + key + 
                '">' + val.label + '</label></input>');
        });
        this.choiceContainer.append('<br /><input type="reset" value="Reset zoom" />');
        this.choiceContainer.find("input").bind("click", function(evt) {
                that.plotAccordingToChoices({}); 
        });
        this.plotAccordingToChoices({});
        var previousPoint = null;
        $("#tripdiv").bind("plothover", function (event, pos, item) {
            var y = 0;
            if (pos.y)
                y = pos.y;
            else
                y = pos.y2;

            if (item) {
                if (previousPoint != item.datapoint) {
                    previousPoint = item.datapoint;
                    
                    $("#tooltip").remove();
                    var x = item.datapoint[0].toFixed(2),
                        y = item.datapoint[1].toFixed(2);
                    
                    that.showTooltip(item.pageX, item.pageY,
                    item.series.label + " at " + x + " is " + y);
                }
            }
            else {
                $("#tooltip").remove();
                previousPoint = null;            
            }
        });

        $("#tripdiv").bind("plotclick", function (event, pos, item) {
            if (item) {
                $("#clickdata").text("You clicked point " + item.dataIndex + " in " + item.series.label + ".");
                plot.highlight(item.series, item.datapoint);
            }
        });


        $("#tripdiv").bind("plotselected", function (event, ranges) {
            that.plotAccordingToChoices(ranges);
        });
    }
};

