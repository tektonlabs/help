// @flow
import { observable, action, computed, autorun, runInAction } from 'mobx';
import invariant from 'invariant';
import Cookie from 'js-cookie';
import { client } from 'utils/ApiClient';
import { stripSubdomain } from 'shared/utils/domains';
import type { User, Team } from 'types';

const AUTH_STORE = 'AUTH_STORE';

class AuthStore {
  @observable user: ?User;
  @observable team: ?Team;
  @observable token: ?string;
  @observable isSaving: boolean = false;
  @observable isLoading: boolean = false;
  @observable isSuspended: boolean = false;
  @observable suspendedContactEmail: ?string;

  /* Computed */

  @computed
  get authenticated(): boolean {
    return !!this.token;
  }

  @computed
  get asJson(): string {
    return JSON.stringify({
      user: this.user,
      team: this.team,
    });
  }

  @action
  fetch = async () => {
    try {
      const res = await client.post('/auth.info');
      invariant(res && res.data, 'Auth not available');

      runInAction('AuthStore#fetch', () => {
        this.user = res.data.user;
        this.team = res.data.team;
      });
    } catch (err) {
      if (err.error.error === 'user_suspended') {
        this.isSuspended = true;
        this.suspendedContactEmail = err.error.data.adminEmail;
      }
    }
  };

  @action
  deleteUser = async () => {
    await client.post(`/user.delete`, { confirmation: true });

    runInAction('AuthStore#updateUser', () => {
      this.user = null;
      this.team = null;
      this.token = null;
    });
  };

  @action
  updateUser = async (params: { name?: string, avatarUrl: ?string }) => {
    this.isSaving = true;

    try {
      const res = await client.post(`/user.update`, params);
      invariant(res && res.data, 'User response not available');

      runInAction('AuthStore#updateUser', () => {
        this.user = res.data;
      });
    } finally {
      this.isSaving = false;
    }
  };

  @action
  updateTeam = async (params: {
    name?: string,
    avatarUrl?: ?string,
    sharing?: boolean,
  }) => {
    this.isSaving = true;

    try {
      const res = await client.post(`/team.update`, params);
      invariant(res && res.data, 'Team response not available');

      runInAction('AuthStore#updateTeam', () => {
        this.team = res.data;
      });
    } finally {
      this.isSaving = false;
    }
  };

  @action
  logout = async () => {
    this.user = null;
    this.token = null;

    // remove authentication token itself
    Cookie.remove('accessToken', { path: '/' });

    // remove session record on apex cookie
    const team = this.team;
    if (team) {
      const sessions = Cookie.getJSON('sessions') || {};
      delete sessions[team.id];

      Cookie.set('sessions', sessions, {
        domain: stripSubdomain(window.location.hostname),
      });
      this.team = null;
    }

    // add a timestamp to force reload from server
    window.location.href = `${BASE_URL}?done=${new Date().getTime()}`;
  };

  constructor() {
    // Rehydrate
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(AUTH_STORE) || '{}');
    } catch (_) {
      // no-op Safari private mode
    }
    this.user = data.user;
    this.team = data.team;
    this.token = Cookie.get('accessToken');

    if (this.token) setImmediate(() => this.fetch());

    autorun(() => {
      try {
        localStorage.setItem(AUTH_STORE, this.asJson);
      } catch (_) {
        // no-op Safari private mode
      }
    });
  }
}

export default AuthStore;
