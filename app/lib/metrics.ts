import { metrics} from '@opentelemetry/api';

const meter = metrics.getMeter('my-app');

export const avatarServeCounter = meter.createCounter('avatar_serve', {
  description: 'Counts the number of avatar serves',
});


