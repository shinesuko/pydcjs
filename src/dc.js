/*!
 *  dc 2.0.0-beta.32
 *  http://dc-js.github.io/dc.js/
 *  Copyright 2012-2016 Nick Zhu & the dc.js Developers
 *  https://github.com/dc-js/dc.js/blob/master/AUTHORS
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function() { function _dc(d3, crossfilter) {
'use strict';

/**
 * The entire dc.js library is scoped under the **dc** name space. It does not introduce
 * anything else into the global name space.
 *
 * Most `dc` functions are designed to allow function chaining, meaning they return the current chart
 * instance whenever it is appropriate.  The getter forms of functions do not participate in function
 * chaining because they return values that are not the chart, although some,
 * such as {@link dc.baseMixin#svg .svg} and {@link dc.coordinateGridMixin#xAxis .xAxis},
 * return values that are themselves chainable d3 objects.
 * @namespace dc
 * @version 2.0.0-beta.32
 * @example
 * // Example chaining
 * chart.width(300)
 *      .height(300)
 *      .filter('sunday');
 */
/*jshint -W079*/
var dc = {
    version: '2.0.0-beta.32',
    constants: {
        CHART_CLASS: 'dc-chart',
        DEBUG_GROUP_CLASS: 'debug',
        STACK_CLASS: 'stack',
        DESELECTED_CLASS: 'deselected',
        SELECTED_CLASS: 'selected',
        NODE_INDEX_NAME: '__index__',
        GROUP_INDEX_NAME: '__group_index__',
        DEFAULT_CHART_GROUP: '__default_chart_group__',
        EVENT_DELAY: 40,
        NEGLIGIBLE_NUMBER: 1e-10
    },
    _renderlet: null
};
/*jshint +W079*/

/**
 * The dc.chartRegistry object maintains sets of all instantiated dc.js charts under named groups
 * and the default group.
 *
 * A chart group often corresponds to a crossfilter instance. It specifies
 * the set of charts which should be updated when a filter changes on one of the charts or when the
 * global functions {@link dc.filterAll dc.filterAll}, {@link dc.refocusAll dc.refocusAll},
 * {@link dc.renderAll dc.renderAll}, {@link dc.redrawAll dc.redrawAll}, or chart functions
 * {@link dc.baseMixin#renderGroup baseMixin.renderGroup},
 * {@link dc.baseMixin#redrawGroup baseMixin.redrawGroup} are called.
 *
 * @namespace chartRegistry
 * @memberof dc
 * @type {{has, register, deregister, clear, list}}
 */
dc.chartRegistry = (function () {
    // chartGroup:string => charts:array
    var _chartMap = {};

    function initializeChartGroup (group) {
        if (!group) {
            group = dc.constants.DEFAULT_CHART_GROUP;
        }

        if (!_chartMap[group]) {
            _chartMap[group] = [];
        }

        return group;
    }

    return {
        /**
         * Determine if a given chart instance resides in any group in the registry.
         * @method has
         * @memberof dc.chartRegistry
         * @param {Object} chart dc.js chart instance
         * @returns {Boolean}
         */
        has: function (chart) {
            for (var e in _chartMap) {
                if (_chartMap[e].indexOf(chart) >= 0) {
                    return true;
                }
            }
            return false;
        },

        /**
         * Add given chart instance to the given group, creating the group if necessary.
         * If no group is provided, the default group `dc.constants.DEFAULT_CHART_GROUP` will be used.
         * @method register
         * @memberof dc.chartRegistry
         * @param {Object} chart dc.js chart instance
         * @param {String} [group] Group name
         */
        register: function (chart, group) {
            group = initializeChartGroup(group);
            _chartMap[group].push(chart);
        },

        /**
         * Remove given chart instance from the given group, creating the group if necessary.
         * If no group is provided, the default group `dc.constants.DEFAULT_CHART_GROUP` will be used.
         * @method deregister
         * @memberof dc.chartRegistry
         * @param {Object} chart dc.js chart instance
         * @param {String} [group] Group name
         */
        deregister: function (chart, group) {
            group = initializeChartGroup(group);
            for (var i = 0; i < _chartMap[group].length; i++) {
                if (_chartMap[group][i].anchorName() === chart.anchorName()) {
                    _chartMap[group].splice(i, 1);
                    break;
                }
            }
        },

        /**
         * Clear given group if one is provided, otherwise clears all groups.
         * @method clear
         * @memberof dc.chartRegistry
         * @param {String} group Group name
         */
        clear: function (group) {
            if (group) {
                delete _chartMap[group];
            } else {
                _chartMap = {};
            }
        },

        /**
         * Get an array of each chart instance in the given group.
         * If no group is provided, the charts in the default group are returned.
         * @method list
         * @memberof dc.chartRegistry
         * @param {String} [group] Group name
         * @returns {Array<Object>}
         */
        list: function (group) {
            group = initializeChartGroup(group);
            return _chartMap[group];
        }
    };
})();

/**
 * Add given chart instance to the given group, creating the group if necessary.
 * If no group is provided, the default group `dc.constants.DEFAULT_CHART_GROUP` will be used.
 * @memberof dc
 * @method registerChart
 * @param {Object} chart dc.js chart instance
 * @param {String} [group] Group name
 */
dc.registerChart = function (chart, group) {
    dc.chartRegistry.register(chart, group);
};

/**
 * Remove given chart instance from the given group, creating the group if necessary.
 * If no group is provided, the default group `dc.constants.DEFAULT_CHART_GROUP` will be used.
 * @memberof dc
 * @method deregisterChart
 * @param {Object} chart dc.js chart instance
 * @param {String} [group] Group name
 */
dc.deregisterChart = function (chart, group) {
    dc.chartRegistry.deregister(chart, group);
};

/**
 * Determine if a given chart instance resides in any group in the registry.
 * @memberof dc
 * @method hasChart
 * @param {Object} chart dc.js chart instance
 * @returns {Boolean}
 */
dc.hasChart = function (chart) {
    return dc.chartRegistry.has(chart);
};

/**
 * Clear given group if one is provided, otherwise clears all groups.
 * @memberof dc
 * @method deregisterAllCharts
 * @param {String} group Group name
 */
dc.deregisterAllCharts = function (group) {
    dc.chartRegistry.clear(group);
};

/**
 * Clear all filters on all charts within the given chart group. If the chart group is not given then
 * only charts that belong to the default chart group will be reset.
 * @memberof dc
 * @method filterAll
 * @param {String} [group]
 */
dc.filterAll = function (group) {
    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {
        charts[i].filterAll();
    }
};

/**
 * Reset zoom level / focus on all charts that belong to the given chart group. If the chart group is
 * not given then only charts that belong to the default chart group will be reset.
 * @memberof dc
 * @method refocusAll
 * @param {String} [group]
 */
dc.refocusAll = function (group) {
    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {
        if (charts[i].focus) {
            charts[i].focus();
        }
    }
};

/**
 * Re-render all charts belong to the given chart group. If the chart group is not given then only
 * charts that belong to the default chart group will be re-rendered.
 * @memberof dc
 * @method renderAll
 * @param {String} [group]
 */
dc.renderAll = function (group) {
    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {
        charts[i].render();
    }

    if (dc._renderlet !== null) {
        dc._renderlet(group);
    }
};

/**
 * Redraw all charts belong to the given chart group. If the chart group is not given then only charts
 * that belong to the default chart group will be re-drawn. Redraw is different from re-render since
 * when redrawing dc tries to update the graphic incrementally, using transitions, instead of starting
 * from scratch.
 * @memberof dc
 * @method redrawAll
 * @param {String} [group]
 */
dc.redrawAll = function (group) {
    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {
        charts[i].redraw();
    }

    if (dc._renderlet !== null) {
        dc._renderlet(group);
    }
};

/**
 * If this boolean is set truthy, all transitions will be disabled, and changes to the charts will happen
 * immediately
 * @memberof dc
 * @method disableTransitions
 * @type {Boolean}
 * @default false
 */
dc.disableTransitions = false;

dc.transition = function (selections, duration, callback, name) {
    if (duration <= 0 || duration === undefined || dc.disableTransitions) {
        return selections;
    }

    var s = selections
        .transition(name)
        .duration(duration);

    if (typeof(callback) === 'function') {
        callback(s);
    }

    return s;
};

/* somewhat silly, but to avoid duplicating logic */
dc.optionalTransition = function (enable, duration, callback, name) {
    if (enable) {
        return function (selection) {
            return dc.transition(selection, duration, callback, name);
        };
    } else {
        return function (selection) {
            return selection;
        };
    }
};

// See http://stackoverflow.com/a/20773846
dc.afterTransition = function (transition, callback) {
    if (transition.empty() || !transition.duration) {
        callback.call(transition);
    } else {
        var n = 0;
        transition
            .each(function () { ++n; })
            .each('end', function () {
                if (!--n) {
                    callback.call(transition);
                }
            });
    }
};

/**
 * @namespace units
 * @memberof dc
 * @type {{}}
 */
dc.units = {};

/**
 * The default value for {@link dc.coordinateGridMixin#xUnits .xUnits} for the
 * {@link dc.coordinateGridMixin Coordinate Grid Chart} and should
 * be used when the x values are a sequence of integers.
 * It is a function that counts the number of integers in the range supplied in its start and end parameters.
 * @method integers
 * @memberof dc.units
 * @see {@link dc.coordinateGridMixin#xUnits coordinateGridMixin.xUnits}
 * @example
 * chart.xUnits(dc.units.integers) // already the default
 * @param {Number} start
 * @param {Number} end
 * @return {Number}
 */
dc.units.integers = function (start, end) {
    return Math.abs(end - start);
};

/**
 * This argument can be passed to the {@link dc.coordinateGridMixin#xUnits .xUnits} function of the to
 * specify ordinal units for the x axis. Usually this parameter is used in combination with passing
 * {@link https://github.com/mbostock/d3/wiki/Ordinal-Scales d3.scale.ordinal} to
 * {@link dc.coordinateGridMixin#x .x}.
 * It just returns the domain passed to it, which for ordinal charts is an array of all values.
 * @method ordinal
 * @memberof dc.units
 * @see {@link https://github.com/mbostock/d3/wiki/Ordinal-Scales d3.scale.ordinal}
 * @see {@link dc.coordinateGridMixin#xUnits coordinateGridMixin.xUnits}
 * @see {@link dc.coordinateGridMixin#x coordinateGridMixin.x}
 * @example
 * chart.xUnits(dc.units.ordinal)
 *      .x(d3.scale.ordinal())
 * @param {*} start
 * @param {*} end
 * @param {Array<String>} domain
 * @return {Array<String>}
 */
dc.units.ordinal = function (start, end, domain) {
    return domain;
};

/**
 * @namespace fp
 * @memberof dc.units
 * @type {{}}
 */
dc.units.fp = {};
/**
 * This function generates an argument for the {@link dc.coordinateGridMixin Coordinate Grid Chart}
 * {@link dc.coordinateGridMixin#xUnits .xUnits} function specifying that the x values are floating-point
 * numbers with the given precision.
 * The returned function determines how many values at the given precision will fit into the range
 * supplied in its start and end parameters.
 * @method precision
 * @memberof dc.units.fp
 * @see {@link dc.coordinateGridMixin#xUnits coordinateGridMixin.xUnits}
 * @example
 * // specify values (and ticks) every 0.1 units
 * chart.xUnits(dc.units.fp.precision(0.1)
 * // there are 500 units between 0.5 and 1 if the precision is 0.001
 * var thousandths = dc.units.fp.precision(0.001);
 * thousandths(0.5, 1.0) // returns 500
 * @param {Number} precision
 * @return {Function} start-end unit function
 */
dc.units.fp.precision = function (precision) {
    var _f = function (s, e) {
        var d = Math.abs((e - s) / _f.resolution);
        if (dc.utils.isNegligible(d - Math.floor(d))) {
            return Math.floor(d);
        } else {
            return Math.ceil(d);
        }
    };
    _f.resolution = precision;
    return _f;
};

dc.round = {};
dc.round.floor = function (n) {
    return Math.floor(n);
};
dc.round.ceil = function (n) {
    return Math.ceil(n);
};
dc.round.round = function (n) {
    return Math.round(n);
};

dc.override = function (obj, functionName, newFunction) {
    var existingFunction = obj[functionName];
    obj['_' + functionName] = existingFunction;
    obj[functionName] = newFunction;
};

dc.renderlet = function (_) {
    if (!arguments.length) {
        return dc._renderlet;
    }
    dc._renderlet = _;
    return dc;
};

dc.instanceOfChart = function (o) {
    return o instanceof Object && o.__dcFlag__ && true;
};

dc.errors = {};

dc.errors.Exception = function (msg) {
    var _msg = msg || 'Unexpected internal error';

    this.message = _msg;

    this.toString = function () {
        return _msg;
    };
    this.stack = (new Error()).stack;
};
dc.errors.Exception.prototype = Object.create(Error.prototype);
dc.errors.Exception.prototype.constructor = dc.errors.Exception;

dc.errors.InvalidStateException = function () {
    dc.errors.Exception.apply(this, arguments);
};

dc.errors.InvalidStateException.prototype = Object.create(dc.errors.Exception.prototype);
dc.errors.InvalidStateException.prototype.constructor = dc.errors.InvalidStateException;

dc.errors.BadArgumentException = function () {
    dc.errors.Exception.apply(this, arguments);
};

dc.errors.BadArgumentException.prototype = Object.create(dc.errors.Exception.prototype);
dc.errors.BadArgumentException.prototype.constructor = dc.errors.BadArgumentException;

/**
 * The default date format for dc.js
 * @name dateFormat
 * @memberof dc
 * @type {Function}
 * @default d3.time.format('%m/%d/%Y')
 */
dc.dateFormat = d3.time.format('%m/%d/%Y');

/**
 * @namespace printers
 * @memberof dc
 * @type {{}}
 */
dc.printers = {};

/**
 * Converts a list of filters into a readable string
 * @method filters
 * @memberof dc.printers
 * @param {Array<dc.filters|any>} filters
 * @returns {String}
 */
dc.printers.filters = function (filters) {
    var s = '';

    for (var i = 0; i < filters.length; ++i) {
        if (i > 0) {
            s += ', ';
        }
        s += dc.printers.filter(filters[i]);
    }

    return s;
};

/**
 * Converts a filter into a readable string
 * @method filter
 * @memberof dc.printers
 * @param {dc.filters|any|Array<any>} filter
 * @returns {String}
 */
dc.printers.filter = function (filter) {
    var s = '';

    if (typeof filter !== 'undefined' && filter !== null) {
        if (filter instanceof Array) {
            if (filter.length >= 2) {
                s = '[' + dc.utils.printSingleValue(filter[0]) + ' -> ' + dc.utils.printSingleValue(filter[1]) + ']';
            } else if (filter.length >= 1) {
                s = dc.utils.printSingleValue(filter[0]);
            }
        } else {
            s = dc.utils.printSingleValue(filter);
        }
    }

    return s;
};

/**
 * Returns a function that given a string property name, can be used to pluck the property off an object.  A function
 * can be passed as the second argument to also alter the data being returned.  This can be a useful shorthand method to create
 * accessor functions.
 * @method pluck
 * @memberof dc
 * @example
 * var xPluck = dc.pluck('x');
 * var objA = {x: 1};
 * xPluck(objA) // 1
 * @example
 * var xPosition = dc.pluck('x', function (x, i) {
 *     // `this` is the original datum,
 *     // `x` is the x property of the datum,
 *     // `i` is the position in the array
 *     return this.radius + x;
 * });
 * dc.selectAll('.circle').data(...).x(xPosition);
 * @param {String} n
 * @param {Function} [f]
 * @returns {Function}
 */
dc.pluck = function (n, f) {
    if (!f) {
        return function (d) { return d[n]; };
    }
    return function (d, i) { return f.call(d, d[n], i); };
};

/**
 * @namespace utils
 * @memberof dc
 * @type {{}}
 */
dc.utils = {};

/**
 * Print a single value filter
 * @method printSingleValue
 * @memberof dc.utils
 * @param {any} filter
 * @returns {String}
 */
dc.utils.printSingleValue = function (filter) {
    var s = '' + filter;

    if (filter instanceof Date) {
        s = dc.dateFormat(filter);
    } else if (typeof(filter) === 'string') {
        s = filter;
    } else if (dc.utils.isFloat(filter)) {
        s = dc.utils.printSingleValue.fformat(filter);
    } else if (dc.utils.isInteger(filter)) {
        s = Math.round(filter);
    }

    return s;
};
dc.utils.printSingleValue.fformat = d3.format('.2f');

/**
 * Arbitrary add one value to another.
 * @method add
 * @memberof dc.utils
 * @todo
 * These assume than any string r is a percentage (whether or not it includes %).
 * They also generate strange results if l is a string.
 * @param {String|Date|Number} l
 * @param {Number} r
 * @returns {String|Date|Number}
 */
dc.utils.add = function (l, r) {
    if (typeof r === 'string') {
        r = r.replace('%', '');
    }

    if (l instanceof Date) {
        if (typeof r === 'string') {
            r = +r;
        }
        var d = new Date();
        d.setTime(l.getTime());
        d.setDate(l.getDate() + r);
        return d;
    } else if (typeof r === 'string') {
        var percentage = (+r / 100);
        return l > 0 ? l * (1 + percentage) : l * (1 - percentage);
    } else {
        return l + r;
    }
};

/**
 * Arbitrary subtract one value from another.
 * @method subtract
 * @memberof dc.utils
 * @todo
 * These assume than any string r is a percentage (whether or not it includes %).
 * They also generate strange results if l is a string.
 * @param {String|Date|Number} l
 * @param {Number} r
 * @returns {String|Date|Number}
 */
dc.utils.subtract = function (l, r) {
    if (typeof r === 'string') {
        r = r.replace('%', '');
    }

    if (l instanceof Date) {
        if (typeof r === 'string') {
            r = +r;
        }
        var d = new Date();
        d.setTime(l.getTime());
        d.setDate(l.getDate() - r);
        return d;
    } else if (typeof r === 'string') {
        var percentage = (+r / 100);
        return l < 0 ? l * (1 + percentage) : l * (1 - percentage);
    } else {
        return l - r;
    }
};

/**
 * Is the value a number?
 * @method isNumber
 * @memberof dc.utils
 * @param {any} n
 * @returns {Boolean}
 */
dc.utils.isNumber = function (n) {
    return n === +n;
};

/**
 * Is the value a float?
 * @method isFloat
 * @memberof dc.utils
 * @param {any} n
 * @returns {Boolean}
 */
dc.utils.isFloat = function (n) {
    return n === +n && n !== (n | 0);
};

/**
 * Is the value an integer?
 * @method isInteger
 * @memberof dc.utils
 * @param {any} n
 * @returns {Boolean}
 */
dc.utils.isInteger = function (n) {
    return n === +n && n === (n | 0);
};

/**
 * Is the value very close to zero?
 * @method isNegligible
 * @memberof dc.utils
 * @param {any} n
 * @returns {Boolean}
 */
dc.utils.isNegligible = function (n) {
    return !dc.utils.isNumber(n) || (n < dc.constants.NEGLIGIBLE_NUMBER && n > -dc.constants.NEGLIGIBLE_NUMBER);
};

/**
 * Ensure the value is no greater or less than the min/max values.  If it is return the boundary value.
 * @method clamp
 * @memberof dc.utils
 * @param {any} val
 * @param {any} min
 * @param {any} max
 * @returns {any}
 */
dc.utils.clamp = function (val, min, max) {
    return val < min ? min : (val > max ? max : val);
};

