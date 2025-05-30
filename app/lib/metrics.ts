'use strict';

const { DiagConsoleLogger, DiagLogLevel, diag } = require('@opentelemetry/api');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
// const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
// const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
// const { ConsoleMetricExporter } = require('@opentelemetry/sdk-metrics');
const {
  MeterProvider,
  PeriodicExportingMetricReader,
  View,
  AggregationType,
} = require('@opentelemetry/sdk-metrics');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

// Optional and only needed to see the internal diagnostic logging (during development)
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const metricExporter = new OTLPMetricExporter({

});

// Create an instance of the metric provider
const meterProvider = new MeterProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'my-app',
  }),
  // Define view for the exponential histogram metric
  views: [{
      aggregation: { type: AggregationType.EXPONENTIAL_HISTOGRAM },
      // Note, the instrumentName is the same as the name that has been passed for
      // the Meter#createHistogram function for exponentialHistogram.
      instrumentName: 'test_exponential_histogram',
  }],
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      // exporter: new ConsoleMetricExporter(),
      exportIntervalMillis: 5000,
    }),
  ],
});

const meter = meterProvider.getMeter('my-app');

export const requestCounter = meter.createCounter('requests', {
  description: 'Example of a Counter',
});

export const avatarRequestCounter = meter.createCounter('avatar_requests', {
    description: 'Avatar Request of a Counter',
});

// based on user_id and time. do we also interested into avatar id? 
export const avatarServeTimeCounter = meter.createCounter('avatar_serve_time', {
  description: 'Avatar Serve Time of a Counter',
});

export const upDownCounter = meter.createUpDownCounter('test_up_down_counter', {
  description: 'Example of a UpDownCounter',
});

export const histogram = meter.createHistogram('test_histogram', {
  description: 'Example of a Histogram',
});

export const exponentialHistogram = meter.createHistogram('test_exponential_histogram', {
  description: 'Example of an ExponentialHistogram',
});

export const attributes = { pid: process.pid, environment: 'production' };
