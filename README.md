# service-runner
Generic nodejs service runner & supervisor

## Features
- Supervise and [cluster](http://nodejs.org/api/cluster.html) node services in a generic manner with a minimal interface:

```javascript
module.exports = function (options) {
    var config = options.config;
    // Logger instance
    var logger = options.logger;
    // Metrics reporter (statsd,log)
    var metrics = options.metrics;

    // Start the app, returning a promise
    return startApp(config, logger, metrics);
}
```

- standard command line parameters:
```bash
Usage: service-runner.js [command] [options]

Commands:
  docker-start  starts the service in a Docker container
  docker-test   starts the test process in a Docker container
  build         builds the service's package and deploy repo

Options:
  -n, --num-workers  number of workers to start                    [default: -1]
  -c, --config       YAML-formatted configuration file
                                             [string] [default: "./config.yaml"]
  -f, --force        force the operation to execute   [boolean] [default: false]
  -d, --deploy-repo  build only the deploy repo       [boolean] [default: false]
  -r, --review       send the patch to Gerrit after building the repo
                                                      [boolean] [default: false]
  --verbose          be verbose                       [boolean] [default: false]
  -v, --version      print the service's version and exit
                                                      [boolean] [default: false]
  -h, --help         Show help                                         [boolean]
```
- [config loading](#config-loading)
- flexible logging using bunyan, including logstash support via gelf: `logger.log('info/request', { message: 'foo', uri: req.uri })`
- [metric reporting](#metric-reporting) using statsd or logging: `statsd.timing('foo.GET.2xx', Date.now() - startTime)`
- heap dumps

## Usage
```bash
npm install --save service-runner
```

In package.json, configure `npm start` to call service-runner:
```javascript
  "scripts": {
    "start": "service-runner"
  }
```
Create a `config.yaml` file following the spec below. Make sure to point the
module parameter to your service's entry point.

Finally, **start your service with `npm start`**. In npm >= 2.0 (node 0.12 or iojs), you can also pass parameters to `service-runner` like this: `npm start -- -c /etc/yourservice/config.yaml`.

For node 0.10 support, you can create a small wrapper script like this:
```javascript
var ServiceRunner = require('service-runner');
new ServiceRunner().run();
```

All file paths in the config are relative to the application base path. Base path
is an absolute path to the folder where your application is located (where `package.json` file is located).

By default, we assume that your project depends on `service-runner` and you follow standrad
node project layout. However, if custom layout is used, you could override the app base path with:
- `APP_BASE_PATH` environment variable
- `app_base_path` config stanza.

We are also working on a [standard
template](https://github.com/wikimedia/service-template-node) for node
services, which will set up this & other things for you.

### Config loading
- Default config locations in a project: `config.yaml` for a customized config,
    and `config.example.yaml` for the defaults.
- Default top-level config format (**draft**):

```yaml
# Number of worker processes to spawn.
# Set to 0 to run everything in a single process without clustering.
num_workers: 1

# Number of milliseconds to wait for a heartbeat from worker before killing
# and restarting it
worker_heartbeat_timeout: 7500

# Logger info
logging:
  level: info
  # Sets up sample logging for some 'interesting' events.
  # Map keys correspond to the full log level names. 
  # Map values specify the probability for such events to be logged
  # regardless of the configured logging level.
  log_components:
    'trace/webrequest': 0.2
  streams:
  # Use gelf-stream -> logstash
  - type: gelf
    host: logstash1003.eqiad.wmnet
    port: 12201

# Statsd metrics reporter
metrics:
  type: statsd
  host: localhost
  port: 8125
  batch: # Metrics batching options. Supported only for `statsd` reporter type
    max_size: 1500 # Max size of the batch buffer (default: 1500)
    max_delay: 1000  # Max delay for an individual metric in milliseconds (default: 1000)

services:
  - name: parsoid
    # a relative path or the name of an npm package, if different from name
    # module: ./lib/server.js

    # optionally, a version constraint of the npm package
    # version: ^0.4.0

    # per-service config
    conf:
        port: 12345
        interface: localhost
        # more per-service config settings
```

### Metric reporting

We basically expose the [node-statsd
interface](https://github.com/sivy/node-statsd):

```javascript
// Timing: sends a timing command with the specified milliseconds
options.metrics.timing('response_time', 42);

// Increment: Increments a stat by a value (default is 1)
options.metrics.increment('my_counter');

// Decrement: Decrements a stat by a value (default is -1)
options.metrics.decrement('my_counter');

// Histogram: send data for histogram stat
options.metrics.histogram('my_histogram', 42);

// Gauge: Gauge a stat by a specified amount
options.metrics.gauge('my_gauge', 123.45);

// Set: Counts unique occurrences of a stat (alias of unique)
options.metrics.set('my_unique', 'foobar');
options.metrics.unique('my_unique', 'foobarbaz');

// Incrementing multiple items
options.metrics.increment(['these', 'are', 'different', 'stats']);

// Sampling, this will sample 25% of the time
// the StatsD Daemon will compensate for sampling
options.metrics.increment('my_counter', 1, 0.25);

// Tags, this will add user-defined tags to the data
options.metrics.histogram('my_histogram', 42, ['foo', 'bar']);
```

All metrics are automatically prefixed by the config-provided service name /
graphite hierachy prefix to ensure a consistent graphite metric hierarchy.

# Worker status tracking
At any point of the execution the service can emit a `service_status` message
to update the worker status. Statuses are tracked and reported when the worker
dies or is killed on a timeout, which is useful for debugging failure reasons.

To emit a status update use the following code:
```javascript
process.emit('service_status', {
   type: 'request_processing_begin',
   uri: req.uri.toString(),
   some_other_property: 'some_value'
})
```

Note: The status message could be an arbitrary object, however it must not contain
cyclic references.

## Issue tracking
Please report issues in [the service-runner phabricator
project](https://phabricator.wikimedia.org/tag/service-runner/).

## See also
- https://github.com/Unitech/PM2 - A lot of features. Focus on interactive
    use with commandline tools. Weak on logging (only local log files). Does
    not support node 0.10's cluster module.
- https://github.com/strongloop/strong-agent - commercial license. Focus on
    profiling and monitoring, although a lot of the functionality is now
    available in other libraries.
- http://krakenjs.com/ - Focused more on MVC & templating rather than
    supervision & modules
- https://www.npmjs.com/package/forever-service - Hooks up [forever](https://github.com/foreverjs/forever) with various init systems; could be useful especially on less common platforms that don't have good init systems.
