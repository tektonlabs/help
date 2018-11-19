// @flow
import Queue from 'bull';
import services from './services';
import { Collection, Document } from './models';

type DocumentEvent = {
  name: 'documents.create' | 'documents.update' | 'documents.publish',
  model: Document,
};

type CollectionEvent = {
  name: 'collections.create' | 'collections.update',
  model: Collection,
};

export type Event = DocumentEvent | CollectionEvent;

const globalEventsQueue = new Queue('global events', process.env.REDIS_URL);
const serviceEventsQueue = new Queue('service events', process.env.REDIS_URL);

// this queue processes global events and hands them off to service hooks
globalEventsQueue.process(async job => {
  const names = Object.keys(services);
  names.forEach(name => {
    const service = services[name];
    if (service.on) {
      serviceEventsQueue.add(
        { service: name, ...job.data },
        { removeOnComplete: true }
      );
    }
  });
});

// this queue processes an individual event for a specific service
serviceEventsQueue.process(async job => {
  const event = job.data;
  const service = services[event.service];

  if (service.on) {
    service.on(event);
  }
});

export default globalEventsQueue;