/**
 * Using a simple static counter, provide a unique integer id.
 * @method uniqueId
 * @memberof dc.utils
 * @returns {Number}
 */
var _idCounter = 0;
dc.utils.uniqueId = function () {
    return ++_idCounter;
};

/**
 * Convert a name to an ID.
 * @method nameToId
 * @memberof dc.utils
 * @param {String} name
 * @returns {String}
 */
dc.utils.nameToId = function (name) {
    return name.toLowerCase().replace(/[\s]/g, '_').replace(/[\.']/g, '');
};

/**
 * Append or select an item on a parent element
 * @method appendOrSelect
 * @memberof dc.utils
 * @param {d3.selection} parent
 * @param {String} selector
 * @param {String} tag
 * @returns {d3.selection}
 */
dc.utils.appendOrSelect = function (parent, selector, tag) {
    tag = tag || selector;
    var element = parent.select(selector);
    if (element.empty()) {
        element = parent.append(tag);
    }
    return element;
};

/**
 * Return the number if the value is a number; else 0.
 * @method safeNumber
 * @memberof dc.utils
 * @param {Number|any} n
 * @returns {Number}
 */
dc.utils.safeNumber = function (n) { return dc.utils.isNumber(+n) ? +n : 0;};

dc.logger = {};

dc.logger.enableDebugLog = false;

dc.logger.warn = function (msg) {
    if (console) {
        if (console.warn) {
            console.warn(msg);
        } else if (console.log) {
            console.log(msg);
        }
    }

    return dc.logger;
};

dc.logger.debug = function (msg) {
    if (dc.logger.enableDebugLog && console) {
        if (console.debug) {
            console.debug(msg);
        } else if (console.log) {
            console.log(msg);
        }
    }

    return dc.logger;
};

dc.logger.deprecate = function (fn, msg) {
    // Allow logging of deprecation
    var warned = false;
    function deprecated () {
        if (!warned) {
            dc.logger.warn(msg);
            warned = true;
        }
        return fn.apply(this, arguments);
    }
    return deprecated;
};

dc.events = {
    current: null
};

/**
 * This function triggers a throttled event function with a specified delay (in milli-seconds).  Events
 * that are triggered repetitively due to user interaction such brush dragging might flood the library
 * and invoke more renders than can be executed in time. Using this function to wrap your event
 * function allows the library to smooth out the rendering by throttling events and only responding to
 * the most recent event.
 * @name events.trigger
 * @memberof dc
 * @example
 * chart.on('renderlet', function(chart) {
 *     // smooth the rendering through event throttling
 *     dc.events.trigger(function(){
 *         // focus some other chart to the range selected by user on this chart
 *         someOtherChart.focus(chart.filter());
 *     });
 * })
 * @param {Function} closure
 * @param {Number} [delay]
 */
dc.events.trigger = function (closure, delay) {
    if (!delay) {
        closure();
        return;
    }

    dc.events.current = closure;

    setTimeout(function () {
        if (closure === dc.events.current) {
            closure();
        }
    }, delay);
};

/**
 * The dc.js filters are functions which are passed into crossfilter to chose which records will be
 * accumulated to produce values for the charts.  In the crossfilter model, any filters applied on one
 * dimension will affect all the other dimensions but not that one.  dc always applies a filter
 * function to the dimension; the function combines multiple filters and if any of them accept a
 * record, it is filtered in.
 *
 * These filter constructors are used as appropriate by the various charts to implement brushing.  We
 * mention below which chart uses which filter.  In some cases, many instances of a filter will be added.
 *
 * Each of the dc.js filters is an object with the following properties:
 * * `isFiltered` - a function that returns true if a value is within the filter
 * * `filterType` - a string identifying the filter, here the name of the constructor
 *
 * Currently these filter objects are also arrays, but this is not a requirement. Custom filters
 * can be used as long as they have the properties above.
 * @namespace filters
 * @memberof dc
 * @type {{}}
 */
dc.filters = {};

/**
 * RangedFilter is a filter which accepts keys between `low` and `high`.  It is used to implement X
 * axis brushing for the {@link dc.coordinateGridMixin coordinate grid charts}.
 *
 * Its `filterType` is 'RangedFilter'
 * @name RangedFilter
 * @memberof dc.filters
 * @param {Number} low
 * @param {Number} high
 * @return {Array<Number>}
 * @constructor
 */
dc.filters.RangedFilter = function (low, high) {
    var range = new Array(low, high);
    range.isFiltered = function (value) {
        return value >= this[0] && value < this[1];
    };
    range.filterType = 'RangedFilter';

    return range;
};

/**
 * TwoDimensionalFilter is a filter which accepts a single two-dimensional value.  It is used by the
 * {@link dc.heatMap heat map chart} to include particular cells as they are clicked.  (Rows and columns are
 * filtered by filtering all the cells in the row or column.)
 *
 * Its `filterType` is 'TwoDimensionalFilter'
 * @name TwoDimensionalFilter
 * @memberof dc.filters
 * @param {Array<Number>} filter
 * @return {Array<Number>}
 * @constructor
 */
dc.filters.TwoDimensionalFilter = function (filter) {
    if (filter === null) { return null; }

    var f = filter;
    f.isFiltered = function (value) {
        return value.length && value.length === f.length &&
               value[0] === f[0] && value[1] === f[1];
    };
    f.filterType = 'TwoDimensionalFilter';

    return f;
};

/**
 * The RangedTwoDimensionalFilter allows filtering all values which fit within a rectangular
 * region. It is used by the {@link dc.scatterPlot scatter plot} to implement rectangular brushing.
 *
 * It takes two two-dimensional points in the form `[[x1,y1],[x2,y2]]`, and normalizes them so that
 * `x1 <= x2` and `y1 <= y2`. It then returns a filter which accepts any points which are in the
 * rectangular range including the lower values but excluding the higher values.
 *
 * If an array of two values are given to the RangedTwoDimensionalFilter, it interprets the values as
 * two x coordinates `x1` and `x2` and returns a filter which accepts any points for which `x1 <= x <
 * x2`.
 *
 * Its `filterType` is 'RangedTwoDimensionalFilter'
 * @name RangedTwoDimensionalFilter
 * @memberof dc.filters
 * @param {Array<Array<Number>>} filter
 * @return {Array<Array<Number>>}
 * @constructor
 */
dc.filters.RangedTwoDimensionalFilter = function (filter) {
    if (filter === null) { return null; }

    var f = filter;
    var fromBottomLeft;

    if (f[0] instanceof Array) {
        fromBottomLeft = [
            [Math.min(filter[0][0], filter[1][0]), Math.min(filter[0][1], filter[1][1])],
            [Math.max(filter[0][0], filter[1][0]), Math.max(filter[0][1], filter[1][1])]
        ];
    } else {
        fromBottomLeft = [[filter[0], -Infinity], [filter[1], Infinity]];
    }

    f.isFiltered = function (value) {
        var x, y;

        if (value instanceof Array) {
            if (value.length !== 2) {
                return false;
            }
            x = value[0];
            y = value[1];
        } else {
            x = value;
            y = fromBottomLeft[0][1];
        }

        return x >= fromBottomLeft[0][0] && x < fromBottomLeft[1][0] &&
               y >= fromBottomLeft[0][1] && y < fromBottomLeft[1][1];
    };
    f.filterType = 'RangedTwoDimensionalFilter';

    return f;
};

/**
 * `dc.baseMixin` is an abstract functional object representing a basic `dc` chart object
 * for all chart and widget implementations. Methods from the {@link #dc.baseMixin dc.baseMixin} are inherited
 * and available on all chart implementations in the `dc` library.
 * @name baseMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @return {dc.baseMixin}
 */
dc.baseMixin = function (_chart) {
    _chart.__dcFlag__ = dc.utils.uniqueId();

    var _dimension;
    var _group;

    var _anchor;
    var _root;
    var _svg;
    var _isChild;

    var _minWidth = 200;
    var _defaultWidthCalc = function (element) {
        var width = element && element.getBoundingClientRect && element.getBoundingClientRect().width;
        return (width && width > _minWidth) ? width : _minWidth;
    };
    var _widthCalc = _defaultWidthCalc;

    var _minHeight = 200;
    var _defaultHeightCalc = function (element) {
        var height = element && element.getBoundingClientRect && element.getBoundingClientRect().height;
        return (height && height > _minHeight) ? height : _minHeight;
    };
    var _heightCalc = _defaultHeightCalc;
    var _width, _height;

    var _keyAccessor = dc.pluck('key');
    var _valueAccessor = dc.pluck('value');
    var _label = dc.pluck('key');

    var _ordering = dc.pluck('key');
    var _orderSort;

    var _renderLabel = false;

    var _title = function (d) {
        return _chart.keyAccessor()(d) + ': ' + _chart.valueAccessor()(d);
    };
    var _renderTitle = true;
    var _controlsUseVisibility = false;

    var _transitionDuration = 750;

    var _filterPrinter = dc.printers.filters;

    var _mandatoryAttributes = ['dimension', 'group'];

    var _chartGroup = dc.constants.DEFAULT_CHART_GROUP;

    var _listeners = d3.dispatch(
        'preRender',
        'postRender',
        'preRedraw',
        'postRedraw',
        'filtered',
        'zoomed',
        'renderlet',
        'pretransition');

    var _legend;
    var _commitHandler;

    var _filters = [];
    var _filterHandler = function (dimension, filters) {
        if (filters.length === 0) {
            dimension.filter(null);
        } else if (filters.length === 1 && !filters[0].isFiltered) {
            // single value and not a function-based filter
            dimension.filterExact(filters[0]);
        } else if (filters.length === 1 && filters[0].filterType === 'RangedFilter') {
            // single range-based filter
            dimension.filterRange(filters[0]);
        } else {
            dimension.filterFunction(function (d) {
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    if (filter.isFiltered && filter.isFiltered(d)) {
                        return true;
                    } else if (filter <= d && filter >= d) {
                        return true;
                    }
                }
                return false;
            });
        }
        return filters;
    };

    var _data = function (group) {
        return group.all();
    };

    /**
     * Set or get the height attribute of a chart. The height is applied to the SVGElement generated by
     * the chart when rendered (or re-rendered). If a value is given, then it will be used to calculate
     * the new height and the chart returned for method chaining.  The value can either be a numeric, a
     * function, or falsy. If no value is specified then the value of the current height attribute will
     * be returned.
     *
     * By default, without an explicit height being given, the chart will select the width of its
     * anchor element. If that isn't possible it defaults to 200 (provided by the
     * {@link dc.baseMixin#minHeight minHeight} property). Setting the value falsy will return
     * the chart to the default behavior.
     * @method height
     * @memberof dc.baseMixin
     * @instance
     * @see {@link dc.baseMixin#minHeight minHeight}
     * @example
     * // Default height
     * chart.height(function (element) {
     *     var height = element && element.getBoundingClientRect && element.getBoundingClientRect().height;
     *     return (height && height > chart.minHeight()) ? height : chart.minHeight();
     * });
     *
     * chart.height(250); // Set the chart's height to 250px;
     * chart.height(function(anchor) { return doSomethingWith(anchor); }); // set the chart's height with a function
     * chart.height(null); // reset the height to the default auto calculation
     * @param {Number|Function} [height]
     * @return {Number}
     * @return {dc.baseMixin}
     */
    _chart.height = function (height) {
        if (!arguments.length) {
            if (!dc.utils.isNumber(_height)) {
                // only calculate once
                _height = _heightCalc(_root.node());
            }
            return _height;
        }
        _heightCalc = d3.functor(height || _defaultHeightCalc);
        _height = undefined;
        return _chart;
    };

    /**
     * Set or get the width attribute of a chart.
     * @method width
     * @memberof dc.baseMixin
     * @instance
     * @see {@link dc.baseMixin#height height}
     * @see {@link dc.baseMixin#minWidth minWidth}
     * @example
     * // Default width
     * chart.width(function (element) {
     *     var width = element && element.getBoundingClientRect && element.getBoundingClientRect().width;
     *     return (width && width > chart.minWidth()) ? width : chart.minWidth();
     * });
     * @param {Number|Function} [width]
     * @return {Number}
     * @return {dc.baseMixin}
     */
    _chart.width = function (width) {
        if (!arguments.length) {
            if (!dc.utils.isNumber(_width)) {
                // only calculate once
                _width = _widthCalc(_root.node());
            }
            return _width;
        }
        _widthCalc = d3.functor(width || _defaultWidthCalc);
        _width = undefined;
        return _chart;
    };

    /**
     * Set or get the minimum width attribute of a chart. This only has effect when used with the default
     * {@link dc.baseMixin#width width} function.
     * @method minWidth
     * @memberof dc.baseMixin
     * @instance
     * @see {@link dc.baseMixin#width width}
     * @param {Number} [minWidth=200]
     * @return {Number}
     * @return {dc.baseMixin}
     */
    _chart.minWidth = function (minWidth) {
        if (!arguments.length) {
            return _minWidth;
        }
        _minWidth = minWidth;
        return _chart;
    };

    /**
     * Set or get the minimum height attribute of a chart. This only has effect when used with the default
     * {@link dc.baseMixin#height height} function.
     * @method minHeight
     * @memberof dc.baseMixin
     * @instance
     * @see {@link dc.baseMixin#height height}
     * @param {Number} [minHeight=200]
     * @return {Number}
     * @return {dc.baseMixin}
     */
    _chart.minHeight = function (minHeight) {
        if (!arguments.length) {
            return _minHeight;
        }
        _minHeight = minHeight;
        return _chart;
    };

    /**
     * **mandatory**
     *
     * Set or get the dimension attribute of a chart. In `dc`, a dimension can be any valid [crossfilter
     * dimension](https://github.com/square/crossfilter/wiki/API-Reference#wiki-dimension).
     *
     * If a value is given, then it will be used as the new dimension. If no value is specified then
     * the current dimension will be returned.
     * @method dimension
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://github.com/square/crossfilter/wiki/API-Reference#dimension crossfilter.dimension}
     * @example
     * var index = crossfilter([]);
     * var dimension = index.dimension(dc.pluck('key'));
     * chart.dimension(dimension);
     * @param {crossfilter.dimension} [dimension]
     * @return {crossfilter.dimension}
     * @return {dc.baseMixin}
     */
    _chart.dimension = function (dimension) {
        if (!arguments.length) {
            return _dimension;
        }
        _dimension = dimension;
        _chart.expireCache();
        return _chart;
    };

    /**
     * Set the data callback or retrieve the chart's data set. The data callback is passed the chart's
     * group and by default will return
     * {@link https://github.com/square/crossfilter/wiki/API-Reference#group_all group.all}.
     * This behavior may be modified to, for instance, return only the top 5 groups.
     * @method data
     * @memberof dc.baseMixin
     * @instance
     * @example
     * // Default data function
     * chart.data(function (group) { return group.all(); });
     *
     * chart.data(function (group) { return group.top(5); });
     * @param {Function} [callback]
     * @return {*}
     * @return {dc.baseMixin}
     */
    _chart.data = function (callback) {
        if (!arguments.length) {
            return _data.call(_chart, _group);
        }
        _data = d3.functor(callback);
        _chart.expireCache();
        return _chart;
    };

    /**
     * **mandatory**
     *
     * Set or get the group attribute of a chart. In `dc` a group is a
     * {@link https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce crossfilter group}.
     * Usually the group should be created from the particular dimension associated with the same chart. If a value is
     * given, then it will be used as the new group.
     *
     * If no value specified then the current group will be returned.
     * If `name` is specified then it will be used to generate legend label.
     * @method group
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce crossfilter.group}
     * @example
     * var index = crossfilter([]);
     * var dimension = index.dimension(dc.pluck('key'));
     * chart.dimension(dimension);
     * chart.group(dimension.group(crossfilter.reduceSum()));
     * @param {crossfilter.group} [group]
     * @param {String} [name]
     * @return {crossfilter.group}
     * @return {dc.baseMixin}
     */
    _chart.group = function (group, name) {
        if (!arguments.length) {
            return _group;
        }
        _group = group;
        _chart._groupName = name;
        _chart.expireCache();
        return _chart;
    };

    /**
     * Get or set an accessor to order ordinal dimensions.  The chart uses
     * {@link https://github.com/square/crossfilter/wiki/API-Reference#quicksort_by crossfilter.quicksort.by}
     * to sort elements; this accessor returns the value to order on.
     * @method ordering
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://github.com/square/crossfilter/wiki/API-Reference#quicksort_by crossfilter.quicksort.by}
     * @example
     * // Default ordering accessor
     * _chart.ordering(dc.pluck('key'));
     * @param {Function} [orderFunction]
     * @return {Function}
     * @return {dc.baseMixin}
     */
    _chart.ordering = function (orderFunction) {
        if (!arguments.length) {
            return _ordering;
        }
        _ordering = orderFunction;
        _orderSort = crossfilter.quicksort.by(_ordering);
        _chart.expireCache();
        return _chart;
    };

    _chart._computeOrderedGroups = function (data) {
        var dataCopy = data.slice(0);

        if (dataCopy.length <= 1) {
            return dataCopy;
        }

        if (!_orderSort) {
            _orderSort = crossfilter.quicksort.by(_ordering);
        }

        return _orderSort(dataCopy, 0, dataCopy.length);
    };

    /**
     * Clear all filters associated with this chart
     *
     * The same can be achieved by calling {@link dc.baseMixin#filter chart.filter(null)}.
     * @method filterAll
     * @memberof dc.baseMixin
     * @instance
     * @return {dc.baseMixin}
     */
    _chart.filterAll = function () {
        return _chart.filter(null);
    };

    /**
     * Execute d3 single selection in the chart's scope using the given selector and return the d3
     * selection.
     *
     * This function is **not chainable** since it does not return a chart instance; however the d3
     * selection result can be chained to d3 function calls.
     * @method select
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://github.com/mbostock/d3/wiki/Selections d3.selection}
     * @example
     * // Similar to:
     * d3.select('#chart-id').select(selector);
     * @return {d3.selection}
     */
    _chart.select = function (s) {
        return _root.select(s);
    };

    /**
     * Execute in scope d3 selectAll using the given selector and return d3 selection result.
     *
     * This function is **not chainable** since it does not return a chart instance; however the d3
     * selection result can be chained to d3 function calls.
     * @method selectAll
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://github.com/mbostock/d3/wiki/Selections d3.selection}
     * @example
     * // Similar to:
     * d3.select('#chart-id').selectAll(selector);
     * @return {d3.selection}
     */
    _chart.selectAll = function (s) {
        return _root ? _root.selectAll(s) : null;
    };

    /**
     * Set the root SVGElement to either be an existing chart's root; or any valid [d3 single
     * selector](https://github.com/mbostock/d3/wiki/Selections#selecting-elements) specifying a dom
     * block element such as a div; or a dom element or d3 selection. Optionally registers the chart
     * within the chartGroup. This class is called internally on chart initialization, but be called
     * again to relocate the chart. However, it will orphan any previously created SVGElements.
     * @method anchor
     * @memberof dc.baseMixin
     * @instance
     * @param {anchorChart|anchorSelector|anchorNode} [parent]
     * @param {String} [chartGroup]
     * @return {String|node|d3.selection}
     * @return {dc.baseMixin}
     */
    _chart.anchor = function (parent, chartGroup) {
        if (!arguments.length) {
            return _anchor;
        }
        if (dc.instanceOfChart(parent)) {
            _anchor = parent.anchor();
            _root = parent.root();
            _isChild = true;
        } else if (parent) {
            if (parent.select && parent.classed) { // detect d3 selection
                _anchor = parent.node();
            } else {
                _anchor = parent;
            }
            _root = d3.select(_anchor);
            _root.classed(dc.constants.CHART_CLASS, true);
            dc.registerChart(_chart, chartGroup);
            _isChild = false;
        } else {
            throw new dc.errors.BadArgumentException('parent must be defined');
        }
        _chartGroup = chartGroup;
        return _chart;
    };

    /**
     * Returns the DOM id for the chart's anchored location.
     * @method anchorName
     * @memberof dc.baseMixin
     * @instance
     * @return {String}
     */
    _chart.anchorName = function () {
        var a = _chart.anchor();
        if (a && a.id) {
            return a.id;
        }
        if (a && a.replace) {
            return a.replace('#', '');
        }
        return 'dc-chart' + _chart.chartID();
    };

    /**
     * Returns the root element where a chart resides. Usually it will be the parent div element where
     * the SVGElement was created. You can also pass in a new root element however this is usually handled by
     * dc internally. Resetting the root element on a chart outside of dc internals may have
     * unexpected consequences.
     * @method root
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement HTMLElement}
     * @param {HTMLElement} [rootElement]
     * @return {HTMLElement}
     * @return {dc.baseMixin}
     */
    _chart.root = function (rootElement) {
        if (!arguments.length) {
            return _root;
        }
        _root = rootElement;
        return _chart;
    };

    /**
     * Returns the top SVGElement for this specific chart. You can also pass in a new SVGElement,
     * however this is usually handled by dc internally. Resetting the SVGElement on a chart outside
     * of dc internals may have unexpected consequences.
     * @method svg
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/SVGElement SVGElement}
     * @param {SVGElement|d3.selection} [svgElement]
     * @return {SVGElement|d3.selection}
     * @return {dc.baseMixin}
     */
    _chart.svg = function (svgElement) {
        if (!arguments.length) {
            return _svg;
        }
        _svg = svgElement;
        return _chart;
    };

    /**
     * Remove the chart's SVGElements from the dom and recreate the container SVGElement.
     * @method resetSvg
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/SVGElement SVGElement}
     * @return {SVGElement}
     */
    _chart.resetSvg = function () {
        _chart.select('svg').remove();
        return generateSvg();
    };

    function sizeSvg () {
        if (_svg) {
            _svg
                .attr('width', _chart.width())
                .attr('height', _chart.height());
        }
    }

    function generateSvg () {
        _svg = _chart.root().append('svg');
        sizeSvg();
        return _svg;
    }

    /**
     * Set or get the filter printer function. The filter printer function is used to generate human
     * friendly text for filter value(s) associated with the chart instance. By default dc charts use a
     * default filter printer `dc.printers.filter` that provides simple printing support for both
     * single value and ranged filters.
     * @method filterPrinter
     * @memberof dc.baseMixin
     * @instance
     * @param {Function} [filterPrinterFunction=dc.printers.filter]
     * @return {Function}
     * @return {dc.baseMixin}
     */
    _chart.filterPrinter = function (filterPrinterFunction) {
        if (!arguments.length) {
            return _filterPrinter;
        }
        _filterPrinter = filterPrinterFunction;
        return _chart;
    };

    /**
     * If set, use the `visibility` attribute instead of the `display` attribute for showing/hiding
     * chart reset and filter controls, for less disruption to the layout.
     * @method controlsUseVisibility
     * @memberof dc.baseMixin
     * @instance
     * @param {Boolean} [controlsUseVisibility=false]
     * @return {Boolean}
     * @return {dc.baseMixin}
     **/
    _chart.controlsUseVisibility = function (_) {
        if (!arguments.length) {
            return _controlsUseVisibility;
        }
        _controlsUseVisibility = _;
        return _chart;
    };

    /**
     * Turn on optional control elements within the root element. dc currently supports the
     * following html control elements.
     * * root.selectAll('.reset') - elements are turned on if the chart has an active filter. This type
     * of control element is usually used to store a reset link to allow user to reset filter on a
     * certain chart. This element will be turned off automatically if the filter is cleared.
     * * root.selectAll('.filter') elements are turned on if the chart has an active filter. The text
     * content of this element is then replaced with the current filter value using the filter printer
     * function. This type of element will be turned off automatically if the filter is cleared.
     * @method turnOnControls
     * @memberof dc.baseMixin
     * @instance
     * @return {dc.baseMixin}
     */
    _chart.turnOnControls = function () {
        if (_root) {
            var attribute = _chart.controlsUseVisibility() ? 'visibility' : 'display';
            _chart.selectAll('.reset').style(attribute, null);
            _chart.selectAll('.filter').text(_filterPrinter(_chart.filters())).style(attribute, null);
        }
        return _chart;
    };

    /**
     * Turn off optional control elements within the root element.
     * @method turnOffControls
     * @memberof dc.baseMixin
     * @see {@link dc.baseMixin#turnOnControls turnOnControls}
     * @instance
     * @return {dc.baseMixin}
     */
    _chart.turnOffControls = function () {
        if (_root) {
            var attribute = _chart.controlsUseVisibility() ? 'visibility' : 'display';
            var value = _chart.controlsUseVisibility() ? 'hidden' : 'none';
            _chart.selectAll('.reset').style(attribute, value);
            _chart.selectAll('.filter').style(attribute, value).text(_chart.filter());
        }
        return _chart;
    };

    /**
     * Set or get the animation transition duration (in milliseconds) for this chart instance.
     * @method transitionDuration
     * @memberof dc.baseMixin
     * @instance
     * @param {Number} [duration=750]
     * @return {Number}
     * @return {dc.baseMixin}
     */
    _chart.transitionDuration = function (duration) {
        if (!arguments.length) {
            return _transitionDuration;
        }
        _transitionDuration = duration;
        return _chart;
    };

    _chart._mandatoryAttributes = function (_) {
        if (!arguments.length) {
            return _mandatoryAttributes;
        }
        _mandatoryAttributes = _;
        return _chart;
    };

    function checkForMandatoryAttributes (a) {
        if (!_chart[a] || !_chart[a]()) {
            throw new dc.errors.InvalidStateException('Mandatory attribute chart.' + a +
                ' is missing on chart[#' + _chart.anchorName() + ']');
        }
    }

    /**
     * Invoking this method will force the chart to re-render everything from scratch. Generally it
     * should only be used to render the chart for the first time on the page or if you want to make
     * sure everything is redrawn from scratch instead of relying on the default incremental redrawing
     * behaviour.
     * @method render
     * @memberof dc.baseMixin
     * @instance
     * @return {dc.baseMixin}
     */
    _chart.render = function () {
        _height = _width = undefined; // force recalculate
        _listeners.preRender(_chart);

        if (_mandatoryAttributes) {
            _mandatoryAttributes.forEach(checkForMandatoryAttributes);
        }

        var result = _chart._doRender();

        if (_legend) {
            _legend.render();
        }

        _chart._activateRenderlets('postRender');

        return result;
    };

    _chart._activateRenderlets = function (event) {
        _listeners.pretransition(_chart);
        if (_chart.transitionDuration() > 0 && _svg) {
            _svg.transition().duration(_chart.transitionDuration())
                .each('end', function () {
                    _listeners.renderlet(_chart);
                    if (event) {
                        _listeners[event](_chart);
                    }
                });
        } else {
            _listeners.renderlet(_chart);
            if (event) {
                _listeners[event](_chart);
            }
        }
    };

    /**
     * Calling redraw will cause the chart to re-render data changes incrementally. If there is no
     * change in the underlying data dimension then calling this method will have no effect on the
     * chart. Most chart interaction in dc will automatically trigger this method through internal
     * events (in particular {@link dc.redrawAll dc.redrawAll}); therefore, you only need to
     * manually invoke this function if data is manipulated outside of dc's control (for example if
     * data is loaded in the background using
     * {@link https://github.com/square/crossfilter/wiki/API-Reference#crossfilter_add crossfilter.add}.
     * @method redraw
     * @memberof dc.baseMixin
     * @instance
     * @return {dc.baseMixin}
     */
    _chart.redraw = function () {
        sizeSvg();
        _listeners.preRedraw(_chart);

        var result = _chart._doRedraw();

        if (_legend) {
            _legend.render();
        }

        _chart._activateRenderlets('postRedraw');

        return result;
    };

    /**
     * Gets/sets the commit handler. If the chart has a commit handler, the handler will be called when
     * the chart's filters have changed, in order to send the filter data asynchronously to a server.
     *
     * Unlike other functions in dc.js, the commit handler is asynchronous. It takes two arguments:
     * a flag indicating whether this is a render (true) or a redraw (false), and a callback to be
     * triggered once the commit is filtered. The callback has the standard node.js continuation signature
     * with error first and result second.
     * @method commitHandler
     * @memberof dc.baseMixin
     * @instance
     * @return {dc.baseMixin}
     */
    _chart.commitHandler = function (commitHandler) {
        if (!arguments.length) {
            return _commitHandler;
        }
        _commitHandler = commitHandler;
        return _chart;
    };

    /**
     * Redraws all charts in the same group as this chart, typically in reaction to a filter
     * change. If the chart has a {@link dc.baseMixin.commitFilter commitHandler}, it will
     * be executed and waited for.
     * @method redrawGroup
     * @memberof dc.baseMixin
     * @instance
     * @return {dc.baseMixin}
     */
    _chart.redrawGroup = function () {
        if (_commitHandler) {
            _commitHandler(false, function (error, result) {
                if (error) {
                    console.log(error);
                } else {
                    dc.redrawAll(_chart.chartGroup());
                }
            });
        } else {
            dc.redrawAll(_chart.chartGroup());
        }
        return _chart;
    };

    /**
     * Renders all charts in the same group as this chart. If the chart has a
     * {@link dc.baseMixin.commitFilter commitHandler}, it will be executed and waited for
     * @method renderGroup
     * @memberof dc.baseMixin
     * @instance
     * @return {dc.baseMixin}
     */
    _chart.renderGroup = function () {
        if (_commitHandler) {
            _commitHandler(false, function (error, result) {
                if (error) {
                    console.log(error);
                } else {
                    dc.renderAll(_chart.chartGroup());
                }
            });
        } else {
            dc.renderAll(_chart.chartGroup());
        }
        return _chart;
    };

    _chart._invokeFilteredListener = function (f) {
        if (f !== undefined) {
            _listeners.filtered(_chart, f);
        }
    };

    _chart._invokeZoomedListener = function () {
        _listeners.zoomed(_chart);
    };

    var _hasFilterHandler = function (filters, filter) {
        if (filter === null || typeof(filter) === 'undefined') {
            return filters.length > 0;
        }
        return filters.some(function (f) {
            return filter <= f && filter >= f;
        });
    };

    /**
     * Set or get the has filter handler. The has filter handler is a function that checks to see if
     * the chart's current filters include a specific filter.  Using a custom has filter handler allows
     * you to change the way filters are checked for and replaced.
     * @method hasFilterHandler
     * @memberof dc.baseMixin
     * @instance
     * @example
     * // default has filter handler
     * chart.hasFilterHandler(function (filters, filter) {
     *     if (filter === null || typeof(filter) === 'undefined') {
     *         return filters.length > 0;
     *     }
     *     return filters.some(function (f) {
     *         return filter <= f && filter >= f;
     *     });
     * });
     *
     * // custom filter handler (no-op)
     * chart.hasFilterHandler(function(filters, filter) {
     *     return false;
     * });
     * @param {Function} [hasFilterHandler]
     * @return {Function}
     * @return {dc.baseMixin}
     */
    _chart.hasFilterHandler = function (hasFilterHandler) {
        if (!arguments.length) {
            return _hasFilterHandler;
        }
        _hasFilterHandler = hasFilterHandler;
        return _chart;
    };

    /**
     * Check whether any active filter or a specific filter is associated with particular chart instance.
     * This function is **not chainable**.
     * @method hasFilter
     * @memberof dc.baseMixin
     * @instance
     * @see {@link dc.baseMixin#hasFilterHandler hasFilterHandler}
     * @param {*} [filter]
     * @return {Boolean}
     */
    _chart.hasFilter = function (filter) {
        return _hasFilterHandler(_filters, filter);
    };

    var _removeFilterHandler = function (filters, filter) {
        for (var i = 0; i < filters.length; i++) {
            if (filters[i] <= filter && filters[i] >= filter) {
                filters.splice(i, 1);
                break;
            }
        }
        return filters;
    };

    /**
     * Set or get the remove filter handler. The remove filter handler is a function that removes a
     * filter from the chart's current filters. Using a custom remove filter handler allows you to
     * change how filters are removed or perform additional work when removing a filter, e.g. when
     * using a filter server other than crossfilter.
     *
     * Any changes should modify the `filters` array argument and return that array.
     * @method removeFilterHandler
     * @memberof dc.baseMixin
     * @instance
     * @example
     * // default remove filter handler
     * chart.removeFilterHandler(function (filters, filter) {
     *     for (var i = 0; i < filters.length; i++) {
     *         if (filters[i] <= filter && filters[i] >= filter) {
     *             filters.splice(i, 1);
     *             break;
     *         }
     *     }
     *     return filters;
     * });
     *
     * // custom filter handler (no-op)
     * chart.removeFilterHandler(function(filters, filter) {
     *     return filters;
     * });
     * @param {Function} [removeFilterHandler]
     * @return {Function}
     * @return {dc.baseMixin}
     */
    _chart.removeFilterHandler = function (removeFilterHandler) {
        if (!arguments.length) {
            return _removeFilterHandler;
        }
        _removeFilterHandler = removeFilterHandler;
        return _chart;
    };

    var _addFilterHandler = function (filters, filter) {
        filters.push(filter);
        return filters;
    };

    /**
     * Set or get the add filter handler. The add filter handler is a function that adds a filter to
     * the chart's filter list. Using a custom add filter handler allows you to change the way filters
     * are added or perform additional work when adding a filter, e.g. when using a filter server other
     * than crossfilter.
     *
     * Any changes should modify the `filters` array argument and return that array.
     * @method addFilterHandler
     * @memberof dc.baseMixin
     * @instance
     * @example
     * // default add filter handler
     * chart.addFilterHandler(function (filters, filter) {
     *     filters.push(filter);
     *     return filters;
     * });
     *
     * // custom filter handler (no-op)
     * chart.addFilterHandler(function(filters, filter) {
     *     return filters;
     * });
     * @param {Function} [addFilterHandler]
     * @return {Function}
     * @return {dc.baseMixin}
     */
    _chart.addFilterHandler = function (addFilterHandler) {
        if (!arguments.length) {
            return _addFilterHandler;
        }
        _addFilterHandler = addFilterHandler;
        return _chart;
    };

    var _resetFilterHandler = function (filters) {
        return [];
    };

    /**
     * Set or get the reset filter handler. The reset filter handler is a function that resets the
     * chart's filter list by returning a new list. Using a custom reset filter handler allows you to
     * change the way filters are reset, or perform additional work when resetting the filters,
     * e.g. when using a filter server other than crossfilter.
     *
     * This function should return an array.
     * @method resetFilterHandler
     * @memberof dc.baseMixin
     * @instance
     * @example
     * // default remove filter handler
     * function (filters) {
     *     return [];
     * }
     *
     * // custom filter handler (no-op)
     * chart.resetFilterHandler(function(filters) {
     *     return filters;
     * });
     * @param {Function} [resetFilterHandler]
     * @return {dc.baseMixin}
     */
    _chart.resetFilterHandler = function (resetFilterHandler) {
        if (!arguments.length) {
            return _resetFilterHandler;
        }
        _resetFilterHandler = resetFilterHandler;
        return _chart;
    };

    function applyFilters () {
        if (_chart.dimension() && _chart.dimension().filter) {
            var fs = _filterHandler(_chart.dimension(), _filters);
            _filters = fs ? fs : _filters;
        }
    }

    /**
     * Replace the chart filter. This is equivalent to calling `chart.filter(null).filter(filter)`
     *
     * @method replaceFilter
     * @memberof dc.baseMixin
     * @instance
     * @param {*} [filter]
     * @return {dc.baseMixin}
     **/
    _chart.replaceFilter = function (filter) {
        _filters = _resetFilterHandler(_filters);
        _chart.filter(filter);
    };

    /**
     * Filter the chart by the given parameter, or return the current filter if no input parameter
     * is given.
     *
     * The filter parameter can take one of these forms:
     * * A single value: the value will be toggled (added if it is not present in the current
     * filters, removed if it is present)
     * * An array containing a single array of values (`[[value,value,value]]`): each value is
     * toggled
     * * When appropriate for the chart, a {@link dc.filters dc filter object} such as
     *   * {@link dc.filters.RangedFilter `dc.filters.RangedFilter`} for the
     * {@link dc.coordinateGridMixin dc.coordinateGridMixin} charts
     *   * {@link dc.filters.TwoDimensionalFilter `dc.filters.TwoDimensionalFilter`} for the
     * {@link dc.heatMap heat map}
     *   * {@link dc.filters.RangedTwoDimensionalFilter `dc.filters.RangedTwoDimensionalFilter`}
     * for the {@link dc.scatterPlot scatter plot}
     * * `null`: the filter will be reset using the
     * {@link dc.baseMixin#resetFilterHandler resetFilterHandler}
     *
     * Note that this is always a toggle (even when it doesn't make sense for the filter type). If
     * you wish to replace the current filter, either call `chart.filter(null)` first, or
     * equivalently, call {@link dc.baseMixin#replaceFilter `chart.replaceFilter(filter)`} instead.
     *
     * Each toggle is executed by checking if the value is already present using the
     * {@link dc.baseMixin#hasFilterHandler hasFilterHandler}; if it is not present, it is added
     * using the {@link dc.baseMixin#addFilterHandler addFilterHandler}; if it is already present,
     * it is removed using the {@link dc.baseMixin#removeFilterHandler removeFilterHandler}.
     *
     * Once the filters array has been updated, the filters are applied to the
     * crossfilter dimension, using the {@link dc.baseMixin#filterHandler filterHandler}.
     *
     * Once you have set the filters, call {@link dc.baseMixin#redrawGroup `chart.redrawGroup()`}
     * (or {@link dc.redrawAll `dc.redrawAll()`}) to redraw the chart's group.
     * @method filter
     * @memberof dc.baseMixin
     * @instance
     * @see {@link dc.baseMixin#addFilterHandler addFilterHandler}
     * @see {@link dc.baseMixin#removeFilterHandler removeFilterHandler}
     * @see {@link dc.baseMixin#resetFilterHandler resetFilterHandler}
     * @see {@link dc.baseMixin#filterHandler filterHandler}
     * @example
     * // filter by a single string
     * chart.filter('Sunday');
     * // filter by a single age
     * chart.filter(18);
     * // filter by a set of states
     * chart.filter([['MA', 'TX', 'ND', 'WA']]);
     * // filter by range -- note the use of dc.filters.RangedFilter, which is different
     * // from the syntax for filtering a crossfilter dimension directly, dimension.filter([15,20])
     * chart.filter(dc.filters.RangedFilter(15,20));
     * @param {*} [filter]
     * @return {dc.baseMixin}
     */
    _chart.filter = function (filter) {
        if (!arguments.length) {
            return _filters.length > 0 ? _filters[0] : null;
        }
        if (filter instanceof Array && filter[0] instanceof Array && !filter.isFiltered) {
            filter[0].forEach(function (d) {
                if (_chart.hasFilter(d)) {
                    _removeFilterHandler(_filters, d);
                } else {
                    _addFilterHandler(_filters, d);
                }
            });
        } else if (filter === null) {
            _filters = _resetFilterHandler(_filters);
        } else {
            if (_chart.hasFilter(filter)) {
                _removeFilterHandler(_filters, filter);
            } else {
                _addFilterHandler(_filters, filter);
            }
        }
        applyFilters();
        _chart._invokeFilteredListener(filter);

        if (_root !== null && _chart.hasFilter()) {
            _chart.turnOnControls();
        } else {
            _chart.turnOffControls();
        }

        return _chart;
    };

    /**
     * Returns all current filters. This method does not perform defensive cloning of the internal
     * filter array before returning, therefore any modification of the returned array will effect the
     * chart's internal filter storage.
     * @method filters
     * @memberof dc.baseMixin
     * @instance
     * @return {Array<*>}
     */
    _chart.filters = function () {
        return _filters;
    };

    _chart.highlightSelected = function (e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, true);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, false);
    };

    _chart.fadeDeselected = function (e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, false);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, true);
    };

    _chart.resetHighlight = function (e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, false);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, false);
    };

    /**
     * This function is passed to d3 as the onClick handler for each chart. The default behavior is to
     * filter on the clicked datum (passed to the callback) and redraw the chart group.
     * @method onClick
     * @memberof dc.baseMixin
     * @instance
     * @param {*} datum
     */
    _chart.onClick = function (datum) {
        var filter = _chart.keyAccessor()(datum);
        dc.events.trigger(function () {
            _chart.filter(filter);
            _chart.redrawGroup();
        });
    };

    /**
     * Set or get the filter handler. The filter handler is a function that performs the filter action
     * on a specific dimension. Using a custom filter handler allows you to perform additional logic
     * before or after filtering.
     * @method filterHandler
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://github.com/square/crossfilter/wiki/API-Reference#dimension_filter crossfilter.dimension.filter}
     * @example
     * // default filter handler
     * chart.filterHandler(function (dimension, filters) {
     *     dimension.filter(null);
     *     if (filters.length === 0) {
     *         dimension.filter(null);
     *     } else {
     *         dimension.filterFunction(function (d) {
     *             for (var i = 0; i < filters.length; i++) {
     *                 var filter = filters[i];
     *                 if (filter.isFiltered && filter.isFiltered(d)) {
     *                     return true;
     *                 } else if (filter <= d && filter >= d) {
     *                     return true;
     *                 }
     *             }
     *             return false;
     *         });
     *     }
     *     return filters;
     * });
     *
     * // custom filter handler
     * chart.filterHandler(function(dimension, filter){
     *     var newFilter = filter + 10;
     *     dimension.filter(newFilter);
     *     return newFilter; // set the actual filter value to the new value
     * });
     * @param {Function} [filterHandler]
     * @return {Function}
     * @return {dc.baseMixin}
     */
    _chart.filterHandler = function (filterHandler) {
        if (!arguments.length) {
            return _filterHandler;
        }
        _filterHandler = filterHandler;
        return _chart;
    };

    // abstract function stub
    _chart._doRender = function () {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    _chart._doRedraw = function () {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    _chart.legendables = function () {
        // do nothing in base, should be overridden by sub-function
        return [];
    };

    _chart.legendHighlight = function () {
        // do nothing in base, should be overridden by sub-function
    };

    _chart.legendReset = function () {
        // do nothing in base, should be overridden by sub-function
    };

    _chart.legendToggle = function () {
        // do nothing in base, should be overriden by sub-function
    };

    _chart.isLegendableHidden = function () {
        // do nothing in base, should be overridden by sub-function
        return false;
    };

    /**
     * Set or get the key accessor function. The key accessor function is used to retrieve the key
     * value from the crossfilter group. Key values are used differently in different charts, for
     * example keys correspond to slices in a pie chart and x axis positions in a grid coordinate chart.
     * @method keyAccessor
     * @memberof dc.baseMixin
     * @instance
     * @example
     * // default key accessor
     * chart.keyAccessor(function(d) { return d.key; });
     * // custom key accessor for a multi-value crossfilter reduction
     * chart.keyAccessor(function(p) { return p.value.absGain; });
     * @param {Function} [keyAccessor]
     * @return {Function}
     * @return {dc.baseMixin}
     */
    _chart.keyAccessor = function (keyAccessor) {
        if (!arguments.length) {
            return _keyAccessor;
        }
        _keyAccessor = keyAccessor;
        return _chart;
    };

    /**
     * Set or get the value accessor function. The value accessor function is used to retrieve the
     * value from the crossfilter group. Group values are used differently in different charts, for
     * example values correspond to slice sizes in a pie chart and y axis positions in a grid
     * coordinate chart.
     * @method valueAccessor
     * @memberof dc.baseMixin
     * @instance
     * @example
     * // default value accessor
     * chart.valueAccessor(function(d) { return d.value; });
     * // custom value accessor for a multi-value crossfilter reduction
     * chart.valueAccessor(function(p) { return p.value.percentageGain; });
     * @param {Function} [valueAccessor]
     * @return {Function}
     * @return {dc.baseMixin}
     */
    _chart.valueAccessor = function (valueAccessor) {
        if (!arguments.length) {
            return _valueAccessor;
        }
        _valueAccessor = valueAccessor;
        return _chart;
    };

    /**
     * Set or get the label function. The chart class will use this function to render labels for each
     * child element in the chart, e.g. slices in a pie chart or bubbles in a bubble chart. Not every
     * chart supports the label function, for example line chart does not use this function
     * at all. By default, enables labels; pass false for the second parameter if this is not desired.
     * @method label
     * @memberof dc.baseMixin
     * @instance
     * @example
     * // default label function just return the key
     * chart.label(function(d) { return d.key; });
     * // label function has access to the standard d3 data binding and can get quite complicated
     * chart.label(function(d) { return d.data.key + '(' + Math.floor(d.data.value / all.value() * 100) + '%)'; });
     * @param {Function} [labelFunction]
     * @param {Boolean} [enableLabels=true]
     * @return {Function}
     * @return {dc.baseMixin}
     */
    _chart.label = function (labelFunction, enableLabels) {
        if (!arguments.length) {
            return _label;
        }
        _label = labelFunction;
        if ((enableLabels === undefined) || enableLabels) {
            _renderLabel = true;
        }
        return _chart;
    };

    /**
     * Turn on/off label rendering
     * @method renderLabel
     * @memberof dc.baseMixin
     * @instance
     * @param {Boolean} [renderLabel=false]
     * @return {Boolean}
     * @return {dc.baseMixin}
     */
    _chart.renderLabel = function (renderLabel) {
        if (!arguments.length) {
            return _renderLabel;
        }
        _renderLabel = renderLabel;
        return _chart;
    };

    /**
     * Set or get the title function. The chart class will use this function to render the SVGElement title
     * (usually interpreted by browser as tooltips) for each child element in the chart, e.g. a slice
     * in a pie chart or a bubble in a bubble chart. Almost every chart supports the title function;
     * however in grid coordinate charts you need to turn off the brush in order to see titles, because
     * otherwise the brush layer will block tooltip triggering.
     * @method title
     * @memberof dc.baseMixin
     * @instance
     * @example
     * // default title function shows "key: value"
     * chart.title(function(d) { return d.key + ': ' + d.value; });
     * // title function has access to the standard d3 data binding and can get quite complicated
     * chart.title(function(p) {
     *    return p.key.getFullYear()
     *        + '\n'
     *        + 'Index Gain: ' + numberFormat(p.value.absGain) + '\n'
     *        + 'Index Gain in Percentage: ' + numberFormat(p.value.percentageGain) + '%\n'
     *        + 'Fluctuation / Index Ratio: ' + numberFormat(p.value.fluctuationPercentage) + '%';
     * });
     * @param {Function} [titleFunction]
     * @return {Function}
     * @return {dc.baseMixin}
     */
    _chart.title = function (titleFunction) {
        if (!arguments.length) {
            return _title;
        }
        _title = titleFunction;
        return _chart;
    };

    /**
     * Turn on/off title rendering, or return the state of the render title flag if no arguments are
     * given.
     * @method renderTitle
     * @memberof dc.baseMixin
     * @instance
     * @param {Boolean} [renderTitle=true]
     * @return {Boolean}
     * @return {dc.baseMixin}
     */
    _chart.renderTitle = function (renderTitle) {
        if (!arguments.length) {
            return _renderTitle;
        }
        _renderTitle = renderTitle;
        return _chart;
    };

    /**
     * A renderlet is similar to an event listener on rendering event. Multiple renderlets can be added
     * to an individual chart.  Each time a chart is rerendered or redrawn the renderlets are invoked
     * right after the chart finishes its transitions, giving you a way to modify the SVGElements.
     * Renderlet functions take the chart instance as the only input parameter and you can
     * use the dc API or use raw d3 to achieve pretty much any effect.
     *
     * Use {@link dc.baseMixin#on on} with a 'renderlet' prefix.
     * Generates a random key for the renderlet, which makes it hard to remove.
     * @method renderlet
     * @memberof dc.baseMixin
     * @instance
     * @deprecated
     * @example
     * // do this instead of .renderlet(function(chart) { ... })
     * chart.on("renderlet", function(chart){
     *     // mix of dc API and d3 manipulation
     *     chart.select('g.y').style('display', 'none');
     *     // its a closure so you can also access other chart variable available in the closure scope
     *     moveChart.filter(chart.filter());
     * });
     * @param {Function} renderletFunction
     * @return {dc.baseMixin}
     */
    _chart.renderlet = dc.logger.deprecate(function (renderletFunction) {
        _chart.on('renderlet.' + dc.utils.uniqueId(), renderletFunction);
        return _chart;
    }, 'chart.renderlet has been deprecated.  Please use chart.on("renderlet.<renderletKey>", renderletFunction)');

    /**
     * Get or set the chart group to which this chart belongs. Chart groups are rendered or redrawn
     * together since it is expected they share the same underlying crossfilter data set.
     * @method chartGroup
     * @memberof dc.baseMixin
     * @instance
     * @param {String} [chartGroup]
     * @return {String}
     * @return {dc.baseMixin}
     */
    _chart.chartGroup = function (chartGroup) {
        if (!arguments.length) {
            return _chartGroup;
        }
        if (!_isChild) {
            dc.deregisterChart(_chart, _chartGroup);
        }
        _chartGroup = chartGroup;
        if (!_isChild) {
            dc.registerChart(_chart, _chartGroup);
        }
        return _chart;
    };

    /**
     * Expire the internal chart cache. dc charts cache some data internally on a per chart basis to
     * speed up rendering and avoid unnecessary calculation; however it might be useful to clear the
     * cache if you have changed state which will affect rendering.  For example if you invoke the
     * {@link https://github.com/square/crossfilter/wiki/API-Reference#crossfilter_add crossfilter.add}
     * function or reset group or dimension after rendering it is a good idea to
     * clear the cache to make sure charts are rendered properly.
     * @method expireCache
     * @memberof dc.baseMixin
     * @instance
     * @return {dc.baseMixin}
     */
    _chart.expireCache = function () {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    /**
     * Attach a dc.legend widget to this chart. The legend widget will automatically draw legend labels
     * based on the color setting and names associated with each group.
     * @method legend
     * @memberof dc.baseMixin
     * @instance
     * @example
     * chart.legend(dc.legend().x(400).y(10).itemHeight(13).gap(5))
     * @param {dc.legend} [legend]
     * @return {dc.legend}
     * @return {dc.baseMixin}
     */
    _chart.legend = function (legend) {
        if (!arguments.length) {
            return _legend;
        }
        _legend = legend;
        _legend.parent(_chart);
        return _chart;
    };

    /**
     * Returns the internal numeric ID of the chart.
     * @method chartID
     * @memberof dc.baseMixin
     * @instance
     * @return {String}
     */
    _chart.chartID = function () {
        return _chart.__dcFlag__;
    };

    /**
     * Set chart options using a configuration object. Each key in the object will cause the method of
     * the same name to be called with the value to set that attribute for the chart.
     * @method options
     * @memberof dc.baseMixin
     * @instance
     * @example
     * chart.options({dimension: myDimension, group: myGroup});
     * @param {{}} opts
     * @return {dc.baseMixin}
     */
    _chart.options = function (opts) {
        var applyOptions = [
            'anchor',
            'group',
            'xAxisLabel',
            'yAxisLabel',
            'stack',
            'title',
            'point',
            'getColor',
            'overlayGeoJson'
        ];

        for (var o in opts) {
            if (typeof(_chart[o]) === 'function') {
                if (opts[o] instanceof Array && applyOptions.indexOf(o) !== -1) {
                    _chart[o].apply(_chart, opts[o]);
                } else {
                    _chart[o].call(_chart, opts[o]);
                }
            } else {
                dc.logger.debug('Not a valid option setter name: ' + o);
            }
        }
        return _chart;
    };

    /**
     * All dc chart instance supports the following listeners.
     * Supports the following events:
     * * `renderlet` - This listener function will be invoked after transitions after redraw and render. Replaces the
     * deprecated {@link dc.baseMixin#renderlet renderlet} method.
     * * `pretransition` - Like `.on('renderlet', ...)` but the event is fired before transitions start.
     * * `preRender` - This listener function will be invoked before chart rendering.
     * * `postRender` - This listener function will be invoked after chart finish rendering including
     * all renderlets' logic.
     * * `preRedraw` - This listener function will be invoked before chart redrawing.
     * * `postRedraw` - This listener function will be invoked after chart finish redrawing
     * including all renderlets' logic.
     * * `filtered` - This listener function will be invoked after a filter is applied, added or removed.
     * * `zoomed` - This listener function will be invoked after a zoom is triggered.
     * @method on
     * @memberof dc.baseMixin
     * @instance
     * @see {@link https://github.com/mbostock/d3/wiki/Internals#dispatch_on d3.dispatch.on}
     * @example
     * .on('renderlet', function(chart, filter){...})
     * .on('pretransition', function(chart, filter){...})
     * .on('preRender', function(chart){...})
     * .on('postRender', function(chart){...})
     * .on('preRedraw', function(chart){...})
     * .on('postRedraw', function(chart){...})
     * .on('filtered', function(chart, filter){...})
     * .on('zoomed', function(chart, filter){...})
     * @param {String} event
     * @param {Function} listener
     * @return {dc.baseMixin}
     */
    _chart.on = function (event, listener) {
        _listeners.on(event, listener);
        return _chart;
    };

    return _chart;
};

/**
 * Margin is a mixin that provides margin utility functions for both the Row Chart and Coordinate Grid
 * Charts.
 * @name marginMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @return {dc.marginMixin}
 */
dc.marginMixin = function (_chart) {
    var _margin = {top: 10, right: 50, bottom: 30, left: 30};

    /**
     * Get or set the margins for a particular coordinate grid chart instance. The margins is stored as
     * an associative Javascript array.
     * @method margins
     * @memberof dc.marginMixin
     * @instance
     * @example
     * var leftMargin = chart.margins().left; // 30 by default
     * chart.margins().left = 50;
     * leftMargin = chart.margins().left; // now 50
     * @param {{top: Number, right: Number, left: Number, bottom: Number}} [margins={top: 10, right: 50, bottom: 30, left: 30}]
     * @return {{top: Number, right: Number, left: Number, bottom: Number}}
     * @return {dc.marginMixin}
     */
    _chart.margins = function (margins) {
        if (!arguments.length) {
            return _margin;
        }
        _margin = margins;
        return _chart;
    };

    _chart.effectiveWidth = function () {
        return _chart.width() - _chart.margins().left - _chart.margins().right;
    };

    _chart.effectiveHeight = function () {
        return _chart.height() - _chart.margins().top - _chart.margins().bottom;
    };

    return _chart;
};

/**
 * The Color Mixin is an abstract chart functional class providing universal coloring support
 * as a mix-in for any concrete chart implementation.
 * @name colorMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @return {dc.colorMixin}
 */
dc.colorMixin = function (_chart) {
    var _colors = d3.scale.category20c();
    var _defaultAccessor = true;

    var _colorAccessor = function (d) { return _chart.keyAccessor()(d); };

    /**
     * Retrieve current color scale or set a new color scale. This methods accepts any function that
     * operates like a d3 scale.
     * @method colors
     * @memberof dc.colorMixin
     * @instance
     * @see {@link http://github.com/mbostock/d3/wiki/Scales d3.scale}
     * @example
     * // alternate categorical scale
     * chart.colors(d3.scale.category20b());
     * // ordinal scale
     * chart.colors(d3.scale.ordinal().range(['red','green','blue']));
     * // convenience method, the same as above
     * chart.ordinalColors(['red','green','blue']);
     * // set a linear scale
     * chart.linearColors(["#4575b4", "#ffffbf", "#a50026"]);
     * @param {d3.scale} [colorScale=d3.scale.category20c()]
     * @return {d3.scale}
     * @return {dc.colorMixin}
     */
    _chart.colors = function (colorScale) {
        if (!arguments.length) {
            return _colors;
        }
        if (colorScale instanceof Array) {
            _colors = d3.scale.quantize().range(colorScale); // deprecated legacy support, note: this fails for ordinal domains
        } else {
            _colors = d3.functor(colorScale);
        }
        return _chart;
    };

    /**
     * Convenience method to set the color scale to
     * {@link https://github.com/mbostock/d3/wiki/Ordinal-Scales#ordinal d3.scale.ordinal} with
     * range `r`.
     * @method ordinalColors
     * @memberof dc.colorMixin
     * @instance
     * @param {Array<String>} r
     * @return {dc.colorMixin}
     */
    _chart.ordinalColors = function (r) {
        return _chart.colors(d3.scale.ordinal().range(r));
    };

    /**
     * Convenience method to set the color scale to an Hcl interpolated linear scale with range `r`.
     * @method linearColors
     * @memberof dc.colorMixin
     * @instance
     * @param {Array<Number>} r
     * @return {dc.colorMixin}
     */
    _chart.linearColors = function (r) {
        return _chart.colors(d3.scale.linear()
                             .range(r)
                             .interpolate(d3.interpolateHcl));
    };

    /**
     * Set or the get color accessor function. This function will be used to map a data point in a
     * crossfilter group to a color value on the color scale. The default function uses the key
     * accessor.
     * @method colorAccessor
     * @memberof dc.colorMixin
     * @instance
     * @example
     * // default index based color accessor
     * .colorAccessor(function (d, i){return i;})
     * // color accessor for a multi-value crossfilter reduction
     * .colorAccessor(function (d){return d.value.absGain;})
     * @param {Function} [colorAccessor]
     * @return {Function}
     * @return {dc.colorMixin}
     */
    _chart.colorAccessor = function (colorAccessor) {
        if (!arguments.length) {
            return _colorAccessor;
        }
        _colorAccessor = colorAccessor;
        _defaultAccessor = false;
        return _chart;
    };

    // what is this?
    _chart.defaultColorAccessor = function () {
        return _defaultAccessor;
    };

    /**
     * Set or get the current domain for the color mapping function. The domain must be supplied as an
     * array.
     *
     * Note: previously this method accepted a callback function. Instead you may use a custom scale
     * set by {@link dc.colorMixin#colors .colors}.
     * @method colorDomain
     * @memberof dc.colorMixin
     * @instance
     * @param {Array<String>} [domain]
     * @return {Array<String>}
     * @return {dc.colorMixin}
     */
    _chart.colorDomain = function (domain) {
        if (!arguments.length) {
            return _colors.domain();
        }
        _colors.domain(domain);
        return _chart;
    };

    /**
     * Set the domain by determining the min and max values as retrieved by
     * {@link dc.colorMixin#colorAccessor .colorAccessor} over the chart's dataset.
     * @method calculateColorDomain
     * @memberof dc.colorMixin
     * @instance
     * @return {dc.colorMixin}
     */
    _chart.calculateColorDomain = function () {
        var newDomain = [d3.min(_chart.data(), _chart.colorAccessor()),
                         d3.max(_chart.data(), _chart.colorAccessor())];
        _colors.domain(newDomain);
        return _chart;
    };

    /**
     * Get the color for the datum d and counter i. This is used internally by charts to retrieve a color.
     * @method getColor
     * @memberof dc.colorMixin
     * @instance
     * @param {*} d
     * @param {Number} [i]
     * @return {String}
     */
    _chart.getColor = function (d, i) {
        return _colors(_colorAccessor.call(this, d, i));
    };

    /**
     * Get the color for the datum d and counter i. This is used internally by charts to retrieve a color.
     * @method colorCalculator
     * @memberof dc.colorMixin
     * @instance
     * @param {*} [colorCalculator]
     * @return {*}
     */
    _chart.colorCalculator = function (colorCalculator) {
        if (!arguments.length) {
            return _chart.getColor;
        }
        _chart.getColor = colorCalculator;
        return _chart;
    };

    return _chart;
};

/**
 * Coordinate Grid is an abstract base chart designed to support a number of coordinate grid based
 * concrete chart types, e.g. bar chart, line chart, and bubble chart.
 * @name coordinateGridMixin
 * @memberof dc
 * @mixin
 * @mixes dc.colorMixin
 * @mixes dc.marginMixin
 * @mixes dc.baseMixin
 * @param {Object} _chart
 * @return {dc.coordinateGridMixin}
 */
dc.coordinateGridMixin = function (_chart) {
    var GRID_LINE_CLASS = 'grid-line';
    var HORIZONTAL_CLASS = 'horizontal';
    var VERTICAL_CLASS = 'vertical';
    var Y_AXIS_LABEL_CLASS = 'y-axis-label';
    var X_AXIS_LABEL_CLASS = 'x-axis-label';
    var DEFAULT_AXIS_LABEL_PADDING = 12;

    _chart = dc.colorMixin(dc.marginMixin(dc.baseMixin(_chart)));

    _chart.colors(d3.scale.category10());
    _chart._mandatoryAttributes().push('x');

    function zoomHandler () {
        _refocused = true;
        if (_zoomOutRestrict) {
            _chart.x().domain(constrainRange(_chart.x().domain(), _xOriginalDomain));
            if (_rangeChart) {
                _chart.x().domain(constrainRange(_chart.x().domain(), _rangeChart.x().domain()));
            }
        }

        var domain = _chart.x().domain();
        var domFilter = dc.filters.RangedFilter(domain[0], domain[1]);

        _chart.replaceFilter(domFilter);
        _chart.rescale();
        _chart.redraw();

        if (_rangeChart && !rangesEqual(_chart.filter(), _rangeChart.filter())) {
            dc.events.trigger(function () {
                _rangeChart.replaceFilter(domFilter);
                _rangeChart.redraw();
            });
        }

        _chart._invokeZoomedListener();

        dc.events.trigger(function () {
            _chart.redrawGroup();
        }, dc.constants.EVENT_DELAY);

        _refocused = !rangesEqual(domain, _xOriginalDomain);
    }

    var _parent;
    var _g;
    var _chartBodyG;

    var _x;
    var _xOriginalDomain;
    var _xAxis = d3.svg.axis().orient('bottom');
    var _xUnits = dc.units.integers;
    var _xAxisPadding = 0;
    var _xElasticity = false;
    var _xAxisLabel;
    var _xAxisLabelPadding = 0;
    var _lastXDomain;

    var _y;
    var _yAxis = d3.svg.axis().orient('left');
    var _yAxisPadding = 0;
    var _yElasticity = false;
    var _yAxisLabel;
    var _yAxisLabelPadding = 0;

    var _brush = d3.svg.brush();
    var _brushOn = true;
    var _round;

    var _renderHorizontalGridLine = false;
    var _renderVerticalGridLine = false;

    var _refocused = false, _resizing = false;
    var _unitCount;

    var _zoomScale = [1, Infinity];
    var _zoomOutRestrict = true;

    var _zoom = d3.behavior.zoom().on('zoom', zoomHandler);
    var _nullZoom = d3.behavior.zoom().on('zoom', null);
    var _hasBeenMouseZoomable = false;

    var _rangeChart;
    var _focusChart;

    var _mouseZoomable = false;
    var _clipPadding = 0;

    var _outerRangeBandPadding = 0.5;
    var _rangeBandPadding = 0;

    var _useRightYAxis = false;

    /**
     * When changing the domain of the x or y scale, it is necessary to tell the chart to recalculate
     * and redraw the axes. (`.rescale()` is called automatically when the x or y scale is replaced
     * with {@link dc.coordinateGridMixin+x .x()} or {@link dc.coordinateGridMixin#y .y()}, and has
     * no effect on elastic scales.)
     * @method rescale
     * @memberof dc.coordinateGridMixin
     * @instance
     * @return {dc.coordinateGridMixin}
     */
    _chart.rescale = function () {
        _unitCount = undefined;
        _resizing = true;
        return _chart;
    };

    _chart.resizing = function () {
        return _resizing;
    };

    /**
     * Get or set the range selection chart associated with this instance. Setting the range selection
     * chart using this function will automatically update its selection brush when the current chart
     * zooms in. In return the given range chart will also automatically attach this chart as its focus
     * chart hence zoom in when range brush updates.
     *
     * Usually the range and focus charts will share a dimension. The range chart will set the zoom
     * boundaries for the focus chart, so its dimension values must be compatible with the domain of
     * the focus chart.
     *
     * See the [Nasdaq 100 Index](http://dc-js.github.com/dc.js/) example for this effect in action.
     * @method rangeChart
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {dc.coordinateGridMixin} [rangeChart]
     * @return {dc.coordinateGridMixin}
     */
    _chart.rangeChart = function (rangeChart) {
        if (!arguments.length) {
            return _rangeChart;
        }
        _rangeChart = rangeChart;
        _rangeChart.focusChart(_chart);
        return _chart;
    };

    /**
     * Get or set the scale extent for mouse zooms.
     * @method zoomScale
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Array<Number|Date>} [extent=[1, Infinity]]
     * @return {Array<Number|Date>}
     * @return {dc.coordinateGridMixin}
     */
    _chart.zoomScale = function (extent) {
        if (!arguments.length) {
            return _zoomScale;
        }
        _zoomScale = extent;
        return _chart;
    };

    /**
     * Get or set the zoom restriction for the chart. If true limits the zoom to origional domain of the chart.
     * @method zoomOutRestrict
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Boolean} [zoomOutRestrict=true]
     * @return {Boolean}
     * @return {dc.coordinateGridMixin}
     */
    _chart.zoomOutRestrict = function (zoomOutRestrict) {
        if (!arguments.length) {
            return _zoomOutRestrict;
        }
        _zoomScale[0] = zoomOutRestrict ? 1 : 0;
        _zoomOutRestrict = zoomOutRestrict;
        return _chart;
    };

    _chart._generateG = function (parent) {
        if (parent === undefined) {
            _parent = _chart.svg();
        } else {
            _parent = parent;
        }

        var href = window.location.href.split('#')[0];

        _g = _parent.append('g');

        _chartBodyG = _g.append('g').attr('class', 'chart-body')
            .attr('transform', 'translate(' + _chart.margins().left + ', ' + _chart.margins().top + ')')
            .attr('clip-path', 'url(' + href + '#' + getClipPathId() + ')');

        return _g;
    };

    /**
     * Get or set the root g element. This method is usually used to retrieve the g element in order to
     * overlay custom svg drawing programatically. **Caution**: The root g element is usually generated
     * by dc.js internals, and resetting it might produce unpredictable result.
     * @method g
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {SVGElement} [gElement]
     * @return {SVGElement}
     * @return {dc.coordinateGridMixin}
     */
    _chart.g = function (gElement) {
        if (!arguments.length) {
            return _g;
        }
        _g = gElement;
        return _chart;
    };

    /**
     * Set or get mouse zoom capability flag (default: false). When turned on the chart will be
     * zoomable using the mouse wheel. If the range selector chart is attached zooming will also update
     * the range selection brush on the associated range selector chart.
     * @method mouseZoomable
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Boolean} [mouseZoomable=false]
     * @return {Boolean}
     * @return {dc.coordinateGridMixin}
     */
    _chart.mouseZoomable = function (mouseZoomable) {
        if (!arguments.length) {
            return _mouseZoomable;
        }
        _mouseZoomable = mouseZoomable;
        return _chart;
    };

    /**
     * Retrieve the svg group for the chart body.
     * @method chartBodyG
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {SVGElement} [chartBodyG]
     * @return {SVGElement}
     */
    _chart.chartBodyG = function (chartBodyG) {
        if (!arguments.length) {
            return _chartBodyG;
        }
        _chartBodyG = chartBodyG;
        return _chart;
    };

    /**
     * **mandatory**
     *
     * Get or set the x scale. The x scale can be any d3
     * {@link https://github.com/mbostock/d3/wiki/Quantitative-Scales quantitive scale} or
     * {@link https://github.com/mbostock/d3/wiki/Ordinal-Scales ordinal scale}.
     * @method x
     * @memberof dc.coordinateGridMixin
     * @instance
     * @see {@link http://github.com/mbostock/d3/wiki/Scales d3.scale}
     * @example
     * // set x to a linear scale
     * chart.x(d3.scale.linear().domain([-2500, 2500]))
     * // set x to a time scale to generate histogram
     * chart.x(d3.time.scale().domain([new Date(1985, 0, 1), new Date(2012, 11, 31)]))
     * @param {d3.scale} [xScale]
     * @return {d3.scale}
     * @return {dc.coordinateGridMixin}
     */
    _chart.x = function (xScale) {
        if (!arguments.length) {
            return _x;
        }
        _x = xScale;
        _xOriginalDomain = _x.domain();
        _chart.rescale();
        return _chart;
    };

    _chart.xOriginalDomain = function () {
        return _xOriginalDomain;
    };

    /**
     * Set or get the xUnits function. The coordinate grid chart uses the xUnits function to calculate
     * the number of data projections on x axis such as the number of bars for a bar chart or the
     * number of dots for a line chart. This function is expected to return a Javascript array of all
     * data points on x axis, or the number of points on the axis. [d3 time range functions
     * d3.time.days, d3.time.months, and
     * d3.time.years](https://github.com/mbostock/d3/wiki/Time-Intervals#aliases) are all valid xUnits
     * function. dc.js also provides a few units function, see the {@link dc.utils Utilities} section for
     * a list of built-in units functions. The default xUnits function is dc.units.integers.
     * @method xUnits
     * @memberof dc.coordinateGridMixin
     * @instance
     * @todo Add docs for utilities
     * @example
     * // set x units to count days
     * chart.xUnits(d3.time.days);
     * // set x units to count months
     * chart.xUnits(d3.time.months);
     *
     * // A custom xUnits function can be used as long as it follows the following interface:
     * // units in integer
     * function(start, end, xDomain) {
     *      // simply calculates how many integers in the domain
     *      return Math.abs(end - start);
     * };
     *
     * // fixed units
     * function(start, end, xDomain) {
     *      // be aware using fixed units will disable the focus/zoom ability on the chart
     *      return 1000;
     * @param {Function} [xUnits]
     * @return {Function}
     * @return {dc.coordinateGridMixin}
     */
    _chart.xUnits = function (xUnits) {
        if (!arguments.length) {
            return _xUnits;
        }
        _xUnits = xUnits;
        return _chart;
    };

    /**
     * Set or get the x axis used by a particular coordinate grid chart instance. This function is most
     * useful when x axis customization is required. The x axis in dc.js is an instance of a [d3
     * axis object](https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis); therefore it supports any
     * valid d3 axis manipulation. **Caution**: The x axis is usually generated internally by dc;
     * resetting it may cause unexpected results.
     * @method xAxis
     * @memberof dc.coordinateGridMixin
     * @instance
     * @see {@link http://github.com/mbostock/d3/wiki/SVG-Axes d3.svg.axis}
     * @example
     * // customize x axis tick format
     * chart.xAxis().tickFormat(function(v) {return v + '%';});
     * // customize x axis tick values
     * chart.xAxis().tickValues([0, 100, 200, 300]);
     * @param {d3.svg.axis} [xAxis=d3.svg.axis().orient('bottom')]
     * @return {d3.svg.axis}
     * @return {dc.coordinateGridMixin}
     */
    _chart.xAxis = function (xAxis) {
        if (!arguments.length) {
            return _xAxis;
        }
        _xAxis = xAxis;
        return _chart;
    };

    /**
     * Turn on/off elastic x axis behavior. If x axis elasticity is turned on, then the grid chart will
     * attempt to recalculate the x axis range whenever a redraw event is triggered.
     * @method elasticX
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Boolean} [elasticX=false]
     * @return {Boolean}
     * @return {dc.coordinateGridMixin}
     */
    _chart.elasticX = function (elasticX) {
        if (!arguments.length) {
            return _xElasticity;
        }
        _xElasticity = elasticX;
        return _chart;
    };

    /**
     * Set or get x axis padding for the elastic x axis. The padding will be added to both end of the x
     * axis if elasticX is turned on; otherwise it is ignored.
     *
     * padding can be an integer or percentage in string (e.g. '10%'). Padding can be applied to
     * number or date x axes.  When padding a date axis, an integer represents number of days being padded
     * and a percentage string will be treated the same as an integer.
     * @method xAxisPadding
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Number|String} [padding=0]
     * @return {Number|String}
     * @return {dc.coordinateGridMixin}
     */
    _chart.xAxisPadding = function (padding) {
        if (!arguments.length) {
            return _xAxisPadding;
        }
        _xAxisPadding = padding;
        return _chart;
    };

    /**
     * Returns the number of units displayed on the x axis using the unit measure configured by
     * .xUnits.
     * @method xUnitCount
     * @memberof dc.coordinateGridMixin
     * @instance
     * @return {Number}
     */
    _chart.xUnitCount = function () {
        if (_unitCount === undefined) {
            var units = _chart.xUnits()(_chart.x().domain()[0], _chart.x().domain()[1], _chart.x().domain());

            if (units instanceof Array) {
                _unitCount = units.length;
            } else {
                _unitCount = units;
            }
        }

        return _unitCount;
    };

    /**
     * Gets or sets whether the chart should be drawn with a right axis instead of a left axis. When
     * used with a chart in a composite chart, allows both left and right Y axes to be shown on a
     * chart.
     * @method useRightYAxis
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Boolean} [useRightYAxis=false]
     * @return {Boolean}
     * @return {dc.coordinateGridMixin}
     */
    _chart.useRightYAxis = function (useRightYAxis) {
        if (!arguments.length) {
            return _useRightYAxis;
        }
        _useRightYAxis = useRightYAxis;
        return _chart;
    };

    /**
     * Returns true if the chart is using ordinal xUnits ({@link dc.units.ordinal dc.units.ordinal}, or false
     * otherwise. Most charts behave differently with ordinal data and use the result of this method to
     * trigger the appropriate logic.
     * @method isOrdinal
     * @memberof dc.coordinateGridMixin
     * @instance
     * @return {Boolean}
     */
    _chart.isOrdinal = function () {
        return _chart.xUnits() === dc.units.ordinal;
    };

    _chart._useOuterPadding = function () {
        return true;
    };

    _chart._ordinalXDomain = function () {
        var groups = _chart._computeOrderedGroups(_chart.data());
        return groups.map(_chart.keyAccessor());
    };

    function compareDomains (d1, d2) {
        return !d1 || !d2 || d1.length !== d2.length ||
            d1.some(function (elem, i) { return (elem && d2[i]) ? elem.toString() !== d2[i].toString() : elem === d2[i]; });
    }

    function prepareXAxis (g, render) {
        if (!_chart.isOrdinal()) {
            if (_chart.elasticX()) {
                _x.domain([_chart.xAxisMin(), _chart.xAxisMax()]);
            }
        } else { // _chart.isOrdinal()
            if (_chart.elasticX() || _x.domain().length === 0) {
                _x.domain(_chart._ordinalXDomain());
            }
        }

        // has the domain changed?
        var xdom = _x.domain();
        if (render || compareDomains(_lastXDomain, xdom)) {
            _chart.rescale();
        }
        _lastXDomain = xdom;

        // please can't we always use rangeBands for bar charts?
        if (_chart.isOrdinal()) {
            _x.rangeBands([0, _chart.xAxisLength()], _rangeBandPadding,
                          _chart._useOuterPadding() ? _outerRangeBandPadding : 0);
        } else {
            _x.range([0, _chart.xAxisLength()]);
        }

        _xAxis = _xAxis.scale(_chart.x());

        renderVerticalGridLines(g);
    }

    _chart.renderXAxis = function (g) {
        var axisXG = g.selectAll('g.x');

        if (axisXG.empty()) {
            axisXG = g.append('g')
                .attr('class', 'axis x')
                .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart._xAxisY() + ')');
        }

        var axisXLab = g.selectAll('text.' + X_AXIS_LABEL_CLASS);
        if (axisXLab.empty() && _chart.xAxisLabel()) {
            axisXLab = g.append('text')
                .attr('class', X_AXIS_LABEL_CLASS)
                .attr('transform', 'translate(' + (_chart.margins().left + _chart.xAxisLength() / 2) + ',' +
                      (_chart.height() - _xAxisLabelPadding) + ')')
                .attr('text-anchor', 'middle');
        }
        if (_chart.xAxisLabel() && axisXLab.text() !== _chart.xAxisLabel()) {
            axisXLab.text(_chart.xAxisLabel());
        }

        dc.transition(axisXG, _chart.transitionDuration())
            .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart._xAxisY() + ')')
            .call(_xAxis);
        dc.transition(axisXLab, _chart.transitionDuration())
            .attr('transform', 'translate(' + (_chart.margins().left + _chart.xAxisLength() / 2) + ',' +
                  (_chart.height() - _xAxisLabelPadding) + ')');
    };

    function renderVerticalGridLines (g) {
        var gridLineG = g.selectAll('g.' + VERTICAL_CLASS);

        if (_renderVerticalGridLine) {
            if (gridLineG.empty()) {
                gridLineG = g.insert('g', ':first-child')
                    .attr('class', GRID_LINE_CLASS + ' ' + VERTICAL_CLASS)
                    .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');
            }

            var ticks = _xAxis.tickValues() ? _xAxis.tickValues() :
                    (typeof _x.ticks === 'function' ? _x.ticks(_xAxis.ticks()[0]) : _x.domain());

            var lines = gridLineG.selectAll('line')
                .data(ticks);

            // enter
            var linesGEnter = lines.enter()
                .append('line')
                .attr('x1', function (d) {
                    return _x(d);
                })
                .attr('y1', _chart._xAxisY() - _chart.margins().top)
                .attr('x2', function (d) {
                    return _x(d);
                })
                .attr('y2', 0)
                .attr('opacity', 0);
            dc.transition(linesGEnter, _chart.transitionDuration())
                .attr('opacity', 1);

            // update
            dc.transition(lines, _chart.transitionDuration())
                .attr('x1', function (d) {
                    return _x(d);
                })
                .attr('y1', _chart._xAxisY() - _chart.margins().top)
                .attr('x2', function (d) {
                    return _x(d);
                })
                .attr('y2', 0);

            // exit
            lines.exit().remove();
        } else {
            gridLineG.selectAll('line').remove();
        }
    }

    _chart._xAxisY = function () {
        return (_chart.height() - _chart.margins().bottom);
    };

    _chart.xAxisLength = function () {
        return _chart.effectiveWidth();
    };

    /**
     * Set or get the x axis label. If setting the label, you may optionally include additional padding to
     * the margin to make room for the label. By default the padded is set to 12 to accomodate the text height.
     * @method xAxisLabel
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {String} [labelText]
     * @param {Number} [padding=12]
     * @return {String}
     */
    _chart.xAxisLabel = function (labelText, padding) {
        if (!arguments.length) {
            return _xAxisLabel;
        }
        _xAxisLabel = labelText;
        _chart.margins().bottom -= _xAxisLabelPadding;
        _xAxisLabelPadding = (padding === undefined) ? DEFAULT_AXIS_LABEL_PADDING : padding;
        _chart.margins().bottom += _xAxisLabelPadding;
        return _chart;
    };

    _chart._prepareYAxis = function (g) {
        if (_y === undefined || _chart.elasticY()) {
            if (_y === undefined) {
                _y = d3.scale.linear();
            }
            var min = _chart.yAxisMin() || 0,
                max = _chart.yAxisMax() || 0;
            _y.domain([min, max]).rangeRound([_chart.yAxisHeight(), 0]);
        }

        _y.range([_chart.yAxisHeight(), 0]);
        _yAxis = _yAxis.scale(_y);

        if (_useRightYAxis) {
            _yAxis.orient('right');
        }

        _chart._renderHorizontalGridLinesForAxis(g, _y, _yAxis);
    };

    _chart.renderYAxisLabel = function (axisClass, text, rotation, labelXPosition) {
        labelXPosition = labelXPosition || _yAxisLabelPadding;

        var axisYLab = _chart.g().selectAll('text.' + Y_AXIS_LABEL_CLASS + '.' + axisClass + '-label');
        var labelYPosition = (_chart.margins().top + _chart.yAxisHeight() / 2);
        if (axisYLab.empty() && text) {
            axisYLab = _chart.g().append('text')
                .attr('transform', 'translate(' + labelXPosition + ',' + labelYPosition + '),rotate(' + rotation + ')')
                .attr('class', Y_AXIS_LABEL_CLASS + ' ' + axisClass + '-label')
                .attr('text-anchor', 'middle')
                .text(text);
        }
        if (text && axisYLab.text() !== text) {
            axisYLab.text(text);
        }
        dc.transition(axisYLab, _chart.transitionDuration())
            .attr('transform', 'translate(' + labelXPosition + ',' + labelYPosition + '),rotate(' + rotation + ')');
    };

    _chart.renderYAxisAt = function (axisClass, axis, position) {
        var axisYG = _chart.g().selectAll('g.' + axisClass);
        if (axisYG.empty()) {
            axisYG = _chart.g().append('g')
                .attr('class', 'axis ' + axisClass)
                .attr('transform', 'translate(' + position + ',' + _chart.margins().top + ')');
        }

        dc.transition(axisYG, _chart.transitionDuration())
            .attr('transform', 'translate(' + position + ',' + _chart.margins().top + ')')
            .call(axis);
    };

    _chart.renderYAxis = function () {
        var axisPosition = _useRightYAxis ? (_chart.width() - _chart.margins().right) : _chart._yAxisX();
        _chart.renderYAxisAt('y', _yAxis, axisPosition);
        var labelPosition = _useRightYAxis ? (_chart.width() - _yAxisLabelPadding) : _yAxisLabelPadding;
        var rotation = _useRightYAxis ? 90 : -90;
        _chart.renderYAxisLabel('y', _chart.yAxisLabel(), rotation, labelPosition);
    };

    _chart._renderHorizontalGridLinesForAxis = function (g, scale, axis) {
        var gridLineG = g.selectAll('g.' + HORIZONTAL_CLASS);

        if (_renderHorizontalGridLine) {
            var ticks = axis.tickValues() ? axis.tickValues() : scale.ticks(axis.ticks()[0]);

            if (gridLineG.empty()) {
                gridLineG = g.insert('g', ':first-child')
                    .attr('class', GRID_LINE_CLASS + ' ' + HORIZONTAL_CLASS)
                    .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');
            }

            var lines = gridLineG.selectAll('line')
                .data(ticks);

            // enter
            var linesGEnter = lines.enter()
                .append('line')
                .attr('x1', 1)
                .attr('y1', function (d) {
                    return scale(d);
                })
                .attr('x2', _chart.xAxisLength())
                .attr('y2', function (d) {
                    return scale(d);
                })
                .attr('opacity', 0);
            dc.transition(linesGEnter, _chart.transitionDuration())
                .attr('opacity', 1);

            // update
            dc.transition(lines, _chart.transitionDuration())
                .attr('x1', 1)
                .attr('y1', function (d) {
                    return scale(d);
                })
                .attr('x2', _chart.xAxisLength())
                .attr('y2', function (d) {
                    return scale(d);
                });

            // exit
            lines.exit().remove();
        } else {
            gridLineG.selectAll('line').remove();
        }
    };

    _chart._yAxisX = function () {
        return _chart.useRightYAxis() ? _chart.width() - _chart.margins().right : _chart.margins().left;
    };

    /**
     * Set or get the y axis label. If setting the label, you may optionally include additional padding
     * to the margin to make room for the label. By default the padded is set to 12 to accomodate the
     * text height.
     * @method yAxisLabel
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {String} [labelText]
     * @param {Number} [padding=12]
     * @return {String}
     * @return {dc.coordinateGridMixin}
     */
    _chart.yAxisLabel = function (labelText, padding) {
        if (!arguments.length) {
            return _yAxisLabel;
        }
        _yAxisLabel = labelText;
        _chart.margins().left -= _yAxisLabelPadding;
        _yAxisLabelPadding = (padding === undefined) ? DEFAULT_AXIS_LABEL_PADDING : padding;
        _chart.margins().left += _yAxisLabelPadding;
        return _chart;
    };

    /**
     * Get or set the y scale. The y scale is typically automatically determined by the chart implementation.
     * @method y
     * @memberof dc.coordinateGridMixin
     * @instance
     * @see {@link http://github.com/mbostock/d3/wiki/Scales d3.scale}
     * @param {d3.scale} [yScale]
     * @return {d3.scale}
     * @return {dc.coordinateGridMixin}
     */
    _chart.y = function (yScale) {
        if (!arguments.length) {
            return _y;
        }
        _y = yScale;
        _chart.rescale();
        return _chart;
    };

    /**
     * Set or get the y axis used by the coordinate grid chart instance. This function is most useful
     * when y axis customization is required. The y axis in dc.js is simply an instance of a [d3 axis
     * object](https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-_axis); therefore it supports any
     * valid d3 axis manipulation. **Caution**: The y axis is usually generated internally by dc;
     * resetting it may cause unexpected results.
     * @method yAxis
     * @memberof dc.coordinateGridMixin
     * @instance
     * @see {@link http://github.com/mbostock/d3/wiki/SVG-Axes d3.svg.axis}
     * @example
     * // customize y axis tick format
     * chart.yAxis().tickFormat(function(v) {return v + '%';});
     * // customize y axis tick values
     * chart.yAxis().tickValues([0, 100, 200, 300]);
     * @param {d3.svg.axis} [yAxis=d3.svg.axis().orient('left')]
     * @return {d3.svg.axis}
     * @return {dc.coordinateGridMixin}
     */
    _chart.yAxis = function (yAxis) {
        if (!arguments.length) {
            return _yAxis;
        }
        _yAxis = yAxis;
        return _chart;
    };

    /**
     * Turn on/off elastic y axis behavior. If y axis elasticity is turned on, then the grid chart will
     * attempt to recalculate the y axis range whenever a redraw event is triggered.
     * @method elasticY
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Boolean} [elasticY=false]
     * @return {Boolean}
     * @return {dc.coordinateGridMixin}
     */
    _chart.elasticY = function (elasticY) {
        if (!arguments.length) {
            return _yElasticity;
        }
        _yElasticity = elasticY;
        return _chart;
    };

    /**
     * Turn on/off horizontal grid lines.
     * @method renderHorizontalGridLines
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Boolean} [renderHorizontalGridLines=false]
     * @return {Boolean}
     * @return {dc.coordinateGridMixin}
     */
    _chart.renderHorizontalGridLines = function (renderHorizontalGridLines) {
        if (!arguments.length) {
            return _renderHorizontalGridLine;
        }
        _renderHorizontalGridLine = renderHorizontalGridLines;
        return _chart;
    };

    /**
     * Turn on/off vertical grid lines.
     * @method renderVerticalGridLines
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Boolean} [renderVerticalGridLines=false]
     * @return {Boolean}
     * @return {dc.coordinateGridMixin}
     */
    _chart.renderVerticalGridLines = function (renderVerticalGridLines) {
        if (!arguments.length) {
            return _renderVerticalGridLine;
        }
        _renderVerticalGridLine = renderVerticalGridLines;
        return _chart;
    };

    /**
     * Calculates the minimum x value to display in the chart. Includes xAxisPadding if set.
     * @method xAxisMin
     * @memberof dc.coordinateGridMixin
     * @instance
     * @return {*}
     */
    _chart.xAxisMin = function () {
        var min = d3.min(_chart.data(), function (e) {
            return _chart.keyAccessor()(e);
        });
        return dc.utils.subtract(min, _xAxisPadding);
    };

    /**
     * Calculates the maximum x value to display in the chart. Includes xAxisPadding if set.
     * @method xAxisMax
     * @memberof dc.coordinateGridMixin
     * @instance
     * @return {*}
     */
    _chart.xAxisMax = function () {
        var max = d3.max(_chart.data(), function (e) {
            return _chart.keyAccessor()(e);
        });
        return dc.utils.add(max, _xAxisPadding);
    };

    /**
     * Calculates the minimum y value to display in the chart. Includes yAxisPadding if set.
     * @method yAxisMin
     * @memberof dc.coordinateGridMixin
     * @instance
     * @return {*}
     */
    _chart.yAxisMin = function () {
        var min = d3.min(_chart.data(), function (e) {
            return _chart.valueAccessor()(e);
        });
        return dc.utils.subtract(min, _yAxisPadding);
    };

    /**
     * Calculates the maximum y value to display in the chart. Includes yAxisPadding if set.
     * @method yAxisMax
     * @memberof dc.coordinateGridMixin
     * @instance
     * @return {*}
     */
    _chart.yAxisMax = function () {
        var max = d3.max(_chart.data(), function (e) {
            return _chart.valueAccessor()(e);
        });
        return dc.utils.add(max, _yAxisPadding);
    };

    /**
     * Set or get y axis padding for the elastic y axis. The padding will be added to the top and
     * bottom of the y axis if elasticY is turned on; otherwise it is ignored.
     *
     * Padding can be an integer or percentage in string (e.g. '10%'). Padding can be applied to
     * number or date axes. When padding a date axis, an integer represents number of days being padded
     * and a percentage string will be treated the same as an integer.
     * @method yAxisPadding
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Number|String} [padding=0]
     * @return {Number}
     * @return {dc.coordinateGridMixin}
     */
    _chart.yAxisPadding = function (padding) {
        if (!arguments.length) {
            return _yAxisPadding;
        }
        _yAxisPadding = padding;
        return _chart;
    };

    _chart.yAxisHeight = function () {
        return _chart.effectiveHeight();
    };

    /**
     * Set or get the rounding function used to quantize the selection when brushing is enabled.
     * @method round
     * @memberof dc.coordinateGridMixin
     * @instance
     * @example
     * // set x unit round to by month, this will make sure range selection brush will
     * // select whole months
     * chart.round(d3.time.month.round);
     * @param {Function} [round]
     * @return {Function}
     * @return {dc.coordinateGridMixin}
     */
    _chart.round = function (round) {
        if (!arguments.length) {
            return _round;
        }
        _round = round;
        return _chart;
    };

    _chart._rangeBandPadding = function (_) {
        if (!arguments.length) {
            return _rangeBandPadding;
        }
        _rangeBandPadding = _;
        return _chart;
    };

    _chart._outerRangeBandPadding = function (_) {
        if (!arguments.length) {
            return _outerRangeBandPadding;
        }
        _outerRangeBandPadding = _;
        return _chart;
    };

    dc.override(_chart, 'filter', function (_) {
        if (!arguments.length) {
            return _chart._filter();
        }

        _chart._filter(_);

        if (_) {
            _chart.brush().extent(_);
        } else {
            _chart.brush().clear();
        }

        return _chart;
    });

    _chart.brush = function (_) {
        if (!arguments.length) {
            return _brush;
        }
        _brush = _;
        return _chart;
    };

    function brushHeight () {
        return _chart._xAxisY() - _chart.margins().top;
    }

    _chart.renderBrush = function (g) {
        if (_brushOn) {
            _brush.on('brush', _chart._brushing);
            _brush.on('brushstart', _chart._disableMouseZoom);
            _brush.on('brushend', configureMouseZoom);

            var gBrush = g.append('g')
                .attr('class', 'brush')
                .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')')
                .call(_brush.x(_chart.x()));
            _chart.setBrushY(gBrush, false);
            _chart.setHandlePaths(gBrush);

            if (_chart.hasFilter()) {
                _chart.redrawBrush(g, false);
            }
        }
    };

    _chart.setHandlePaths = function (gBrush) {
        gBrush.selectAll('.resize').append('path').attr('d', _chart.resizeHandlePath);
    };

    _chart.setBrushY = function (gBrush) {
        gBrush.selectAll('rect')
            .attr('height', brushHeight());
        gBrush.selectAll('.resize path')
            .attr('d', _chart.resizeHandlePath);
    };

    _chart.extendBrush = function () {
        var extent = _brush.extent();
        if (_chart.round()) {
            extent[0] = extent.map(_chart.round())[0];
            extent[1] = extent.map(_chart.round())[1];

            _g.select('.brush')
                .call(_brush.extent(extent));
        }
        return extent;
    };

    _chart.brushIsEmpty = function (extent) {
        return _brush.empty() || !extent || extent[1] <= extent[0];
    };

    _chart._brushing = function () {
        var extent = _chart.extendBrush();

        _chart.redrawBrush(_g, false);

        if (_chart.brushIsEmpty(extent)) {
            dc.events.trigger(function () {
                _chart.filter(null);
                _chart.redrawGroup();
            }, dc.constants.EVENT_DELAY);
        } else {
            var rangedFilter = dc.filters.RangedFilter(extent[0], extent[1]);

            dc.events.trigger(function () {
                _chart.replaceFilter(rangedFilter);
                _chart.redrawGroup();
            }, dc.constants.EVENT_DELAY);
        }
    };

    _chart.redrawBrush = function (g, doTransition) {
        if (_brushOn) {
            if (_chart.filter() && _chart.brush().empty()) {
                _chart.brush().extent(_chart.filter());
            }

            var gBrush = dc.optionalTransition(doTransition, _chart.transitionDuration())(g.select('g.brush'));
            _chart.setBrushY(gBrush);
            gBrush.call(_chart.brush()
                      .x(_chart.x())
                      .extent(_chart.brush().extent()));
        }

        _chart.fadeDeselectedArea();
    };

    _chart.fadeDeselectedArea = function () {
        // do nothing, sub-chart should override this function
    };

    // borrowed from Crossfilter example
    _chart.resizeHandlePath = function (d) {
        var e = +(d === 'e'), x = e ? 1 : -1, y = brushHeight() / 3;
        return 'M' + (0.5 * x) + ',' + y +
            'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6) +
            'V' + (2 * y - 6) +
            'A6,6 0 0 ' + e + ' ' + (0.5 * x) + ',' + (2 * y) +
            'Z' +
            'M' + (2.5 * x) + ',' + (y + 8) +
            'V' + (2 * y - 8) +
            'M' + (4.5 * x) + ',' + (y + 8) +
            'V' + (2 * y - 8);
    };

    function getClipPathId () {
        return _chart.anchorName().replace(/[ .#=\[\]]/g, '-') + '-clip';
    }

    /**
     * Get or set the padding in pixels for the clip path. Once set padding will be applied evenly to
     * the top, left, right, and bottom when the clip path is generated. If set to zero, the clip area
     * will be exactly the chart body area minus the margins.
     * @method clipPadding
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Number} [padding=5]
     * @return {Number}
     * @return {dc.coordinateGridMixin}
     */
    _chart.clipPadding = function (padding) {
        if (!arguments.length) {
            return _clipPadding;
        }
        _clipPadding = padding;
        return _chart;
    };

    function generateClipPath () {
        var defs = dc.utils.appendOrSelect(_parent, 'defs');
        // cannot select <clippath> elements; bug in WebKit, must select by id
        // https://groups.google.com/forum/#!topic/d3-js/6EpAzQ2gU9I
        var id = getClipPathId();
        var chartBodyClip = dc.utils.appendOrSelect(defs, '#' + id, 'clipPath').attr('id', id);

        var padding = _clipPadding * 2;

        dc.utils.appendOrSelect(chartBodyClip, 'rect')
            .attr('width', _chart.xAxisLength() + padding)
            .attr('height', _chart.yAxisHeight() + padding)
            .attr('transform', 'translate(-' + _clipPadding + ', -' + _clipPadding + ')');
    }

    _chart._preprocessData = function () {};

    _chart._doRender = function () {
        _chart.resetSvg();

        _chart._preprocessData();

        _chart._generateG();
        generateClipPath();

        drawChart(true);

        configureMouseZoom();

        return _chart;
    };

    _chart._doRedraw = function () {
        _chart._preprocessData();

        drawChart(false);
        generateClipPath();

        return _chart;
    };

    function drawChart (render) {
        if (_chart.isOrdinal()) {
            _brushOn = false;
        }

        prepareXAxis(_chart.g(), render);
        _chart._prepareYAxis(_chart.g());

        _chart.plotData();

        if (_chart.elasticX() || _resizing || render) {
            _chart.renderXAxis(_chart.g());
        }

        if (_chart.elasticY() || _resizing || render) {
            _chart.renderYAxis(_chart.g());
        }

        if (render) {
            _chart.renderBrush(_chart.g(), false);
        } else {
            _chart.redrawBrush(_chart.g(), _resizing);
        }
        _chart.fadeDeselectedArea();
        _resizing = false;
    }

    function configureMouseZoom () {
        if (_mouseZoomable) {
            _chart._enableMouseZoom();
        } else if (_hasBeenMouseZoomable) {
            _chart._disableMouseZoom();
        }
    }

    _chart._enableMouseZoom = function () {
        _hasBeenMouseZoomable = true;
        _zoom.x(_chart.x())
            .scaleExtent(_zoomScale)
            .size([_chart.width(), _chart.height()])
            .duration(_chart.transitionDuration());
        _chart.root().call(_zoom);
    };

    _chart._disableMouseZoom = function () {
        _chart.root().call(_nullZoom);
    };

    function constrainRange (range, constraint) {
        var constrainedRange = [];
        constrainedRange[0] = d3.max([range[0], constraint[0]]);
        constrainedRange[1] = d3.min([range[1], constraint[1]]);
        return constrainedRange;
    }

    /**
     * Zoom this chart to focus on the given range. The given range should be an array containing only
     * 2 elements (`[start, end]`) defining a range in the x domain. If the range is not given or set
     * to null, then the zoom will be reset. _For focus to work elasticX has to be turned off;
     * otherwise focus will be ignored.
     * @method focus
     * @memberof dc.coordinateGridMixin
     * @instance
     * @example
     * chart.on('renderlet', function(chart) {
     *     // smooth the rendering through event throttling
     *     dc.events.trigger(function(){
     *          // focus some other chart to the range selected by user on this chart
     *          someOtherChart.focus(chart.filter());
     *     });
     * })
     * @param {Array<Number>} [range]
     */
    _chart.focus = function (range) {
        if (hasRangeSelected(range)) {
            _chart.x().domain(range);
        } else {
            _chart.x().domain(_xOriginalDomain);
        }

        _zoom.x(_chart.x());
        zoomHandler();
    };

    _chart.refocused = function () {
        return _refocused;
    };

    _chart.focusChart = function (c) {
        if (!arguments.length) {
            return _focusChart;
        }
        _focusChart = c;
        _chart.on('filtered', function (chart) {
            if (!chart.filter()) {
                dc.events.trigger(function () {
                    _focusChart.x().domain(_focusChart.xOriginalDomain());
                });
            } else if (!rangesEqual(chart.filter(), _focusChart.filter())) {
                dc.events.trigger(function () {
                    _focusChart.focus(chart.filter());
                });
            }
        });
        return _chart;
    };

    function rangesEqual (range1, range2) {
        if (!range1 && !range2) {
            return true;
        } else if (!range1 || !range2) {
            return false;
        } else if (range1.length === 0 && range2.length === 0) {
            return true;
        } else if (range1[0].valueOf() === range2[0].valueOf() &&
            range1[1].valueOf() === range2[1].valueOf()) {
            return true;
        }
        return false;
    }

    /**
     * Turn on/off the brush-based range filter. When brushing is on then user can drag the mouse
     * across a chart with a quantitative scale to perform range filtering based on the extent of the
     * brush, or click on the bars of an ordinal bar chart or slices of a pie chart to filter and
     * un-filter them. However turning on the brush filter will disable other interactive elements on
     * the chart such as highlighting, tool tips, and reference lines. Zooming will still be possible
     * if enabled, but only via scrolling (panning will be disabled.)
     * @method brushOn
     * @memberof dc.coordinateGridMixin
     * @instance
     * @param {Boolean} [brushOn=true]
     * @return {Boolean}
     * @return {dc.coordinateGridMixin}
     */
    _chart.brushOn = function (brushOn) {
        if (!arguments.length) {
            return _brushOn;
        }
        _brushOn = brushOn;
        return _chart;
    };

    function hasRangeSelected (range) {
        return range instanceof Array && range.length > 1;
    }

    return _chart;
};

/**
 * Stack Mixin is an mixin that provides cross-chart support of stackability using d3.layout.stack.
 * @name stackMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @return {dc.stackMixin}
 */
dc.stackMixin = function (_chart) {

    function prepareValues (layer, layerIdx) {
        var valAccessor = layer.accessor || _chart.valueAccessor();
        layer.name = String(layer.name || layerIdx);
        layer.values = layer.group.all().map(function (d, i) {
            return {
                x: _chart.keyAccessor()(d, i),
                y: layer.hidden ? null : valAccessor(d, i),
                data: d,
                layer: layer.name,
                hidden: layer.hidden
            };
        });

        layer.values = layer.values.filter(domainFilter());
        return layer.values;
    }

    var _stackLayout = d3.layout.stack()
        .values(prepareValues);

    var _stack = [];
    var _titles = {};

    var _hidableStacks = false;

    function domainFilter () {
        if (!_chart.x()) {
            return d3.functor(true);
        }
        var xDomain = _chart.x().domain();
        if (_chart.isOrdinal()) {
            // TODO #416
            //var domainSet = d3.set(xDomain);
            return function () {
                return true; //domainSet.has(p.x);
            };
        }
        if (_chart.elasticX()) {
            return function () { return true; };
        }
        return function (p) {
            //return true;
            return p.x >= xDomain[0] && p.x <= xDomain[xDomain.length - 1];
        };
    }

    /**
     * Stack a new crossfilter group onto this chart with an optional custom value accessor. All stacks
     * in the same chart will share the same key accessor and therefore the same set of keys.
     *
     * For example, in a stacked bar chart, the bars of each stack will be positioned using the same set
     * of keys on the x axis, while stacked vertically. If name is specified then it will be used to
     * generate the legend label.
     * @method stack
     * @memberof dc.stackMixin
     * @instance
     * @see {@link https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce crossfilter.group}
     * @example
     * // stack group using default accessor
     * chart.stack(valueSumGroup)
     * // stack group using custom accessor
     * .stack(avgByDayGroup, function(d){return d.value.avgByDay;});
     * @param {crossfilter.group} group
     * @param {String} [name]
     * @param {Function} [accessor]
     * @return {Array<{group: crossfilter.group, name: String, accessor: Function}>}
     * @return {dc.stackMixin}
     */
    _chart.stack = function (group, name, accessor) {
        if (!arguments.length) {
            return _stack;
        }

        if (arguments.length <= 2) {
            accessor = name;
        }

        var layer = {group: group};
        if (typeof name === 'string') {
            layer.name = name;
        }
        if (typeof accessor === 'function') {
            layer.accessor = accessor;
        }
        _stack.push(layer);

        return _chart;
    };

    dc.override(_chart, 'group', function (g, n, f) {
        if (!arguments.length) {
            return _chart._group();
        }
        _stack = [];
        _titles = {};
        _chart.stack(g, n);
        if (f) {
            _chart.valueAccessor(f);
        }
        return _chart._group(g, n);
    });

    /**
     * Allow named stacks to be hidden or shown by clicking on legend items.
     * This does not affect the behavior of hideStack or showStack.
     * @method hidableStacks
     * @memberof dc.stackMixin
     * @instance
     * @param {Boolean} [hidableStacks=false]
     * @return {Boolean}
     * @return {dc.stackMixin}
     */
    _chart.hidableStacks = function (hidableStacks) {
        if (!arguments.length) {
            return _hidableStacks;
        }
        _hidableStacks = hidableStacks;
        return _chart;
    };

    function findLayerByName (n) {
        var i = _stack.map(dc.pluck('name')).indexOf(n);
        return _stack[i];
    }

    /**
     * Hide all stacks on the chart with the given name.
     * The chart must be re-rendered for this change to appear.
     * @method hideStack
     * @memberof dc.stackMixin
     * @instance
     * @param {String} stackName
     * @return {dc.stackMixin}
     */
    _chart.hideStack = function (stackName) {
        var layer = findLayerByName(stackName);
        if (layer) {
            layer.hidden = true;
        }
        return _chart;
    };

    /**
     * Show all stacks on the chart with the given name.
     * The chart must be re-rendered for this change to appear.
     * @method showStack
     * @memberof dc.stackMixin
     * @instance
     * @param {String} stackName
     * @return {dc.stackMixin}
     */
    _chart.showStack = function (stackName) {
        var layer = findLayerByName(stackName);
        if (layer) {
            layer.hidden = false;
        }
        return _chart;
    };

    _chart.getValueAccessorByIndex = function (index) {
        return _stack[index].accessor || _chart.valueAccessor();
    };

    _chart.yAxisMin = function () {
        var min = d3.min(flattenStack(), function (p) {
            return (p.y < 0) ? (p.y + p.y0) : p.y0;
        });

        return dc.utils.subtract(min, _chart.yAxisPadding());

    };

    _chart.yAxisMax = function () {
        var max = d3.max(flattenStack(), function (p) {
            return (p.y > 0) ? (p.y + p.y0) : p.y0;
        });

        return dc.utils.add(max, _chart.yAxisPadding());
    };

    function flattenStack () {
        var valueses = _chart.data().map(function (layer) { return layer.values; });
        return Array.prototype.concat.apply([], valueses);
    }

    _chart.xAxisMin = function () {
        var min = d3.min(flattenStack(), dc.pluck('x'));
        return dc.utils.subtract(min, _chart.xAxisPadding());
    };

    _chart.xAxisMax = function () {
        var max = d3.max(flattenStack(), dc.pluck('x'));
        return dc.utils.add(max, _chart.xAxisPadding());
    };

    /**
     * Set or get the title function. Chart class will use this function to render svg title (usually interpreted by
     * browser as tooltips) for each child element in the chart, i.e. a slice in a pie chart or a bubble in a bubble chart.
     * Almost every chart supports title function however in grid coordinate chart you need to turn off brush in order to
     * use title otherwise the brush layer will block tooltip trigger.
     *
     * If the first argument is a stack name, the title function will get or set the title for that stack. If stackName
     * is not provided, the first stack is implied.
     * @method title
     * @memberof dc.stackMixin
     * @instance
     * @example
     * // set a title function on 'first stack'
     * chart.title('first stack', function(d) { return d.key + ': ' + d.value; });
     * // get a title function from 'second stack'
     * var secondTitleFunction = chart.title('second stack');
     * @param {String} [stackName]
     * @param {Function} [titleAccessor]
     * @return {String}
     * @return {dc.stackMixin}
     */
    dc.override(_chart, 'title', function (stackName, titleAccessor) {
        if (!stackName) {
            return _chart._title();
        }

        if (typeof stackName === 'function') {
            return _chart._title(stackName);
        }
        if (stackName === _chart._groupName && typeof titleAccessor === 'function') {
            return _chart._title(titleAccessor);
        }

        if (typeof titleAccessor !== 'function') {
            return _titles[stackName] || _chart._title();
        }

        _titles[stackName] = titleAccessor;

        return _chart;
    });

    /**
     * Gets or sets the stack layout algorithm, which computes a baseline for each stack and
     * propagates it to the next
     * @method stackLayout
     * @memberof dc.stackMixin
     * @instance
     * @see {@link http://github.com/mbostock/d3/wiki/Stack-Layout d3.layout.stack}
     * @param {Function} [stack=d3.layout.stack]
     * @return {Function}
     * @return {dc.stackMixin}
     */
    _chart.stackLayout = function (stack) {
        if (!arguments.length) {
            return _stackLayout;
        }
        _stackLayout = stack;
        if (_stackLayout.values() === d3.layout.stack().values()) {
            _stackLayout.values(prepareValues);
        }
        return _chart;
    };

    function visability (l) {
        return !l.hidden;
    }

    _chart.data(function () {
        var layers = _stack.filter(visability);
        return layers.length ? _chart.stackLayout()(layers) : [];
    });

    _chart._ordinalXDomain = function () {
        var flat = flattenStack().map(dc.pluck('data'));
        var ordered = _chart._computeOrderedGroups(flat);
        return ordered.map(_chart.keyAccessor());
    };

    _chart.colorAccessor(function (d) {
        var layer = this.layer || this.name || d.name || d.layer;
        return layer;
    });

    _chart.legendables = function () {
        return _stack.map(function (layer, i) {
            return {
                chart: _chart,
                name: layer.name,
                hidden: layer.hidden || false,
                color: _chart.getColor.call(layer, layer.values, i)
            };
        });
    };

    _chart.isLegendableHidden = function (d) {
        var layer = findLayerByName(d.name);
        return layer ? layer.hidden : false;
    };

    _chart.legendToggle = function (d) {
        if (_hidableStacks) {
            if (_chart.isLegendableHidden(d)) {
                _chart.showStack(d.name);
            } else {
                _chart.hideStack(d.name);
            }
            //_chart.redraw();
            _chart.renderGroup();
        }
    };

    return _chart;
};

/**
 * Cap is a mixin that groups small data elements below a _cap_ into an *others* grouping for both the
 * Row and Pie Charts.
 *
 * The top ordered elements in the group up to the cap amount will be kept in the chart, and the rest
 * will be replaced with an *others* element, with value equal to the sum of the replaced values. The
 * keys of the elements below the cap limit are recorded in order to filter by those keys when the
 * others* element is clicked.
 * @name capMixin
 * @memberof dc
 * @mixin
 * @param {Object} _chart
 * @return {dc.capMixin}
 */
dc.capMixin = function (_chart) {

    var _cap = Infinity;

    var _othersLabel = 'Others';

    var _othersGrouper = function (topRows) {
        var topRowsSum = d3.sum(topRows, _chart.valueAccessor()),
            allRows = _chart.group().all(),
            allRowsSum = d3.sum(allRows, _chart.valueAccessor()),
            topKeys = topRows.map(_chart.keyAccessor()),
            allKeys = allRows.map(_chart.keyAccessor()),
            topSet = d3.set(topKeys),
            others = allKeys.filter(function (d) {return !topSet.has(d);});
        if (allRowsSum > topRowsSum) {
            return topRows.concat([{'others': others, 'key': _othersLabel, 'value': allRowsSum - topRowsSum}]);
        }
        return topRows;
    };

    _chart.cappedKeyAccessor = function (d, i) {
        if (d.others) {
            return d.key;
        }
        return _chart.keyAccessor()(d, i);
    };

    _chart.cappedValueAccessor = function (d, i) {
        if (d.others) {
            return d.value;
        }
        return _chart.valueAccessor()(d, i);
    };

    _chart.data(function (group) {
        if (_cap === Infinity) {
            return _chart._computeOrderedGroups(group.all());
        } else {
            var topRows = group.top(_cap); // ordered by crossfilter group order (default value)
            topRows = _chart._computeOrderedGroups(topRows); // re-order using ordering (default key)
            if (_othersGrouper) {
                return _othersGrouper(topRows);
            }
            return topRows;
        }
    });

    /**
     * Get or set the count of elements to that will be included in the cap.
     * @method cap
     * @memberof dc.capMixin
     * @instance
     * @param {Number} [count=Infinity]
     * @return {Number}
     * @return {dc.capMixin}
     */
    _chart.cap = function (count) {
        if (!arguments.length) {
            return _cap;
        }
        _cap = count;
        return _chart;
    };

    /**
     * Get or set the label for *Others* slice when slices cap is specified
     * @method othersLabel
     * @memberof dc.capMixin
     * @instance
     * @param {String} [label="Others"]
     * @return {String}
     * @return {dc.capMixin}
     */
    _chart.othersLabel = function (label) {
        if (!arguments.length) {
            return _othersLabel;
        }
        _othersLabel = label;
        return _chart;
    };

    /**
     * Get or set the grouper function that will perform the insertion of data for the *Others* slice
     * if the slices cap is specified. If set to a falsy value, no others will be added. By default the
     * grouper function computes the sum of all values below the cap.
     * @method othersGrouper
     * @memberof dc.capMixin
     * @instance
     * @example
     * // Default others grouper
     * chart.othersGrouper(function (topRows) {
     *    var topRowsSum = d3.sum(topRows, _chart.valueAccessor()),
     *        allRows = _chart.group().all(),
     *        allRowsSum = d3.sum(allRows, _chart.valueAccessor()),
     *        topKeys = topRows.map(_chart.keyAccessor()),
     *        allKeys = allRows.map(_chart.keyAccessor()),
     *        topSet = d3.set(topKeys),
     *        others = allKeys.filter(function (d) {return !topSet.has(d);});
     *    if (allRowsSum > topRowsSum) {
     *        return topRows.concat([{'others': others, 'key': _othersLabel, 'value': allRowsSum - topRowsSum}]);
     *    }
     *    return topRows;
     * });
     * // Custom others grouper
     * chart.othersGrouper(function (data) {
     *     // compute the value for others, presumably the sum of all values below the cap
     *     var othersSum  = yourComputeOthersValueLogic(data)
     *
     *     // the keys are needed to properly filter when the others element is clicked
     *     var othersKeys = yourComputeOthersKeysArrayLogic(data);
     *
     *     // add the others row to the dataset
     *     data.push({'key': 'Others', 'value': othersSum, 'others': othersKeys });
     *
     *     return data;
     * });
     * @param {Function} [grouperFunction]
     * @return {Function}
     * @return {dc.capMixin}
     */
    _chart.othersGrouper = function (grouperFunction) {
        if (!arguments.length) {
            return _othersGrouper;
        }
        _othersGrouper = grouperFunction;
        return _chart;
    };

    dc.override(_chart, 'onClick', function (d) {
        if (d.others) {
            _chart.filter([d.others]);
        }
        _chart._onClick(d);
    });

    return _chart;
};

/**
 * This Mixin provides reusable functionalities for any chart that needs to visualize data using bubbles.
 * @name bubbleMixin
 * @memberof dc
 * @mixin
 * @mixes dc.colorMixin
 * @param {Object} _chart
 * @return {dc.bubbleMixin}
 */
dc.bubbleMixin = function (_chart) {
    var _maxBubbleRelativeSize = 0.3;
    var _minRadiusWithLabel = 10;

    _chart.BUBBLE_NODE_CLASS = 'node';
    _chart.BUBBLE_CLASS = 'bubble';
    _chart.MIN_RADIUS = 10;

    _chart = dc.colorMixin(_chart);

    _chart.renderLabel(true);

    _chart.data(function (group) {
        return group.top(Infinity);
    });

    var _r = d3.scale.linear().domain([0, 100]);

    var _rValueAccessor = function (d) {
        return d.r;
    };

    /**
     * Get or set the bubble radius scale. By default the bubble chart uses
     * {@link https://github.com/mbostock/d3/wiki/Quantitative-Scales#linear d3.scale.linear().domain([0, 100])}
     * as its radius scale.
     * @method r
     * @memberof dc.bubbleMixin
     * @instance
     * @see {@link http://github.com/mbostock/d3/wiki/Scales d3.scale}
     * @param {d3.scale} [bubbleRadiusScale=d3.scale.linear().domain([0, 100])]
     * @return {d3.scale}
     * @return {dc.bubbleMixin}
     */
    _chart.r = function (bubbleRadiusScale) {
        if (!arguments.length) {
            return _r;
        }
        _r = bubbleRadiusScale;
        return _chart;
    };

    /**
     * Get or set the radius value accessor function. If set, the radius value accessor function will
     * be used to retrieve a data value for each bubble. The data retrieved then will be mapped using
     * the r scale to the actual bubble radius. This allows you to encode a data dimension using bubble
     * size.
     * @method radiusValueAccessor
     * @memberof dc.bubbleMixin
     * @instance
     * @param {Function} [radiusValueAccessor]
     * @return {Function}
     * @return {dc.bubbleMixin}
     */
    _chart.radiusValueAccessor = function (radiusValueAccessor) {
        if (!arguments.length) {
            return _rValueAccessor;
        }
        _rValueAccessor = radiusValueAccessor;
        return _chart;
    };

    _chart.rMin = function () {
        var min = d3.min(_chart.data(), function (e) {
            return _chart.radiusValueAccessor()(e);
        });
        return min;
    };

    _chart.rMax = function () {
        var max = d3.max(_chart.data(), function (e) {
            return _chart.radiusValueAccessor()(e);
        });
        return max;
    };

    _chart.bubbleR = function (d) {
        var value = _chart.radiusValueAccessor()(d);
        var r = _chart.r()(value);
        if (isNaN(r) || value <= 0) {
            r = 0;
        }
        return r;
    };

    var labelFunction = function (d) {
        return _chart.label()(d);
    };

    var shouldLabel = function (d) {
        return (_chart.bubbleR(d) > _minRadiusWithLabel);
    };

    var labelOpacity = function (d) {
        return shouldLabel(d) ? 1 : 0;
    };

    var labelPointerEvent = function (d) {
        return shouldLabel(d) ? 'all' : 'none';
    };

    _chart._doRenderLabel = function (bubbleGEnter) {
        if (_chart.renderLabel()) {
            var label = bubbleGEnter.select('text');

            if (label.empty()) {
                label = bubbleGEnter.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '.3em')
                    .on('click', _chart.onClick);
            }

            label
                .attr('opacity', 0)
                .attr('pointer-events', labelPointerEvent)
                .text(labelFunction);
            dc.transition(label, _chart.transitionDuration())
                .attr('opacity', labelOpacity);
        }
    };

    _chart.doUpdateLabels = function (bubbleGEnter) {
        if (_chart.renderLabel()) {
            var labels = bubbleGEnter.selectAll('text')
                .attr('pointer-events', labelPointerEvent)
                .text(labelFunction);
            dc.transition(labels, _chart.transitionDuration())
                .attr('opacity', labelOpacity);
        }
    };

    var titleFunction = function (d) {
        return _chart.title()(d);
    };

    _chart._doRenderTitles = function (g) {
        if (_chart.renderTitle()) {
            var title = g.select('title');

            if (title.empty()) {
                g.append('title').text(titleFunction);
            }
        }
    };

    _chart.doUpdateTitles = function (g) {
        if (_chart.renderTitle()) {
            g.selectAll('title').text(titleFunction);
        }
    };

    /**
     * Get or set the minimum radius. This will be used to initialize the radius scale's range.
     * @method minRadius
     * @memberof dc.bubbleMixin
     * @instance
     * @param {Number} [radius=10]
     * @return {Number}
     * @return {dc.bubbleMixin}
     */
    _chart.minRadius = function (radius) {
        if (!arguments.length) {
            return _chart.MIN_RADIUS;
        }
        _chart.MIN_RADIUS = radius;
        return _chart;
    };

    /**
     * Get or set the minimum radius for label rendering. If a bubble's radius is less than this value
     * then no label will be rendered.
     * @method minRadiusWithLabel
     * @memberof dc.bubbleMixin
     * @instance
     * @param {Number} [radius=10]
     * @return {Number}
     * @return {dc.bubbleMixin}
     */

    _chart.minRadiusWithLabel = function (radius) {
        if (!arguments.length) {
            return _minRadiusWithLabel;
        }
        _minRadiusWithLabel = radius;
        return _chart;
    };

    /**
     * Get or set the maximum relative size of a bubble to the length of x axis. This value is useful
     * when the difference in radius between bubbles is too great.
     * @method maxBubbleRelativeSize
     * @memberof dc.bubbleMixin
     * @instance
     * @param {Number} [relativeSize=0.3]
     * @return {Number}
     * @return {dc.bubbleMixin}
     */
    _chart.maxBubbleRelativeSize = function (relativeSize) {
        if (!arguments.length) {
            return _maxBubbleRelativeSize;
        }
        _maxBubbleRelativeSize = relativeSize;
        return _chart;
    };

    _chart.fadeDeselectedArea = function () {
        if (_chart.hasFilter()) {
            _chart.selectAll('g.' + _chart.BUBBLE_NODE_CLASS).each(function (d) {
                if (_chart.isSelectedNode(d)) {
                    _chart.highlightSelected(this);
                } else {
                    _chart.fadeDeselected(this);
                }
            });
        } else {
            _chart.selectAll('g.' + _chart.BUBBLE_NODE_CLASS).each(function () {
                _chart.resetHighlight(this);
            });
        }
    };

    _chart.isSelectedNode = function (d) {
        return _chart.hasFilter(d.key);
    };

    _chart.onClick = function (d) {
        var filter = d.key;
        dc.events.trigger(function () {
            _chart.filter(filter);
            _chart.redrawGroup();
        });
    };

    return _chart;
};

