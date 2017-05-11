(function () {
    'use strict';

    var CANDLE_NUMBER = 120,
        CANDLE_FRAME = 30;

    function Chart($element) {
        var w = $element.width(),
            h = $element.height(),
            elem = $element.children('.chart').get(0),
            margins = {left: 60, top: 20, right: 10, bottom: 30};

        this.width = w - margins.left - margins.right;
        this.height = h - margins.top - margins.bottom;

        this.x = techan.scale.financetime().range([0, this.width]);
        this.y = d3.scaleLinear().range([this.height, 0]);

        this.candlestick = techan.plot.candlestick().xScale(this.x).yScale(this.y);
        this.accessor = this.candlestick.accessor();

        this.xAxis = d3.axisBottom(this.x);
        this.yAxis = d3.axisLeft(this.y);

        this.svg = d3
            .select(elem)
            .append('svg')
            .attr('width', this.width + margins.left + margins.right)
            .attr('height', this.height + margins.top + margins.bottom);

        this.chart = this.svg
            .append('g')
            .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

        this.chart.append('g')
            .attr('class', 'candlestick');

        this.chart.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + this.height + ')');

        this.chart.append('g')
            .attr('class', 'y axis');
    }

    Chart.prototype.draw = function (data) {
        this.x.domain(data.map(this.accessor.d));
        this.y.domain(techan.scale.plot.ohlc(data, this.accessor).domain());

        this.chart.selectAll('g.candlestick').datum(data).call(this.candlestick);
        this.chart.selectAll('g.x.axis').call(this.xAxis);
        this.chart.selectAll('g.y.axis').call(this.yAxis);
    };

    Chart.prototype.prepareData = function (rawData) {
        var self = this;
        return rawData.map(function (candle) {
            return {
                date: candle.timestamp,
                open: +candle.open,
                high: +candle.high,
                low: +candle.low,
                close: +candle.close,
                volume: +candle.volume
            };
        }).sort(function (a, b) {
            return d3.ascending(self.accessor.d(a), self.accessor.d(b));
        });
    };

    function ChartController($element, $timeout, $interval, datafeedApiService, utilsService) {
        var ctrl = this;

        $timeout(function () {
            ctrl.chart = new Chart($element);

            refreshCandles();

            $interval(refreshCandles, 5000);

            ctrl.$onChanges = function (changes) {
                if (changes.pair) {
                    refreshCandles();
                }
            };
        }, 100);

        function refreshCandles() {
            var pair = ctrl.pair;
            if (pair) {
                if (utilsService.isTestnet()) {
                    pair = utilsService.testnetSubstitutePair(pair);
                }

                datafeedApiService
                    .getLastCandles(pair, CANDLE_NUMBER, CANDLE_FRAME)
                    .then(function (response) {
                        var candles = ctrl.chart.prepareData(response);
                        ctrl.chart.draw(candles);
                    });
            }
        }
    }

    ChartController.$inject = ['$element', '$timeout', '$interval', 'datafeedApiService', 'utilsService'];

    angular
        .module('app.dex')
        .component('wavesDexChart', {
            controller: ChartController,
            bindings: {
                pair: '<'
            },
            templateUrl: 'dex/chart.component'
        });
})();
