import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import {
  peopleOutline,
  personAddOutline,
  mailOutline,
  searchOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  trashOutline,
  closeOutline,
  refreshOutline
} from 'ionicons/icons';
import { toast } from 'react-toastify';

import {
  handleGetFriendsApi,
  handleSendFriendRequestApi,
  handleAcceptFriendApi,
  handleRemoveFriendApi,
  handleSearchUsersApi
} from '../../services/socialServices';
import { setSocial, appendSocial, mergeSocialFriends } from '../../store/actions';
import RankFrame from '../../components/RankFrame';
import { DEFAULT_AVATAR_URL, resolveAvatarUrl } from '../../utils/avatarUrl';
import './SocialApp.scss';

const getFriendUserId = (friend) => friend?.SK || friend?.userId || friend?.friendId;

const getUserId = (user) => user?.userId || user?.PK || user?.SK || user?.objectID;

const getDisplayName = (user) => (
  user?.name ||
  user?.information?.name ||
  user?.friendName ||
  'Unknown'
);

const getStudyStats = (user) => user?.studyStats || {};

const getEquippedFrameId = (source) => {
  const frame = source?.equippedFrame || source?.friendEquippedFrame || source?.equippedCosmetics?.equippedFrame;
  if (!frame) return 'frame_none';
  if (typeof frame === 'string') return frame;
  return frame.SK || frame.id || 'frame_none';
};

const getFrameTier = (source) => getEquippedFrameId(source).replace('frame_', '') || 'none';

const normalizeSearchUser = (user = {}) => {
  const stats = getStudyStats(user);
  const userId = getUserId(user);

  return {
    ...user,
    userId,
    name: getDisplayName(user),
    avatarUrl: user.avatarUrl || user.information?.avatarUrl || '',
    rankScore: user.rankScore ?? stats.rankScore ?? 0,
    streak: user.streak ?? stats.streak ?? 0,
    equippedFrame: getEquippedFrameId(user),
  };
};

class SocialApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'friends',
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      isLoading: false,
      isActionLoading: null,
      apiNotConfigured: false,
      lastSearchTime: 0,
      searchHasRun: false,
      visibleSearchCount: 5,
      refreshCooldownRemaining: 0,
    };
    this.searchTimeout = null;
    this.refreshCooldownTimer = null;
    this.listRef = React.createRef();
  }

  componentDidMount() {
    this.initialSync();
  }

  componentWillUnmount() {
    if (this.refreshCooldownTimer) clearInterval(this.refreshCooldownTimer);
  }

  handleManualRefresh = async () => {
    if (this.state.isLoading || this.state.refreshCooldownRemaining > 0) return;

    this.setState({ refreshCooldownRemaining: 5 });
    await this.fetchFriends(true);
    this.refreshCooldownTimer = setInterval(() => {
      this.setState((prev) => {
        const remaining = Math.max(0, prev.refreshCooldownRemaining - 1);
        if (remaining === 0 && this.refreshCooldownTimer) {
          clearInterval(this.refreshCooldownTimer);
          this.refreshCooldownTimer = null;
        }
        return { refreshCooldownRemaining: remaining };
      });
    }, 1000);
  };

  renderRefreshButton = () => (
    <button
      type="button"
      className={`manual-refresh-btn ${this.state.isLoading ? 'refreshing' : ''}`}
      onClick={this.handleManualRefresh}
      disabled={this.state.isLoading || this.state.refreshCooldownRemaining > 0}
      title={this.props.t('social.reload')}
      aria-label={this.props.t('social.reload')}
    >
      <IonIcon icon={refreshOutline} />
      <span>
        {this.props.t('social.reload')}
        {this.state.refreshCooldownRemaining > 0 ? ` (${this.state.refreshCooldownRemaining}s)` : ''}
      </span>
    </button>
  );

  initialSync = async () => {
    const { friends } = this.props;
    if (friends.length === 0) {
      this.fetchFriends(true);
    }
  };

  fetchFriends = async (isFirstPage = false) => {
    if (this.state.isLoading) return;

    const { friendLastEvaluatedKey, setSocial, appendSocial } = this.props;
    const lastKey = isFirstPage ? null : friendLastEvaluatedKey;

    if (!isFirstPage && !lastKey) return;

    this.setState({ isLoading: true });
    const res = await handleGetFriendsApi(lastKey);

    if (res && !res.errCode) {
      this.setState({ apiNotConfigured: false });
      if (isFirstPage) {
        setSocial({ items: res.friends, lastKey: res.lastEvaluatedKey });
      } else {
        appendSocial({ items: res.friends, lastKey: res.lastEvaluatedKey });
      }
    } else if (res?.errMessage === 'API_NOT_CONFIGURED') {
      this.setState({ apiNotConfigured: true });
    } else {
      toast.error(this.props.t('social.load_failed'));
    }
    this.setState({ isLoading: false });
  };

  handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (this.props.friendLastEvaluatedKey && !this.state.isLoading) {
        this.fetchFriends(false);
      }
    }
  };

  onSearchChange = (e) => {
    const val = e.target.value;
    this.setState({
      searchQuery: val,
      searchResults: [],
      isSearching: false,
      searchHasRun: false,
      visibleSearchCount: 5,
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const { searchQuery } = this.state;
      if (searchQuery.trim().length >= 2) {
        this.performSearch(searchQuery.trim());
      } else {
        this.setState({ searchResults: [], isSearching: false, searchHasRun: false, visibleSearchCount: 5 });
      }
    }
  };

  performSearch = async (query) => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      this.setState({ searchResults: [], isSearching: false, searchHasRun: false, visibleSearchCount: 5 });
      return;
    }
    const now = Date.now();
    const cooldown = 10000;

    if (now - this.state.lastSearchTime < cooldown) {
      const remaining = Math.ceil((cooldown - (now - this.state.lastSearchTime)) / 1000);
      toast.warn(this.props.t('social.search_cooldown', { count: remaining }));
      return;
    }

    this.setState({ isSearching: true, apiNotConfigured: false, lastSearchTime: now });
    const res = await handleSearchUsersApi(normalizedQuery);

    if (res && res.users) {
      const users = res.users.map(normalizeSearchUser).filter((user) => Boolean(user.userId));
      this.mergeFriendInfoFromUsers(users);
      const currentUserId = this.props.userProfile?.PK || this.props.userProfile?.userId || this.props.userProfile?.UserId;
      const filtered = users.filter(u =>
        u.userId !== currentUserId &&
        !this.props.friends.some(f => getFriendUserId(f) === u.userId)
      );
      this.setState({ searchResults: filtered, searchHasRun: true, visibleSearchCount: 5 });
    } else if (res?.errMessage === 'API_NOT_CONFIGURED') {
      this.setState({ apiNotConfigured: true });
    } else {
      const msg = res?.errMessage || '';
      if (msg.includes('500')) {
        toast.error(this.props.t('social.server_error_500'));
      } else if (msg) {
        toast.error(this.props.t('social.connection_failed'));
      } else {
        toast.error(this.props.t('social.search_failed'));
      }
    }

    this.setState({ isSearching: false });
  };

  mergeFriendInfoFromUsers = (users = []) => {
    const loadedFriendIds = new Set(this.props.friends.map(getFriendUserId).filter(Boolean));
    const updates = users
      .filter((user) => loadedFriendIds.has(user.userId))
      .map((user) => ({
        SK: user.userId,
        friendName: user.name,
        friendAvatarUrl: user.avatarUrl,
        level: user.level,
        rankScore: user.rankScore,
        streak: user.streak,
        friendEquippedFrame: user.equippedFrame,
      }));

    if (updates.length) {
      this.props.mergeSocialFriends({ items: updates });
    }
  };

  handleAvatarError = (event) => {
    if (event.currentTarget.src !== DEFAULT_AVATAR_URL) {
      event.currentTarget.src = DEFAULT_AVATAR_URL;
    }
  };

  renderAvatar = (avatarUrl, alt = 'avatar') => (
    <img src={resolveAvatarUrl(avatarUrl)} alt={alt} onError={this.handleAvatarError} />
  );

  renderFramedAvatar = (source, avatarUrl, alt = 'avatar', size = 64) => {
    const tier = getFrameTier(source);
    const frameId = getEquippedFrameId(source);
    if (tier === 'none') {
      return this.renderAvatar(avatarUrl, alt);
    }

    return (
      <RankFrame tier={tier} size={size} className="social-rank-frame">
        {this.renderAvatar(avatarUrl, alt)}
      </RankFrame>
    );
  };

  handleSocialAction = async (type, targetUserId) => {
    this.setState({ isActionLoading: targetUserId });
    let res;

    switch (type) {
      case 'request':
        res = await handleSendFriendRequestApi(targetUserId);
        break;
      case 'accept':
        res = await handleAcceptFriendApi(targetUserId);
        break;
      case 'remove':
        res = await handleRemoveFriendApi(targetUserId);
        break;
      default:
        break;
    }

    if (res && !res.errCode) {
      this.setState({ apiNotConfigured: false });

      if (type === 'request') {
        this.setState({ searchResults: this.state.searchResults.filter(u => u.userId !== targetUserId) });
      }
    } else if (res?.errMessage === 'API_NOT_CONFIGURED') {
      this.setState({ apiNotConfigured: true });
    }

    // Tự động đồng bộ lại danh sách bạn bè sau khi thực hiện action thành công
    // (hoặc nếu action thất bại do state lệch, cũng nên sync lại)
    this.setState({ isActionLoading: null });
  };

  renderFriendsTab = (friends) => (
    <div className="social-tab-content friends-list">
      <div className="tab-header">
        <h3>{this.props.t('social.friends_list')}</h3>
      </div>
      <div className="list-container" onScroll={this.handleScroll}>
        {friends.length > 0 ? friends.map(friend => (
          <div key={friend.SK} className="friend-card">
            <div className="avatar-container">
              <div className="avatar-placeholder">
                {this.renderFramedAvatar(friend, friend.friendAvatarUrl, friend.friendName || 'avatar', 64)}
              </div>
            </div>
            <div className="friend-info">
              <div className="name-row">
                <span className="friend-name">{friend.friendName || 'Unknown'}</span>
                {friend.level && <span className="friend-rank">Lv.{friend.level}</span>}
              </div>
            </div>
            <div className="friend-actions">
              <button
                className="action-btn delete"
                title={this.props.t('social.remove_friend')}
                onClick={() => this.handleSocialAction('remove', friend.SK)}
                disabled={this.state.isActionLoading === friend.SK}
              >
                <IonIcon icon={trashOutline} />
              </button>
            </div>
          </div>
        )) : (
          <div className="empty-state">
            <IonIcon icon={peopleOutline} />
            <p>{this.props.t('social.no_friends')}</p>
          </div>
        )}
        {this.state.isLoading && <div className="loading-more">...</div>}
      </div>
    </div>
  );

  renderRequestsTab = (requestsIn, requestsOut) => {
    const { t } = this.props;
    return (
      <div className="social-tab-content requests-list">
        <div className="tab-header mb-2">
          <h3>{t('social.friend_requests')}</h3>
          {this.renderRefreshButton()}
        </div>
        <div className="tab-section-header">{t('social.requests')} ({requestsIn.length})</div>
        <div className="list-container">
          {requestsIn.length > 0 ? requestsIn.map(req => (
            <div key={req.SK} className="request-card">
              <div className="request-avatar">
                {this.renderAvatar(req.friendAvatarUrl, req.friendName || 'avatar')}
              </div>
              <div className="request-info">
                <span className="request-name">{req.friendName}</span>
                <span className="request-level">{t('social.incoming_desc')}</span>
              </div>
              <div className="request-actions">
                <button
                  className="req-btn accept"
                  onClick={() => this.handleSocialAction('accept', req.SK)}
                  disabled={this.state.isActionLoading === req.SK}
                >
                  <IonIcon icon={checkmarkCircleOutline} />
                </button>
                <button
                  className="req-btn decline"
                  onClick={() => this.handleSocialAction('remove', req.SK)}
                  disabled={this.state.isActionLoading === req.SK}
                >
                  <IonIcon icon={closeCircleOutline} />
                </button>
              </div>
            </div>
          )) : (
            <div className="sub-empty-state">{t('social.no_requests')}</div>
          )}
        </div>

        <div className="tab-section-header mt-4">{t('social.sent_requests')} ({requestsOut.length})</div>
        <div className="list-container">
          {requestsOut.map(req => (
            <div key={req.SK} className="request-card outgoing">
              <div className="request-avatar">
                {this.renderAvatar(req.friendAvatarUrl, req.friendName || 'avatar')}
              </div>
              <div className="request-info">
                <span className="request-name">{req.friendName}</span>
                <span className="request-level">{t('social.waiting_desc')}</span>
              </div>
              <div className="request-actions">
                <button
                  className="req-btn cancel"
                  onClick={() => this.handleSocialAction('remove', req.SK)}
                  disabled={this.state.isActionLoading === req.SK}
                  title={t('social.cancel_request')}
                >
                  <IonIcon icon={trashOutline} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  renderAddFriendTab = () => {
    const { t } = this.props;
    const visibleResults = this.state.searchResults.slice(0, this.state.visibleSearchCount);
    const hasMoreResults = this.state.searchResults.length > this.state.visibleSearchCount;

    return (
      <div className="social-tab-content add-friend">
        <div className="search-bar">
          <IonIcon icon={searchOutline} />
          <input
            type="text"
            placeholder={t('social.search_by_username')}
            value={this.state.searchQuery}
            onChange={this.onSearchChange}
            onKeyDown={this.handleKeyDown}
          />
          {this.state.searchQuery && (
            <button className="clear-search-btn" onClick={() => this.onSearchChange({ target: { value: '' } })}>
              <IonIcon icon={closeOutline} />
            </button>
          )}
          <button className="search-btn-trigger" onClick={() => this.performSearch(this.state.searchQuery)}>
            <IonIcon icon={searchOutline} />
          </button>
        </div>

        <div className="search-results">
          {this.state.isSearching && (
            <div className="search-spinner" aria-hidden="true" />
          )}
          {this.state.searchResults.length > 0 ? (
            <>
              {visibleResults.map(user => (
                <div key={user.userId} className="search-result-card">
                  <div className="user-avatar">
                    {this.renderFramedAvatar(user, user.avatarUrl, user.name || 'avatar', 58)}
                  </div>
                  <div className="user-details">
                    <span className="user-name">{user.name}</span>
                    <span className="user-meta">{t('common.streak')}: {user.streak || 0}</span>
                  </div>
                  <button
                    className="add-btn"
                    onClick={() => this.handleSocialAction('request', user.userId)}
                    disabled={this.state.isActionLoading === user.userId}
                  >
                    <IonIcon icon={personAddOutline} />
                    <span>{t('social.add_friend')}</span>
                  </button>
                </div>
              ))}
              {hasMoreResults && (
                <button
                  type="button"
                  className="show-more-btn"
                  onClick={() => this.setState((prev) => ({ visibleSearchCount: prev.visibleSearchCount + 5 }))}
                >
                  {t('common.show_more')}
                </button>
              )}
            </>
          ) : (
            this.state.searchHasRun && this.state.searchQuery.trim().length >= 2 && !this.state.isSearching && (
              <div className="empty-search">
                {t('social.no_username_found', { query: this.state.searchQuery })}
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  render() {
    const { activeTab } = this.state;
    const { friends, t } = this.props;

    const accepted = friends.filter(f => f.status === 'ACCEPTED');
    const pendingIn = friends.filter(f => f.status === 'PENDING_IN');
    const pendingOut = friends.filter(f => f.status === 'PENDING_OUT');

    return (
      <div className="social-app-container">
        <div className="social-sidebar">
          <button
            className={`sidebar-item ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => this.setState({ activeTab: 'friends' })}
          >
            <IonIcon icon={peopleOutline} />
            <span>{t('social.friends')}</span>
            <span className="badge">{accepted.length}</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => this.setState({ activeTab: 'requests' })}
          >
            <IonIcon icon={mailOutline} />
            <span>{t('social.requests')}</span>
            {(pendingIn.length > 0) && <span className="badge-new">{pendingIn.length}</span>}
          </button>
          <button
            className={`sidebar-item ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => this.setState({ activeTab: 'add' })}
          >
            <IonIcon icon={personAddOutline} />
            <span>{t('social.find_friends')}</span>
          </button>
        </div>

        <div className="social-main">
          {this.state.apiNotConfigured ? (
            <div className="empty-state api-error">
              <IonIcon icon={closeCircleOutline} />
              <p>{t('social.api_not_configured')}</p>
            </div>
          ) : (
            <>
              {activeTab === 'friends' && this.renderFriendsTab(accepted)}
              {activeTab === 'requests' && this.renderRequestsTab(pendingIn, pendingOut)}
              {activeTab === 'add' && this.renderAddFriendTab()}
            </>
          )}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  friends: state.social.items || [],
  friendLastEvaluatedKey: state.social.lastKey,
  userProfile: state.profile.userProfile,
});

const mapDispatchToProps = (dispatch) => ({
  setSocial: (data) => dispatch(setSocial(data)),
  appendSocial: (data) => dispatch(appendSocial(data)),
  mergeSocialFriends: (data) => dispatch(mergeSocialFriends(data)),
});

export default withTranslation()(connect(mapStateToProps, mapDispatchToProps)(SocialApp));
