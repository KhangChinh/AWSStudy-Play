import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import {
  chevronBackOutline,
  chevronForwardOutline,
  chevronUpOutline,
  chevronDownOutline,
  peopleOutline,
  personCircleOutline,
} from 'ionicons/icons';
import { resolveAvatarUrl, useDefaultAvatarOnError } from '../../utils/avatarUrl';
import './DesktopFriendsWidget.scss';

const FRIENDS_PER_PAGE = 6;

const DesktopFriendsWidget = ({ friends = [] }) => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [page, setPage] = useState(0);
  const acceptedFriends = friends.filter((friend) => friend.status === 'ACCEPTED');
  const totalPages = Math.ceil(acceptedFriends.length / FRIENDS_PER_PAGE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const visibleFriends = acceptedFriends.slice(
    currentPage * FRIENDS_PER_PAGE,
    (currentPage + 1) * FRIENDS_PER_PAGE,
  );

  return (
    <aside
      className={`desktop-friends-widget ${isCollapsed ? 'collapsed' : ''}`}
      aria-label={t('social.friends')}
    >
      <button
        type="button"
        className="friends-widget-toggle"
        onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        title={t(isCollapsed ? 'social.expand_friends' : 'social.collapse_friends')}
        aria-label={t(isCollapsed ? 'social.expand_friends' : 'social.collapse_friends')}
        aria-expanded={!isCollapsed}
      >
        <IonIcon icon={isCollapsed ? chevronBackOutline : chevronForwardOutline} aria-hidden="true" />
      </button>

      <div className="friends-widget-header">
        <span className="friends-widget-title">
          <IonIcon icon={peopleOutline} aria-hidden="true" />
          {t('social.friends')} ({acceptedFriends.length})
        </span>
      </div>

      <div className="friends-widget-body">
        {visibleFriends.length > 0 ? visibleFriends.map((friend) => (
          <div key={friend.SK} className="friends-widget-item">
            <div className="friend-avatar-mini">
              {friend.friendAvatarUrl ? (
                <img
                  src={resolveAvatarUrl(friend.friendAvatarUrl)}
                  alt={friend.friendName || t('social.unknown_user')}
                  onError={useDefaultAvatarOnError}
                />
              ) : (
                <IonIcon className="friend-avatar-placeholder" icon={personCircleOutline} aria-hidden="true" />
              )}
            </div>
            <span className="friend-name-mini">{friend.friendName || t('social.unknown_user')}</span>
            {friend.level && <span className="friend-level-mini">Lv.{friend.level}</span>}
          </div>
        )) : (
          <div className="friends-widget-empty">{t('social.no_friends')}</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="friends-widget-pagination">
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === 0}
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            title={t('social.previous_page')}
            aria-label={t('social.previous_page')}
          >
            <IonIcon icon={chevronUpOutline} aria-hidden="true" />
          </button>
          <span className="pagination-text">{currentPage + 1} / {totalPages}</span>
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
            title={t('social.next_page')}
            aria-label={t('social.next_page')}
          >
            <IonIcon icon={chevronDownOutline} aria-hidden="true" />
          </button>
        </div>
      )}
    </aside>
  );
};

export default DesktopFriendsWidget;