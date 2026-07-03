import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { lockClosedOutline, chevronDownOutline, chevronForwardOutline, rocketOutline } from 'ionicons/icons';

import './FocusWidget.scss';
import { handleStartFocusApi, handleStopFocusApi } from '../../services/focusServices';

class FocusWidget extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isExpanded: true,
      isLoading: false,
      blacklist: [],
      activeSession: null,
    };
  }
  //toggle
  handleToggle = () => {
    this.setState({ isExpanded: !this.state.isExpanded });
  };
  //start focus
  handleStartFocus = async () => {
    this.setState({ isLoading: true });
    try {
      const result = await handleStartFocusApi({
        targetMinutes: 60,
        blacklist: this.props.blacklist || [],
      });
      if (result && result.success) {
        toast.success(this.props.t('focus.started'));
        this.setState({ activeSession: result });
      } else {
        toast.error(this.props.t('focus.error'));
      }
    } catch (e) {
      console.log('Error starting focus:', e);
      toast.error(this.props.t('focus.error'));
    }
    this.setState({ isLoading: false });
  };
  //render
  render() {
    const { isExpanded } = this.state;
    return (
      <div className={`app-blocker-widget ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div
          className="widget-header"
          onClick={this.handleToggle}
          title={this.props.t('focus.toggle')}
        >
          <h3>
            <IonIcon icon={lockClosedOutline} /> {this.props.t('common.focus_mode')}
          </h3>
          <IonIcon icon={isExpanded ? chevronDownOutline : chevronForwardOutline} className="toggle-icon" />
        </div>

        {isExpanded && (
          <div className="widget-content">
            <p className="description">{this.props.t('focus.select_apps_to_block')}</p>
            <div className="app-list">
              {[
                ['common.minigames', 'Mini Games'],
                ['common.store', 'Store'],
                ['focus.social_media', 'Social Media'],
                ['focus.web_browser', 'Web Browser'],
              ].map(([appKey, app]) => (
                <div className="app-item" key={app}>
                  <div className="app-name">
                    <input type="checkbox" />
                    <span>{this.props.t(appKey)}</span>
                  </div>
                  <div className="time-range">
                    <input type="time" defaultValue="20:00" />
                    <span>-</span>
                    <input type="time" defaultValue="22:00" />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-start-focus" onClick={this.handleStartFocus}>
              <IonIcon icon={rocketOutline} /> {this.props.t('focus.start')}
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default withTranslation()(FocusWidget);