/**
 * The pie chart implementation is usually used to visualize a small categorical distribution.  The pie
 * chart uses keyAccessor to determine the slices, and valueAccessor to calculate the size of each
 * slice relative to the sum of all values. Slices are ordered by {@link dc.baseMixin#ordering ordering}
 * which defaults to sorting by key.
 *
 * Examples:
 * - {@link http://dc-js.github.com/dc.js/ Nasdaq 100 Index}
 * @class pieChart
 * @memberof dc
 * @mixes dc.capMixin
 * @mixes dc.colorMixin
 * @mixes dc.baseMixin
 * @example
 * // create a pie chart under #chart-container1 element using the default global chart group
 * var chart1 = dc.pieChart('#chart-container1');
 * // create a pie chart under #chart-container2 element using chart group A
 * var chart2 = dc.pieChart('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.pieChart}
 */
dc.pieChart = function (parent, chartGroup) {
    var DEFAULT_MIN_ANGLE_FOR_LABEL = 0.5;

    var _sliceCssClass = 'pie-slice';
    var _labelCssClass = 'pie-label';
    var _sliceGroupCssClass = 'pie-slice-group';
    var _labelGroupCssClass = 'pie-label-group';
    var _emptyCssClass = 'empty-chart';
    var _emptyTitle = 'empty';

    var _radius,
        _givenRadius, // specified radius, if any
        _innerRadius = 0,
        _externalRadiusPadding = 0;

    var _g;
    var _cx;
    var _cy;
    var _minAngleForLabel = DEFAULT_MIN_ANGLE_FOR_LABEL;
    var _externalLabelRadius;
    var _drawPaths = false;
    var _chart = dc.capMixin(dc.colorMixin(dc.baseMixin({})));

    _chart.colorAccessor(_chart.cappedKeyAccessor);

    _chart.title(function (d) {
        return _chart.cappedKeyAccessor(d) + ': ' + _chart.cappedValueAccessor(d);
    });

    /**
     * Get or set the maximum number of slices the pie chart will generate. The top slices are determined by
     * value from high to low. Other slices exeeding the cap will be rolled up into one single *Others* slice.
     * @method slicesCap
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [cap]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.slicesCap = _chart.cap;

    _chart.label(_chart.cappedKeyAccessor);
    _chart.renderLabel(true);

    _chart.transitionDuration(350);

    _chart._doRender = function () {
        _chart.resetSvg();

        _g = _chart.svg()
            .append('g')
            .attr('transform', 'translate(' + _chart.cx() + ',' + _chart.cy() + ')');

        _g.append('g').attr('class', _sliceGroupCssClass);
        _g.append('g').attr('class', _labelGroupCssClass);

        drawChart();

        return _chart;
    };

    function drawChart () {
        // set radius on basis of chart dimension if missing
        _radius = _givenRadius ? _givenRadius : d3.min([_chart.width(), _chart.height()]) / 2;

        var arc = buildArcs();

        var pie = pieLayout();
        var pieData;
        // if we have data...
        if (d3.sum(_chart.data(), _chart.valueAccessor())) {
            pieData = pie(_chart.data());
            _g.classed(_emptyCssClass, false);
        } else {
            // otherwise we'd be getting NaNs, so override
            // note: abuse others for its ignoring the value accessor
            pieData = pie([{key: _emptyTitle, value: 1, others: [_emptyTitle]}]);
            _g.classed(_emptyCssClass, true);
        }

        if (_g) {
            var slices = _g.select('g.' + _sliceGroupCssClass)
                .selectAll('g.' + _sliceCssClass)
                .data(pieData);

            var labels = _g.select('g.' + _labelGroupCssClass)
                .selectAll('text.' + _labelCssClass)
                .data(pieData);

            createElements(slices, labels, arc, pieData);

            updateElements(pieData, arc);

            removeElements(slices, labels);

            highlightFilter();

            dc.transition(_g, _chart.transitionDuration())
                .attr('transform', 'translate(' + _chart.cx() + ',' + _chart.cy() + ')');
        }
    }

    function createElements (slices, labels, arc, pieData) {
        var slicesEnter = createSliceNodes(slices);

        createSlicePath(slicesEnter, arc);

        createTitles(slicesEnter);

        createLabels(labels, pieData, arc);
    }

    function createSliceNodes (slices) {
        var slicesEnter = slices
            .enter()
            .append('g')
            .attr('class', function (d, i) {
                return _sliceCssClass + ' _' + i;
            });
        return slicesEnter;
    }

    function createSlicePath (slicesEnter, arc) {
        var slicePath = slicesEnter.append('path')
            .attr('fill', fill)
            .on('click', onClick)
            .attr('d', function (d, i) {
                return safeArc(d, i, arc);
            });

        dc.transition(slicePath, _chart.transitionDuration(), function (s) {
            s.attrTween('d', tweenPie);
        });
    }

    function createTitles (slicesEnter) {
        if (_chart.renderTitle()) {
            slicesEnter.append('title').text(function (d) {
                return _chart.title()(d.data);
            });
        }
    }

    _chart._applyLabelText = function (labels) {
        labels
            .text(function (d) {
                var data = d.data;
                if ((sliceHasNoData(data) || sliceTooSmall(d)) && !isSelectedSlice(d)) {
                    return '';
                }
                return _chart.label()(d.data);
            });
    };

    function positionLabels (labels, arc) {
        _chart._applyLabelText(labels);
        dc.transition(labels, _chart.transitionDuration())
            .attr('transform', function (d) {
                return labelPosition(d, arc);
            })
            .attr('text-anchor', 'middle');
    }

    function highlightSlice (i, whether) {
        _chart.select('g.pie-slice._' + i)
            .classed('highlight', whether);
    }

    function createLabels (labels, pieData, arc) {
        if (_chart.renderLabel()) {
            var labelsEnter = labels
                .enter()
                .append('text')
                .attr('class', function (d, i) {
                    var classes = _sliceCssClass + ' ' + _labelCssClass + ' _' + i;
                    if (_externalLabelRadius) {
                        classes += ' external';
                    }
                    return classes;
                })
                .on('click', onClick)
                .on('mouseover', function (d, i) {
                    highlightSlice(i, true);
                })
                .on('mouseout', function (d, i) {
                    highlightSlice(i, false);
                });
            positionLabels(labelsEnter, arc);
            if (_externalLabelRadius && _drawPaths) {
                updateLabelPaths(pieData, arc);
            }
        }
    }

    function updateLabelPaths (pieData, arc) {
        var polyline = _g.selectAll('polyline.' + _sliceCssClass)
                .data(pieData);

        polyline
                .enter()
                .append('polyline')
                .attr('class', function (d, i) {
                    return 'pie-path _' + i + ' ' + _sliceCssClass;
                })
                .on('click', onClick)
                .on('mouseover', function (d, i) {
                    highlightSlice(i, true);
                })
                .on('mouseout', function (d, i) {
                    highlightSlice(i, false);
                });

        polyline.exit().remove();
        var arc2 = d3.svg.arc()
                .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .innerRadius(_radius - _externalRadiusPadding);
        var transition = dc.transition(polyline, _chart.transitionDuration());
        // this is one rare case where d3.selection differs from d3.transition
        if (transition.attrTween) {
            transition
                .attrTween('points', function (d) {
                    this._current = this._current || d;
                    var interpolate = d3.interpolate(this._current, d);
                    this._current = interpolate(0);
                    return function (t) {
                        var d2 = interpolate(t);
                        return [arc.centroid(d2), arc2.centroid(d2)];
                    };
                });
        } else {
            transition.attr('points', function (d) {
                return [arc.centroid(d), arc2.centroid(d)];
            });
        }
        transition.style('visibility', function (d) {
            return d.endAngle - d.startAngle < 0.0001 ? 'hidden' : 'visible';
        });

    }

    function updateElements (pieData, arc) {
        updateSlicePaths(pieData, arc);
        updateLabels(pieData, arc);
        updateTitles(pieData);
    }

    function updateSlicePaths (pieData, arc) {
        var slicePaths = _g.selectAll('g.' + _sliceCssClass)
            .data(pieData)
            .select('path')
            .attr('d', function (d, i) {
                return safeArc(d, i, arc);
            });
        dc.transition(slicePaths, _chart.transitionDuration(),
            function (s) {
                s.attrTween('d', tweenPie);
            }).attr('fill', fill);
    }

    function updateLabels (pieData, arc) {
        if (_chart.renderLabel()) {
            var labels = _g.selectAll('text.' + _labelCssClass)
                .data(pieData);
            positionLabels(labels, arc);
            if (_externalLabelRadius && _drawPaths) {
                updateLabelPaths(pieData, arc);
            }
        }
    }

    function updateTitles (pieData) {
        if (_chart.renderTitle()) {
            _g.selectAll('g.' + _sliceCssClass)
                .data(pieData)
                .select('title')
                .text(function (d) {
                    return _chart.title()(d.data);
                });
        }
    }

    function removeElements (slices, labels) {
        slices.exit().remove();
        labels.exit().remove();
    }

    function highlightFilter () {
        if (_chart.hasFilter()) {
            _chart.selectAll('g.' + _sliceCssClass).each(function (d) {
                if (isSelectedSlice(d)) {
                    _chart.highlightSelected(this);
                } else {
                    _chart.fadeDeselected(this);
                }
            });
        } else {
            _chart.selectAll('g.' + _sliceCssClass).each(function () {
                _chart.resetHighlight(this);
            });
        }
    }

    /**
     * Get or set the external radius padding of the pie chart. This will force the radius of the
     * pie chart to become smaller or larger depending on the value.
     * @method externalRadiusPadding
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [externalRadiusPadding=0]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.externalRadiusPadding = function (externalRadiusPadding) {
        if (!arguments.length) {
            return _externalRadiusPadding;
        }
        _externalRadiusPadding = externalRadiusPadding;
        return _chart;
    };

    /**
     * Get or set the inner radius of the pie chart. If the inner radius is greater than 0px then the
     * pie chart will be rendered as a doughnut chart.
     * @method innerRadius
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [innerRadius=0]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.innerRadius = function (innerRadius) {
        if (!arguments.length) {
            return _innerRadius;
        }
        _innerRadius = innerRadius;
        return _chart;
    };

    /**
     * Get or set the outer radius. If the radius is not set, it will be half of the minimum of the
     * chart width and height.
     * @method radius
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [radius]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.radius = function (radius) {
        if (!arguments.length) {
            return _givenRadius;
        }
        _givenRadius = radius;
        return _chart;
    };

    /**
     * Get or set center x coordinate position. Default is center of svg.
     * @method cx
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [cx]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.cx = function (cx) {
        if (!arguments.length) {
            return (_cx ||  _chart.width() / 2);
        }
        _cx = cx;
        return _chart;
    };

    /**
     * Get or set center y coordinate position. Default is center of svg.
     * @method cy
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [cy]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.cy = function (cy) {
        if (!arguments.length) {
            return (_cy ||  _chart.height() / 2);
        }
        _cy = cy;
        return _chart;
    };

    function buildArcs () {
        return d3.svg.arc()
            .outerRadius(_radius - _externalRadiusPadding)
            .innerRadius(_innerRadius);
    }

    function isSelectedSlice (d) {
        return _chart.hasFilter(_chart.cappedKeyAccessor(d.data));
    }

    _chart._doRedraw = function () {
        drawChart();
        return _chart;
    };

    /**
     * Get or set the minimal slice angle for label rendering. Any slice with a smaller angle will not
     * display a slice label.
     * @method minAngleForLabel
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [minAngleForLabel=0.5]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.minAngleForLabel = function (minAngleForLabel) {
        if (!arguments.length) {
            return _minAngleForLabel;
        }
        _minAngleForLabel = minAngleForLabel;
        return _chart;
    };

    function pieLayout () {
        return d3.layout.pie().sort(null).value(_chart.cappedValueAccessor);
    }

    function sliceTooSmall (d) {
        var angle = (d.endAngle - d.startAngle);
        return isNaN(angle) || angle < _minAngleForLabel;
    }

    function sliceHasNoData (d) {
        return _chart.cappedValueAccessor(d) === 0;
    }

    function tweenPie (b) {
        b.innerRadius = _innerRadius;
        var current = this._current;
        if (isOffCanvas(current)) {
            current = {startAngle: 0, endAngle: 0};
        } else {
            // only interpolate startAngle & endAngle, not the whole data object
            current = {startAngle: current.startAngle, endAngle: current.endAngle};
        }
        var i = d3.interpolate(current, b);
        this._current = i(0);
        return function (t) {
            return safeArc(i(t), 0, buildArcs());
        };
    }

    function isOffCanvas (current) {
        return !current || isNaN(current.startAngle) || isNaN(current.endAngle);
    }

    function fill (d, i) {
        return _chart.getColor(d.data, i);
    }

    function onClick (d, i) {
        if (_g.attr('class') !== _emptyCssClass) {
            _chart.onClick(d.data, i);
        }
    }

    function safeArc (d, i, arc) {
        var path = arc(d, i);
        if (path.indexOf('NaN') >= 0) {
            path = 'M0,0';
        }
        return path;
    }

    /**
     * Title to use for the only slice when there is no data.
     * @method emptyTitle
     * @memberof dc.pieChart
     * @instance
     * @param {String} [title]
     * @return {String}
     * @return {dc.pieChart}
     */
    _chart.emptyTitle = function (title) {
        if (arguments.length === 0) {
            return _emptyTitle;
        }
        _emptyTitle = title;
        return _chart;
    };

    /**
     * Position slice labels offset from the outer edge of the chart
     *
     * The given argument sets the radial offset.
     * @method externalLabels
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [externalLabelRadius]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.externalLabels = function (externalLabelRadius) {
        if (arguments.length === 0) {
            return _externalLabelRadius;
        } else if (externalLabelRadius) {
            _externalLabelRadius = externalLabelRadius;
        } else {
            _externalLabelRadius = undefined;
        }

        return _chart;
    };

    /**
     * Get or set whether to draw lines from pie slices to their labels.
     *
     * @method drawPaths
     * @memberof dc.pieChart
     * @instance
     * @param {Boolean} [drawPaths]
     * @return {Boolean}
     * @return {dc.pieChart}
     */
    _chart.drawPaths = function (drawPaths) {
        if (arguments.length === 0) {
            return _drawPaths;
        }
        _drawPaths = drawPaths;
        return _chart;
    };

    function labelPosition (d, arc) {
        var centroid;
        if (_externalLabelRadius) {
            centroid = d3.svg.arc()
                .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .innerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .centroid(d);
        } else {
            centroid = arc.centroid(d);
        }
        if (isNaN(centroid[0]) || isNaN(centroid[1])) {
            return 'translate(0,0)';
        } else {
            return 'translate(' + centroid + ')';
        }
    }

    _chart.legendables = function () {
        return _chart.data().map(function (d, i) {
            var legendable = {name: d.key, data: d.value, others: d.others, chart: _chart};
            legendable.color = _chart.getColor(d, i);
            return legendable;
        });
    };

    _chart.legendHighlight = function (d) {
        highlightSliceFromLegendable(d, true);
    };

    _chart.legendReset = function (d) {
        highlightSliceFromLegendable(d, false);
    };

    _chart.legendToggle = function (d) {
        _chart.onClick({key: d.name, others: d.others});
    };

    function highlightSliceFromLegendable (legendable, highlighted) {
        _chart.selectAll('g.pie-slice').each(function (d) {
            if (legendable.name === d.data.key) {
                d3.select(this).classed('highlight', highlighted);
            }
        });
    }

    return _chart.anchor(parent, chartGroup);
};

