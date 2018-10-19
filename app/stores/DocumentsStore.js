// @flow
import { observable, action, computed, ObservableMap, runInAction } from 'mobx';
import { client } from 'utils/ApiClient';
import { map, find, orderBy, filter, uniq } from 'lodash';
import invariant from 'invariant';

import BaseStore from 'stores/BaseStore';
import Document from 'models/Document';
import UiStore from 'stores/UiStore';
import type { PaginationParams, SearchResult } from 'types';

export const DEFAULT_PAGINATION_LIMIT = 25;

type Options = {
  ui: UiStore,
};

type FetchOptions = {
  prefetch?: boolean,
  shareId?: string,
};

class DocumentsStore extends BaseStore {
  @observable recentlyViewedIds: string[] = [];
  @observable recentlyEditedIds: string[] = [];
  @observable data: Map<string, Document> = new ObservableMap([]);
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;

  ui: UiStore;

  @computed
  get recentlyViewed(): Document[] {
    const docs = [];
    this.recentlyViewedIds.forEach(id => {
      const doc = this.getById(id);
      if (doc) docs.push(doc);
    });
    return docs;
  }

  @computed
  get recentlyEdited(): Document[] {
    const docs = [];
    this.recentlyEditedIds.forEach(id => {
      const doc = this.getById(id);
      if (doc) docs.push(doc);
    });
    return docs;
  }

  createdByUser(userId: string): Document[] {
    return orderBy(
      filter(this.data.values(), document => document.createdBy.id === userId),
      'updatedAt',
      'desc'
    );
  }

  pinnedInCollection(collectionId: string): Document[] {
    return filter(
      this.recentlyEditedInCollection(collectionId),
      document => document.pinned
    );
  }

  recentlyEditedInCollection(collectionId: string): Document[] {
    return orderBy(
      filter(
        this.data.values(),
        document =>
          document.collectionId === collectionId && !!document.publishedAt
      ),
      'updatedAt',
      'desc'
    );
  }

  @computed
  get starred(): Document[] {
    return filter(this.data.values(), 'starred');
  }

  @computed
  get drafts(): Document[] {
    return filter(
      orderBy(this.data.values(), 'updatedAt', 'desc'),
      doc => !doc.publishedAt
    );
  }

  @computed
  get active(): ?Document {
    return this.ui.activeDocumentId
      ? this.getById(this.ui.activeDocumentId)
      : undefined;
  }

  /* Actions */

  @action
  fetchPage = async (
    request: string = 'list',
    options: ?PaginationParams
  ): Promise<?(Document[])> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/documents.${request}`, options);
      invariant(res && res.data, 'Document list not available');
      const { data } = res;
      runInAction('DocumentsStore#fetchPage', () => {
        data.forEach(document => {
          this.data.set(document.id, new Document(document));
        });
        this.isLoaded = true;
      });
      return data;
    } catch (e) {
      this.ui.showToast('Failed to load documents');
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetchRecentlyEdited = async (options: ?PaginationParams): Promise<*> => {
    const data = await this.fetchPage('list', options);

    runInAction('DocumentsStore#fetchRecentlyEdited', () => {
      // $FlowFixMe
      this.recentlyEditedIds.replace(
        uniq(this.recentlyEditedIds.concat(map(data, 'id')))
      );
    });
    return data;
  };

  @action
  fetchRecentlyViewed = async (options: ?PaginationParams): Promise<*> => {
    const data = await this.fetchPage('viewed', options);

    runInAction('DocumentsStore#fetchRecentlyViewed', () => {
      // $FlowFixMe
      this.recentlyViewedIds.replace(
        uniq(this.recentlyViewedIds.concat(map(data, 'id')))
      );
    });
    return data;
  };

  @action
  fetchStarred = (options: ?PaginationParams): Promise<*> => {
    return this.fetchPage('starred', options);
  };

  @action
  fetchDrafts = (options: ?PaginationParams): Promise<*> => {
    return this.fetchPage('drafts', options);
  };

  @action
  fetchPinned = (options: ?PaginationParams): Promise<*> => {
    return this.fetchPage('pinned', options);
  };

  @action
  fetchOwned = (options: ?PaginationParams): Promise<*> => {
    return this.fetchPage('list', options);
  };

  @action
  search = async (
    query: string,
    options: ?PaginationParams
  ): Promise<SearchResult[]> => {
    const res = await client.get('/documents.search', {
      ...options,
      query,
    });
    invariant(res && res.data, 'Search API response should be available');
    const { data } = res;
    data.forEach(result => this.add(new Document(result.document)));
    return data;
  };

  @action
  prefetchDocument = async (id: string) => {
    if (!this.getById(id)) {
      this.fetch(id, { prefetch: true });
    }
  };

  @action
  fetch = async (id: string, options?: FetchOptions = {}): Promise<*> => {
    if (!options.prefetch) this.isFetching = true;

    try {
      const doc = this.getById(id) || this.getByUrl(id);
      if (doc) return doc;

      const res = await client.post('/documents.info', {
        id,
        shareId: options.shareId,
      });
      invariant(res && res.data, 'Document not available');
      const { data } = res;
      const document = new Document(data);

      runInAction('DocumentsStore#fetch', () => {
        this.data.set(data.id, document);
        this.isLoaded = true;
      });

      return document;
    } catch (_err) {
      if (!options.prefetch && navigator.onLine) {
        this.ui.showToast('Failed to load document');
      }
    } finally {
      this.isFetching = false;
    }
  };

  @action
  duplicate = async (document: Document): * => {
    const res = await client.post('/documents.create', {
      publish: true,
      parentDocument: document.parentDocumentId,
      collection: document.collection.id,
      title: `${document.title} (duplicate)`,
      text: document.text,
    });

    if (res && res.data) {
      const duped = res.data;
      this.emit('documents.create', new Document(duped));
      this.emit('documents.publish', {
        id: duped.id,
        collectionId: duped.collection.id,
      });
      return duped;
    }
  };

  @action
  add = (document: Document): void => {
    this.data.set(document.id, document);
  };

  @action
  remove = (id: string): void => {
    this.data.delete(id);
  };

  getById = (id: string): ?Document => {
    return this.data.get(id);
  };

  /**
   * Match documents by the url ID as the title slug can change
   */
  getByUrl = (url: string): ?Document => {
    return find(this.data.values(), doc => url.endsWith(doc.urlId));
  };

  constructor(options: Options) {
    super();

    this.ui = options.ui;

    this.on('documents.delete', (data: { id: string }) => {
      this.remove(data.id);
    });
    this.on('documents.create', (data: Document) => {
      this.add(data);
    });

    // Re-fetch dashboard content so that we don't show deleted documents
    this.on('collections.delete', () => {
      this.fetchRecentlyEdited();
      this.fetchRecentlyViewed();
    });
    this.on('documents.delete', () => {
      this.fetchRecentlyEdited();
      this.fetchRecentlyViewed();
    });
  }
}

export default DocumentsStore;
