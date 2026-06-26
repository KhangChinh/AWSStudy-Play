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
  paperPlaneOutline,
  refreshOutline,
  closeOutline
} from 'ionicons/icons';
import { toast } from 'react-toastify';

import {
  handleGetFriendsApi,
  handleSendFriendRequestApi,
  handleAcceptFriendApi,
  handleRemoveFriendApi,
  handleSearchUsersApi
} from '../../services/socialServices';
import { setFriends, appendFriends, setFriendSyncTime } from '../../store/actions';
import './SocialApp.scss';

class SocialApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'friends',
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      isLoading: false,
      isActionLoading: null, // targetUserId
      apiNotConfigured: false, // true khi VITE_API_BASE_URL chưa được cấu hình
      lastSearchTime: 0, // Cooldown tìm kiếm
    };
    this.searchTimeout = null;
    this.listRef = React.createRef();
  }

  componentDidMount() {
    this.initialSync();
  }

  initialSync = async () => {
    const { friends, friendUpdatedAt } = this.props;
    // Flow: If redux has no data or sync time is missing, fetch first page
    if (friends.length === 0 || !friendUpdatedAt) {
      this.fetchFriends(true);
    }
  };

  fetchFriends = async (isFirstPage = false) => {
    if (this.state.isLoading) return;

    const { friendLastEvaluatedKey, setFriends, appendFriends } = this.props;
    const lastKey = isFirstPage ? null : friendLastEvaluatedKey;

    if (!isFirstPage && !lastKey) return;

    this.setState({ isLoading: true });
    const res = await handleGetFriendsApi(lastKey);

    if (res && !res.errCode) {
      this.setState({ apiNotConfigured: false });
      if (isFirstPage) {
        setFriends({ friends: res.friends, lastEvaluatedKey: res.lastEvaluatedKey });
        if (window.api) window.api.invoke('secureStore:setItem', { key: 'friends_cache', value: JSON.stringify(res.friends) });
      } else {
        appendFriends({ friends: res.friends, lastEvaluatedKey: res.lastEvaluatedKey });
        if (window.api) {
          const current = this.props.friends;
          window.api.invoke('secureStore:setItem', { key: 'friends_cache', value: JSON.stringify([...current, ...res.friends]) });
        }
      }

      if (res.updatedAt) {
        this.props.setFriendSyncTime(res.updatedAt);
        if (window.api) window.api.invoke('secureStore:setItem', { key: 'friend_sync_time', value: String(res.updatedAt) });
      }
    } else if (res?.errMessage === 'API_NOT_CONFIGURED') {
      // Chưa cấu hình API URL — hiện trạng thái tĩnh, không spam toast
      this.setState({ apiNotConfigured: true });
    } else {
      toast.error(this.props.t('social.load_failed') || 'Failed to load friends');
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
    this.setState({ searchQuery: val });
    if (val.trim() === '') {
      this.setState({ searchResults: [], isSearching: false });
    }
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const { searchQuery } = this.state;
      if (searchQuery.trim().length >= 2) {
        this.performSearch(searchQuery.trim());
      } else {
        this.setState({ searchResults: [], isSearching: false });
      }
    }
  };

  performSearch = async (query) => {
    const now = Date.now();
    const cooldown = 10000; // 10 giây

    if (now - this.state.lastSearchTime < cooldown) {
      const remaining = Math.ceil((cooldown - (now - this.state.lastSearchTime)) / 1000);
      toast.warn(this.props.t('social.search_cooldown', { count: remaining }) || `Please wait ${remaining}s before searching again.`);
      return;
    }

    this.setState({ isSearching: true, apiNotConfigured: false, lastSearchTime: now });
    const res = await handleSearchUsersApi(query);

    if (res && res.users) {
      const filtered = res.users.filter(u =>
        u.userId !== this.props.userInfo?.UserId &&
        !this.props.friends.some(f => f.SK === u.userId)
      );
      this.setState({ searchResults: filtered });
    } else if (res?.errMessage === 'API_NOT_CONFIGURED') {
      this.setState({ apiNotConfigured: true });
    } else {
      const msg = res?.errMessage || '';
      if (msg.includes('500')) {
        toast.error(this.props.t('social.server_error_500') || 'Server Error (500). Please check OpenSearch status or Lambda logs.');
      } else if (msg) {
        toast.error(msg);
      } else {
        toast.error(this.props.t('social.search_failed') || 'Search failed. Please try again.');
      }
    }

    this.setState({ isSearching: false });
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
      toast.success(res.message || 'Action successful');

      if (type === 'request') {
        this.setState({ searchResults: this.state.searchResults.filter(u => u.userId !== targetUserId) });
      }
    } else if (res?.errMessage === 'API_NOT_CONFIGURED') {
      this.setState({ apiNotConfigured: true });
    } else {
      const msg = res?.errMessage || '';
      const { t } = this.props;
      if (msg.includes('500')) {
        toast.error(t('social.server_error_500') || 'Server Error (500). Please check OpenSearch status or Lambda logs.');
      } else {
        toast.error(msg || t('social.action_failed') || 'Action failed');
      }
    }

    // Tự động đồng bộ lại danh sách bạn bè sau khi thực hiện action thành công
    // (hoặc nếu action thất bại do state lệch, cũng nên sync lại)
    if (type !== 'request') {
      this.fetchFriends(true);
    }
    this.setState({ isActionLoading: null });
  };

  renderFriendsTab = (friends) => (
    <div className="social-tab-content friends-list">
      <div className="tab-header">
        <h3>{this.props.t('social.friends_list') || 'Friend List'}</h3>
        <button className="reload-btn" onClick={() => this.fetchFriends(true)} disabled={this.state.isLoading}>
          <IonIcon icon={refreshOutline} className={this.state.isLoading ? 'spinning' : ''} />
          <span>{this.props.t('common.reload') || 'Reload'}</span>
        </button>
      </div>
      <div className="list-container" onScroll={this.handleScroll}>
        {friends.length > 0 ? friends.map(friend => (
          <div key={friend.SK} className="friend-card">
            <div className="avatar-container">
              <div className="avatar-placeholder">
                {friend.friendAvatarUrl ? (
                  <img src={friend.friendAvatarUrl} alt="avatar" />
                ) : (
                  <IonIcon icon={peopleOutline} />
                )}
              </div>
            </div>
            <div className="friend-info">
              <div className="name-row">
                <span className="friend-name">{friend.friendName || 'Unknown'}</span>
                {friend.level && <span className="friend-rank">{this.props.t('social.level_short')}{friend.level}</span>}
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
            <p>{this.props.t('social.no_friends') || 'No friends yet'}</p>
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
          <h3>{t('social.friend_requests') || 'Requests'}</h3>
          <button className="reload-btn" onClick={() => this.fetchFriends(true)} disabled={this.state.isLoading}>
            <IonIcon icon={refreshOutline} className={this.state.isLoading ? 'spinning' : ''} />
          </button>
        </div>
        <div className="tab-section-header">{t('social.requests')} ({requestsIn.length})</div>
        <div className="list-container">
          {requestsIn.length > 0 ? requestsIn.map(req => (
            <div key={req.SK} className="request-card">
              <div className="request-info">
                <span className="request-name">{req.friendName}</span>
                <span className="request-level">{t('social.incoming_desc') || 'Sent you an invitation'}</span>
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

        <div className="tab-section-header mt-4">{t('social.sent_requests') || 'Pending Outgoing'} ({requestsOut.length})</div>
        <div className="list-container">
          {requestsOut.map(req => (
            <div key={req.SK} className="request-card outgoing">
              <div className="request-info">
                <span className="request-name">{req.friendName}</span>
                <span className="request-level">{t('social.waiting_desc') || 'Waiting for confirmation...'}</span>
              </div>
              <div className="request-actions">
                <button
                  className="req-btn cancel"
                  onClick={() => this.handleSocialAction('remove', req.SK)}
                  disabled={this.state.isActionLoading === req.SK}
                  title={t('social.cancel_request')}
                >
                  <IonIcon icon={paperPlaneOutline} />
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
    return (
      <div className="social-tab-content add-friend">
        <div className="search-bar">
          <IonIcon icon={searchOutline} />
          <input
            type="text"
            placeholder={t('social.search_by_username') || 'Search by username...'}
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
          {this.state.isSearching && <div className="search-spinner" />}
        </div>

        <div className="search-results">
          {this.state.searchResults.length > 0 ? (
            this.state.searchResults.map(user => (
              <div key={user.userId} className="search-result-card">
                <div className="user-avatar">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <IonIcon icon={peopleOutline} />}
                </div>
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-meta">{t('common.streak')}: {user.streak || 0} • {user.titles?.[0] || 'Newbie'}</span>
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
            ))
          ) : (
            this.state.searchQuery.length >= 2 && !this.state.isSearching && (
              <div className="empty-search">
                {t('social.no_username_found', { query: this.state.searchQuery }) || `No user found with username "${this.state.searchQuery}"`}
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

          <div className="sidebar-footer">
            <button className="sync-btn" onClick={() => this.fetchFriends(true)} title={t('social.sync_friends')}>
              <IonIcon icon={refreshOutline} className={this.state.isLoading ? 'spinning' : ''} />
            </button>
          </div>
        </div>

        <div className="social-main">
          {this.state.apiNotConfigured ? (
            <div className="empty-state api-error">
              <IonIcon icon={refreshOutline} />
              <p>{t('social.api_not_configured') || 'Server connection not configured. Please check your environment settings.'}</p>
              <button className="reload-btn mt-4" onClick={() => this.fetchFriends(true)}>
                {t('common.retry') || 'Retry Connection'}
              </button>
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
  friends: state.friends || [],
  friendLastEvaluatedKey: state.friendLastEvaluatedKey,
  friendUpdatedAt: state.friendUpdatedAt,
  userInfo: state.userInfo,
});

const mapDispatchToProps = (dispatch) => ({
  setFriends: (data) => dispatch(setFriends(data)),
  appendFriends: (data) => dispatch(appendFriends(data)),
  setFriendSyncTime: (time) => dispatch(setFriendSyncTime(time)),
});

export default withTranslation()(connect(mapStateToProps, mapDispatchToProps)(SocialApp));