/**
 * Concrete bar chart/histogram implementation.
 *
 * Examples:
 * - {@link http://dc-js.github.com/dc.js/ Nasdaq 100 Index}
 * - {@link http://dc-js.github.com/dc.js/crime/index.html Canadian City Crime Stats}
 * @class barChart
 * @memberof dc
 * @mixes dc.stackMixin
 * @mixes dc.coordinateGridMixin
 * @example
 * // create a bar chart under #chart-container1 element using the default global chart group
 * var chart1 = dc.barChart('#chart-container1');
 * // create a bar chart under #chart-container2 element using chart group A
 * var chart2 = dc.barChart('#chart-container2', 'chartGroupA');
 * // create a sub-chart under a composite parent chart
 * var chart3 = dc.barChart(compositeChart);
 * @param {String|node|d3.selection|dc.compositeChart} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector}
 * specifying a dom block element such as a div; or a dom element or d3 selection.  If the bar
 * chart is a sub-chart in a {@link dc.compositeChart Composite Chart} then pass in the parent
 * composite chart instance instead.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.barChart}
 */
dc.barChart = function (parent, chartGroup) {
    var MIN_BAR_WIDTH = 1;
    var DEFAULT_GAP_BETWEEN_BARS = 2;
    var LABEL_PADDING = 3;

    var _chart = dc.stackMixin(dc.coordinateGridMixin({}));

    var _gap = DEFAULT_GAP_BETWEEN_BARS;
    var _centerBar = false;
    var _alwaysUseRoundi