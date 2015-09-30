'use strict';
var EventEmitter = require('events').EventEmitter,

    _ = require('lodash'),
    inherit = require('inherit'),
    WeakMap = require('es6-weak-map'),

    RunnerEvents = require('./constants/runner-events');

module.exports = inherit(EventEmitter, {

    __constructor: function() {
        this.awaiting = {};
        this.complete = new WeakMap();
    },

    processEvents: function(suite, browser) {
        if (suite.children.length === 0) {
            this._markComplete(suite, browser);
            this.emit(RunnerEvents.END_SUITE, {suite: suite, browserId: browser});
        } else {
            if (!this.awaiting[browser]) {
                this.awaiting[browser] = [];
            }
            this.awaiting[browser].push(suite);
        }

        this._processAwaitingSuits(browser);
    },

    _processAwaitingSuits: function(browser) {
        var suits = this.awaiting[browser],
            complete = [];

        if (!suits) {
            return;
        }

        suits.forEach(function(suite, i) {
            if (_.every(suite.children, completeInBrowser(browser), this)) {
                this._markComplete(suite, browser);
                complete.push(i);
                this.emit(RunnerEvents.END_SUITE, {
                    suite: suite,
                    browserId: browser
                });
            }
        }, this);

        complete.reduceRight(function(prev, index) {
            suits.splice(index, 1);
        }, 0);
    },

    _markComplete: function(suite, browser) {
        var browsers = (this.complete.get(suite) || {});
        browsers[browser] = true;
        this.complete.set(suite, browsers);
    }
});

function completeInBrowser(browser) {
    return function(suite) {
        return this.complete.has(suite) && this.complete.get(suite)[browser];
    };
}
