// @flow
import type { Event } from '../events';
import { Document, Collection } from '../models';
import { socketio } from '../';

export default class Websockets {
  async on(event: Event) {
    if (process.env.WEBSOCKETS_ENABLED !== 'true' || !socketio) return;

    switch (event.name) {
      case 'documents.publish':
      case 'documents.restore':
      case 'documents.archive':
      case 'documents.unarchive': {
        const document = await Document.findByPk(event.documentId, {
          paranoid: false,
        });

        return socketio
          .to(`collection-${document.collectionId}`)
          .emit('entities', {
            event: event.name,
            documentIds: [
              {
                id: document.id,
                updatedAt: document.updatedAt,
              },
            ],
            collectionIds: [
              {
                id: document.collectionId,
              },
            ],
          });
      }
      case 'documents.delete': {
        const document = await Document.findByPk(event.documentId, {
          paranoid: false,
        });

        if (!document.publishedAt) {
          return socketio.to(`user-${document.createdById}`).emit('entities', {
            event: event.name,
            documentIds: [
              {
                id: document.id,
                updatedAt: document.updatedAt,
              },
            ],
          });
        }

        return socketio
          .to(`collection-${document.collectionId}`)
          .emit('entities', {
            event: event.name,
            documentIds: [
              {
                id: document.id,
                updatedAt: document.updatedAt,
              },
            ],
            collectionIds: [
              {
                id: document.collectionId,
              },
            ],
          });
      }
      case 'documents.pin':
      case 'documents.unpin':
      case 'documents.update': {
        const document = await Document.findByPk(event.documentId, {
          paranoid: false,
        });

        return socketio
          .to(`collection-${document.collectionId}`)
          .emit('entities', {
            event: event.name,
            documentIds: [
              {
                id: document.id,
                updatedAt: document.updatedAt,
              },
            ],
          });
      }
      case 'documents.create': {
        const document = await Document.findByPk(event.documentId);

        return socketio.to(`user-${event.actorId}`).emit('entities', {
          event: event.name,
          documentIds: [
            {
              id: document.id,
              updatedAt: document.updatedAt,
            },
          ],
          collectionIds: [
            {
              id: document.collectionId,
            },
          ],
        });
      }
      case 'documents.star':
      case 'documents.unstar': {
        return socketio.to(`user-${event.actorId}`).emit(event.name, {
          documentId: event.documentId,
        });
      }
      case 'documents.move': {
        const documents = await Document.findAll({
          where: {
            id: event.data.documentIds,
          },
          paranoid: false,
        });
        documents.forEach(document => {
          socketio.to(`collection-${document.collectionId}`).emit('entities', {
            event: event.name,
            documentIds: [
              {
                id: document.id,
                updatedAt: document.updatedAt,
              },
            ],
          });
        });
        event.data.collectionIds.forEach(collectionId => {
          socketio.to(`collection-${collectionId}`).emit('entities', {
            event: event.name,
            collectionIds: [{ id: collectionId }],
          });
        });
        return;
      }
      case 'collections.create': {
        const collection = await Collection.findByPk(event.collectionId, {
          paranoid: false,
        });

        socketio
          .to(
            collection.private
              ? `collection-${collection.id}`
              : `team-${collection.teamId}`
          )
          .emit('entities', {
            event: event.name,
            collectionIds: [
              {
                id: collection.id,
                updatedAt: collection.updatedAt,
              },
            ],
          });
        return socketio
          .to(
            collection.private
              ? `collection-${collection.id}`
              : `team-${collection.teamId}`
          )
          .emit('join', {
            event: event.name,
            collectionId: collection.id,
          });
      }
      case 'collections.update':
      case 'collections.delete': {
        const collection = await Collection.findByPk(event.collectionId, {
          paranoid: false,
        });

        return socketio.to(`team-${collection.teamId}`).emit('entities', {
          event: event.name,
          collectionIds: [
            {
              id: collection.id,
              updatedAt: collection.updatedAt,
            },
          ],
        });
      }
      case 'collections.add_user': {
        // the user being added isn't yet in the websocket channel for the collection
        // so they need to be notified separately
        socketio.to(`user-${event.userId}`).emit(event.name, {
          event: event.name,
          userId: event.userId,
          collectionId: event.collectionId,
        });

        // let everyone with access to the collection know a user was added
        socketio.to(`collection-${event.collectionId}`).emit(event.name, {
          event: event.name,
          userId: event.userId,
          collectionId: event.collectionId,
        });

        // tell any user clients to connect to the websocket channel for the collection
        return socketio.to(`user-${event.userId}`).emit('join', {
          event: event.name,
          collectionId: event.collectionId,
        });
      }
      case 'collections.remove_user': {
        // let everyone with access to the collection know a user was removed
        socketio.to(`collection-${event.collectionId}`).emit(event.name, {
          event: event.name,
          userId: event.userId,
          collectionId: event.collectionId,
        });

        // tell any user clients to disconnect from the websocket channel for the collection
        return socketio.to(`user-${event.userId}`).emit('leave', {
          event: event.name,
          collectionId: event.collectionId,
        });
      }
      default:
    }
  }
}
