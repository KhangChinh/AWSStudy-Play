import React, { Component } from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import {
  checkmarkOutline,
  closeOutline,
  peopleOutline,
  personAddOutline,
  refreshOutline,
  searchOutline,
  trashOutline
} from 'ionicons/icons';
import {
  handleAcceptFriendApi,
  handleAddFriendApi,
  handleGetFriendsApi,
  handleRemoveFriendApi,
  handleSearchUsersApi
} from '../../services/socialServices';
import { resolveAssetUrl } from '../../services/profileServices';
import { setFriends } from '../../store/actions';
import './FriendsApp.scss';

class FriendsApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      query: '',
      results: [],
      isLoadingFriends: false,
      isSearching: false,
      busyId: null,
    };
  }

  componentDidMount() {
    this.loadFriends();
  }

  loadFriends = async () => {
    this.setState({ isLoadingFriends: true });
    try {
      const response = await handleGetFriendsApi();
      if (!response?.success) throw new Error(response?.message || 'Cannot load friends');
      this.props.setFriends({
        items: response.friends || [],
        lastEvaluatedKey: response.lastEvaluatedKey,
      });
    } catch (error) {
      toast.error(error.message || 'Cannot load friends');
    } finally {
      this.setState({ isLoadingFriends: false });
    }
  };

  handleSearch = async (event) => {
    event?.preventDefault();
    const query = this.state.query.trim();
    if (query.length < 2) return;

    this.setState({ isSearching: true });
    try {
      const response = await handleSearchUsersApi(query);
      if (!response?.success) throw new Error(response?.message || 'Search failed');
      this.setState({ results: response.users || [] });
    } catch (error) {
      toast.error(error.message || 'Search failed');
    } finally {
      this.setState({ isSearching: false });
    }
  };

  runFriendAction = async (targetUserId, action, successMessage) => {
    this.setState({ busyId: targetUserId });
    try {
      const response = await action(targetUserId);
      if (!response?.success) throw new Error(response?.message || 'Action failed');
      toast.success(successMessage || response.message || 'Done');
      await this.loadFriends();
    } catch (error) {
      toast.error(error.message || 'Action failed');
    } finally {
      this.setState({ busyId: null });
    }
  };

  renderAvatar = (url, fallback = '?') => (
    <div className="friend-avatar">
      {url ? <img src={resolveAssetUrl(url)} alt="" /> : <span>{fallback.slice(0, 1).toUpperCase()}</span>}
    </div>
  );

  renderFriendRow = (friend) => {
    const id = friend.SK;
    const status = friend.status;
    const busy = this.state.busyId === id;

    return (
      <div className={`friend-row status-${status?.toLowerCase?.() || 'unknown'}`} key={id}>
        {this.renderAvatar(friend.friendAvatarUrl, friend.friendName || id)}
        <div className="friend-main">
          <div className="friend-name">{friend.friendName || id}</div>
          <div className="friend-status">{status || 'UNKNOWN'}</div>
        </div>
        <div className="friend-actions">
          {status === 'PENDING_IN' && (
            <button disabled={busy} onClick={() => this.runFriendAction(id, handleAcceptFriendApi, 'Friend accepted')}>
              <IonIcon icon={checkmarkOutline} />
            </button>
          )}
          <button disabled={busy} onClick={() => this.runFriendAction(id, handleRemoveFriendApi, 'Friend updated')}>
            <IonIcon icon={status === 'ACCEPTED' ? trashOutline : closeOutline} />
          </button>
        </div>
      </div>
    );
  };

  renderSearchResult = (user) => {
    const id = user.userId;
    const busy = this.state.busyId === id;
    return (
      <div className="friend-row search-result" key={id}>
        {this.renderAvatar(user.avatarUrl, user.name || id)}
        <div className="friend-main">
          <div className="friend-name">{user.name || id}</div>
          <div className="friend-status">Streak {user.streak || 0}</div>
        </div>
        <button disabled={busy} onClick={() => this.runFriendAction(id, handleAddFriendApi, 'Friend request sent')}>
          <IonIcon icon={personAddOutline} />
        </button>
      </div>
    );
  };

  render() {
    const { friends = [] } = this.props;
    const accepted = friends.filter(item => item.status === 'ACCEPTED');
    const pendingIn = friends.filter(item => item.status === 'PENDING_IN');
    const pendingOut = friends.filter(item => item.status === 'PENDING_OUT');

    return (
      <div className="app-container friends-app">
        <div className="friends-header">
          <h2><IonIcon icon={peopleOutline} /> Friends</h2>
          <button onClick={this.loadFriends} disabled={this.state.isLoadingFriends}>
            <IonIcon icon={refreshOutline} />
          </button>
        </div>

        <form className="friends-search" onSubmit={this.handleSearch}>
          <IonIcon icon={searchOutline} />
          <input
            value={this.state.query}
            onChange={(event) => this.setState({ query: event.target.value })}
            placeholder="Search by name or email"
          />
          <button disabled={this.state.isSearching || this.state.query.trim().length < 2}>
            Search
          </button>
        </form>

        {this.state.results.length > 0 && (
          <section className="friends-section">
            <h3>Search Results</h3>
            {this.state.results.map(this.renderSearchResult)}
          </section>
        )}

        <section className="friends-section">
          <h3>Requests In</h3>
          {pendingIn.length ? pendingIn.map(this.renderFriendRow) : <div className="friends-empty">No incoming requests</div>}
        </section>

        <section className="friends-section">
          <h3>Friends</h3>
          {accepted.length ? accepted.map(this.renderFriendRow) : <div className="friends-empty">No friends yet</div>}
        </section>

        <section className="friends-section">
          <h3>Requests Sent</h3>
          {pendingOut.length ? pendingOut.map(this.renderFriendRow) : <div className="friends-empty">No pending outgoing requests</div>}
        </section>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  friends: state.friends,
});

const mapDispatchToProps = (dispatch) => ({
  setFriends: (data) => dispatch(setFriends(data)),
});

export default connect(mapStateToProps, mapDispatchToProps)(FriendsApp);
