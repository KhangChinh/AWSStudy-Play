/**
 * Spinner Component — Hiển thị loading overlay
 */

import React, { Component } from 'react';
import './Spinner.scss';

class Spinner extends Component {
  render() {
    return (
      <div className="spinner-overlay">
        <div className="spinner-container">
          <div className="spinner-ring"></div>
          <p className="spinner-text">Loading...</p>
        </div>
      </div>
    );
  }
}

export default Spinner;
