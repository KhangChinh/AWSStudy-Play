import React, { Component } from 'react';
import { connect } from 'react-redux';
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
        toast.success('Focus session đã bắt đầu!');
        this.setState({ activeSession: result });
      } else {
        toast.error('Không thể bắt đầu focus session!');
      }
    } catch (e) {
      console.log('Error starting focus:', e);
      toast.error('Lỗi khi bắt đầu focus session!');
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
          title="Toggle Focus Mode"
        >
          <h3>
            <IonIcon icon={lockClosedOutline} /> Focus Mode
          </h3>
          <IonIcon icon={isExpanded ? chevronDownOutline : chevronForwardOutline} className="toggle-icon" />
        </div>

        {isExpanded && (
          <div className="widget-content">
            <p className="description">Select apps to block:</p>
            <div className="app-list">
              {['Mini Games', 'Store', 'Social Media', 'Web Browser'].map(app => (
                <div className="app-item" key={app}>
                  <div className="app-name">
                    <input type="checkbox" />
                    <span>{app}</span>
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
              <IonIcon icon={rocketOutline} /> Start Focus Session
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default FocusWidget;
