import React, { Component } from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { lockClosedOutline, rocketOutline } from 'ionicons/icons';

import './FocusWidget.scss';
import { handleStartFocusApi } from '../../services/focusServices';
import { setActiveSession } from '../../store/actions';

class FocusWidget extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isExpanded: true,
      isLoading: false,
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
        this.props.setActiveSession(result);
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
    return (
      <div className="app-container focus-app">
        <div className="focus-header-section">
          <IonIcon icon={lockClosedOutline} />
          <h3>{this.props.t('focus.title')}</h3>
        </div>

        <div className="widget-content">
          <p className="description">{this.props.t('focus.desc')}</p>
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
            <IonIcon icon={rocketOutline} /> {this.props.t('focus.start')}
          </button>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  blacklist: state.focusSettings.blacklist,
  activeSession: state.activeSession,
});

const mapDispatchToProps = (dispatch) => ({
  setActiveSession: (data) => dispatch(setActiveSession(data)),
});

export default connect(mapStateToProps, mapDispatchToProps)(FocusWidget);
