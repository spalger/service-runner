'use strict';
var cluster = require('cluster');
var Bluebird = require('bluebird');
var RateLimiter = require('limitation');

/**
 * Cluster master RateLimiter wrapper
 */
function RateLimiterMaster(options) {}

RateLimiterMaster.prototype._sendBlocksToWorkers = function(blocks) {
};


/**
 * Initialize the internal limiter.
 * @return {Promise<RateLimiter>}
 */
RateLimiterMaster.prototype.setup = function() {
    return Bluebird.resolve();
};

RateLimiterMaster.prototype.updateCounters = function() {
};

/**
 * Cluster worker side RateLimiter
 *
 * Performs local checks, and communicates with the actual rate limiter in the
 * master process.
 */
function RateLimiterWorker(options) {
}

/**
 * Send current counters to the master process.
 */
RateLimiterWorker.prototype._sendToMaster = function() {
};

RateLimiterWorker.prototype._updateBlocks = function(blocks) {
};


/**
 * Synchronous limit check
 *
 * @param {string} key
 * @param {number} limit
 * @param {number} increment, default 1
 * @return {boolean}: `true` if the request rate is below the limit, `false`
 * if the limit is exceeded.
 */
RateLimiterWorker.prototype.isAboveLimit = function(key, limit, increment) {
    return false
};

module.exports = {
    master: RateLimiterMaster,
    worker: RateLimiterWorker,
    nocluster: RateLimiter,
};
