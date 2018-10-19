// @flow
import { extendObservable, action, runInAction, computed } from 'mobx';
import invariant from 'invariant';

import { client } from 'utils/ApiClient';
import stores from 'stores';
import parseTitle from '../../shared/utils/parseTitle';
import unescape from '../../shared/utils/unescape';

import type { NavigationNode, Revision, User } from 'types';
import BaseModel from './BaseModel';
import Collection from './Collection';

type SaveOptions = { publish?: boolean, done?: boolean, autosave?: boolean };

class Document extends BaseModel {
  isSaving: boolean = false;
  ui: *;
  store: *;

  collaborators: User[];
  collection: $Shape<Collection>;
  collectionId: string;
  firstViewedAt: ?string;
  lastViewedAt: ?string;
  modifiedSinceViewed: ?boolean;
  createdAt: string;
  createdBy: User;
  updatedAt: string;
  updatedBy: User;
  html: string;
  id: string;
  team: string;
  emoji: string;
  starred: boolean = false;
  pinned: boolean = false;
  text: string = '';
  title: string = '';
  parentDocument: ?string;
  publishedAt: ?string;
  url: string;
  shareUrl: ?string;
  views: number;
  revision: number;

  /* Computed */

  @computed
  get modifiedSinceViewed(): boolean {
    return !!this.lastViewedAt && this.lastViewedAt < this.updatedAt;
  }

  @computed
  get pathToDocument(): NavigationNode[] {
    let path;
    const traveler = (nodes, previousPath) => {
      nodes.forEach(childNode => {
        const newPath = [...previousPath, childNode];
        if (childNode.id === this.id) {
          path = newPath;
          return;
        } else {
          return traveler(childNode.children, newPath);
        }
      });
    };

    if (this.collection && this.collection.documents) {
      traveler(this.collection.documents, []);
      if (path) return path;
    }

    return [];
  }

  @computed
  get isDraft(): boolean {
    return !this.publishedAt;
  }

  @computed
  get isEmpty(): boolean {
    // Check if the document title has been modified and user generated content exists
    return this.text.replace(new RegExp(`^#$`), '').trim().length === 0;
  }

  @computed
  get allowSave(): boolean {
    return !this.isEmpty && !this.isSaving;
  }

  @computed
  get parentDocumentId(): ?string {
    return this.pathToDocument.length > 1
      ? this.pathToDocument[this.pathToDocument.length - 2].id
      : null;
  }

  /* Actions */

  @action
  share = async () => {
    try {
      const res = await client.post('/shares.create', { documentId: this.id });
      invariant(res && res.data, 'Document API response should be available');

      this.shareUrl = res.data.url;
    } catch (e) {
      this.ui.showToast('Document failed to share');
    }
  };

  @action
  restore = async (revision: Revision) => {
    try {
      const res = await client.post('/documents.restore', {
        id: this.id,
        revisionId: revision.id,
      });
      runInAction('Document#save', () => {
        invariant(res && res.data, 'Data should be available');
        this.updateData(res.data);
      });
    } catch (e) {
      this.ui.showToast('Document failed to restore');
    }
  };

  @action
  pin = async () => {
    this.pinned = true;
    try {
      await client.post('/documents.pin', { id: this.id });
    } catch (e) {
      this.pinned = false;
      this.ui.showToast('Document failed to pin');
    }
  };

  @action
  unpin = async () => {
    this.pinned = false;
    try {
      await client.post('/documents.unpin', { id: this.id });
    } catch (e) {
      this.pinned = true;
      this.ui.showToast('Document failed to unpin');
    }
  };

  @action
  star = async () => {
    this.starred = true;
    try {
      await client.post('/documents.star', { id: this.id });
    } catch (e) {
      this.starred = false;
      this.ui.showToast('Document failed star');
    }
  };

  @action
  unstar = async () => {
    this.starred = false;
    try {
      await client.post('/documents.unstar', { id: this.id });
    } catch (e) {
      this.starred = false;
      this.ui.showToast('Document failed unstar');
    }
  };

  @action
  view = async () => {
    this.views++;
    await client.post('/views.create', { id: this.id });
  };

  @action
  fetch = async () => {
    try {
      const res = await client.post('/documents.info', { id: this.id });
      invariant(res && res.data, 'Document API response should be available');
      const { data } = res;
      runInAction('Document#update', () => {
        this.updateData(data);
      });
    } catch (e) {
      this.ui.showToast('Document failed loading');
    }
  };

  @action
  save = async (options: SaveOptions) => {
    if (this.isSaving) return this;

    const wasDraft = !this.publishedAt;
    const isCreating = !this.id;
    this.isSaving = true;

    try {
      let res;
      if (isCreating) {
        const data = {
          parentDocument: undefined,
          collection: this.collection.id,
          title: this.title,
          text: this.text,
          ...options,
        };
        if (this.parentDocument) {
          data.parentDocument = this.parentDocument;
        }
        res = await client.post('/documents.create', data);
      } else {
        res = await client.post('/documents.update', {
          id: this.id,
          title: this.title,
          text: this.text,
          lastRevision: this.revision,
          ...options,
        });
      }
      runInAction('Document#save', () => {
        invariant(res && res.data, 'Data should be available');
        this.updateData(res.data);

        if (isCreating) {
          this.emit('documents.create', this);
        }

        this.emit('documents.update', {
          document: this,
          collectionId: this.collection.id,
        });

        if (wasDraft && this.publishedAt) {
          this.emit('documents.publish', {
            id: this.id,
            collectionId: this.collection.id,
          });
        }
      });
    } catch (e) {
      this.ui.showToast('Document failed to save');
    } finally {
      this.isSaving = false;
    }

    return this;
  };

  @action
  move = async (parentDocumentId: ?string) => {
    try {
      const res = await client.post('/documents.move', {
        id: this.id,
        parentDocument: parentDocumentId,
      });
      invariant(res && res.data, 'Data not available');
      this.updateData(res.data);
      this.emit('documents.move', {
        id: this.id,
        collectionId: this.collection.id,
      });
    } catch (e) {
      this.ui.showToast('Error while moving the document');
    }
    return;
  };

  @action
  delete = async () => {
    try {
      await client.post('/documents.delete', { id: this.id });
      this.emit('documents.delete', {
        id: this.id,
        collectionId: this.collection.id,
      });
      return true;
    } catch (e) {
      this.ui.showToast('Error while deleting the document');
    }
    return false;
  };

  duplicate = () => {
    return this.store.duplicate(this);
  };

  download = async () => {
    await this.fetch();

    const blob = new Blob([unescape(this.text)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    // Firefox support requires the anchor tag be in the DOM to trigger the dl
    if (document.body) document.body.appendChild(a);
    a.href = url;
    a.download = `${this.title}.md`;
    a.click();
  };

  updateData(data: Object = {}) {
    if (data.text) {
      const { title, emoji } = parseTitle(data.text);
      data.title = title;
      data.emoji = emoji;
    }
    extendObservable(this, data);
  }

  constructor(data?: Object = {}) {
    super();

    this.updateData(data);
    this.ui = stores.ui;
    this.store = stores.documents;
  }
}

export default Document;
