import React, { Component } from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { ticketOutline, diamondOutline } from 'ionicons/icons';

import './GachaStation.scss';
import { handleRollGachaApi } from '../../services/gachaServices';
import { setEconomy, setInventory } from '../../store/actions';

class GachaStation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
    };
  }

  //roll gacha
  handleRollGacha = async () => {
    const { gachaTickets } = this.props.economy;
    if (gachaTickets <= 0) {
      toast.error('Không đủ Gacha Tickets!');
      return;
    }

    this.setState({ isLoading: true });
    try {
      const response = await handleRollGachaApi();
      if (response && response.errCode === 0) {
        toast.success(`Nhận được: ${response.reward.name}`);
        // Giả sử API trả về data economy/inventory mới
        if (response.economy) this.props.setEconomy(response.economy);
        if (response.inventory) this.props.setInventory(response.inventory);
      } else {
        toast.error(response?.errMessage || 'Lỗi khi quay Gacha!');
      }
    } catch (error) {
      console.log('Error rolling gacha:', error);
      toast.error('Xảy ra lỗi, vui lòng thử lại!');
    }
    this.setState({ isLoading: false });
  };

  render() {
    const { economy } = this.props;
    const tickets = economy?.gachaTickets || 0;

    return (
      <div className="app-container gacha-app">
        <h2 className="app-title">🎰 Gacha Station</h2>
        <div className="gacha-info">
          <p>Drop Pool:</p>
          <ul>
            <li>🪙 60% — P-Coin</li>
            <li>🧪 25% — Consumables</li>
            <li>✨ 10% — Cosmetic Shards</li>
            <li>👑 5% — Jackpot Cosmetics</li>
          </ul>
        </div>
        <div className="gacha-tickets">
          <span><IonIcon icon={ticketOutline} /> Gacha Tickets: {tickets}</span>
        </div>
        <button 
          className="btn-gacha-roll" 
          onClick={this.handleRollGacha}
          disabled={this.state.isLoading}
        >
          🎰 Quay Thưởng
        </button>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  economy: state.economy,
  inventory: state.inventory,
});

const mapDispatchToProps = (dispatch) => ({
  setEconomy: (data) => dispatch(setEconomy(data)),
  setInventory: (data) => dispatch(setInventory(data)),
});

export default connect(mapStateToProps, mapDispatchToProps)(GachaStation);
