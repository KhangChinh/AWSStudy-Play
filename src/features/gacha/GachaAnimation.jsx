import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import './GachaAnimation.scss';

const PARTICLE_COUNT = 40;

class GachaAnimation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      phase: 'idle', // idle | blackout | meteor | burst | reveal | done
      particles: this.generateParticles(),
      showSkip: false,
      isInstantReveal: false,
    };
    this.timers = [];
  }

  generateParticles = () => {
    return [...Array(PARTICLE_COUNT)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 2,
      duration: Math.random() * 3 + 2,
      angle: Math.random() * 360,
    }));
  };

  componentDidUpdate(prevProps) {
    if (!prevProps.isPlaying && this.props.isPlaying) {
      this.startAnimation();
    }
  }

  componentWillUnmount() {
    this.clearTimers();
  }

  clearTimers = () => {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
  };

  startAnimation = () => {
    this.setState({ 
      phase: 'blackout', 
      showSkip: false,
      isInstantReveal: false 
    });

    this.timers.push(setTimeout(() => {
      this.setState({ phase: 'meteor' });
    }, 600));

    this.timers.push(setTimeout(() => {
      this.setState({ phase: 'burst' });
    }, 2200));

    this.timers.push(setTimeout(() => {
      this.setState({ phase: 'reveal', particles: this.generateParticles(), showSkip: false });
    }, 3200));
  };

  handleOverlayClick = () => {
    const { phase, showSkip, isInstantReveal } = this.state;
    const { hasNewItem } = this.props;

    // If in reveal phase and first click, do instant reveal
    if (phase === 'reveal') {
      if (!isInstantReveal) {
        this.setState({ isInstantReveal: true });
      } else {
        this.handleClose();
      }
      return;
    }
    
    // If in mid-animation, show skip button (ONLY if NO NEW ITEM)
    if ((phase === 'meteor' || phase === 'burst') && !showSkip) {
      if (!hasNewItem) {
        this.setState({ showSkip: true });
      }
    }
  };

  handleSkip = (e) => {
    e.stopPropagation();
    this.clearTimers();
    this.setState({ 
      phase: 'reveal', 
      particles: this.generateParticles(),
      showSkip: false 
    });
  };

  handleClose = () => {
    this.setState({ phase: 'done' });
    setTimeout(() => {
      this.setState({ phase: 'idle' });
      if (this.props.onComplete) this.props.onComplete();
    }, 500);
  };

  getRarityClass = () => {
    const r = this.props.rarity || 'R';
    const map = {
      'SSR': 'rarity-ssr',
      'SR': 'rarity-sr',
      'R': 'rarity-r'
    };
    return map[r] || 'rarity-r';
  };

  getRarityLabel = () => {
    const r = this.props.rarity || 'R';
    return r; // Now just returns labels R, SR, SSR
  };

  renderIcon = (icon) => {
    if (!icon) return '📦';
    if (typeof icon === 'string' && (icon.startsWith('/') || icon.startsWith('http'))) {
      return <img src={icon} alt={this.props.t('gacha_animation.item_icon_alt')} className="img-icon-render" />;
    }
    return icon;
  };

  render() {
    const { phase, particles, showSkip } = this.state;
    const { rewards } = this.props;
    const rarityClass = this.getRarityClass();
    const isMulti = rewards && rewards.length > 1;

    if (phase === 'idle') return null;

    return (
      <div 
        className={`gacha-overlay ${phase} ${rarityClass}`} 
        onClick={this.handleOverlayClick}
      >
        <div className="blackout-layer" />

        {showSkip && (
          <button className="gacha-skip-btn" onClick={this.handleSkip}>
            {this.props.t('gacha_animation.skip')}
          </button>
        )}

        {(phase === 'meteor' || phase === 'burst') && (
          <div className={`meteor-wrapper ${rarityClass}`}>
            <div className={`meteor-head ${isMulti ? 'multi' : ''}`} />
            <div className="meteor-trail" />
          </div>
        )}

        {(phase === 'burst' || phase === 'reveal') && (
          <div className={`burst-container ${rarityClass}`}>
            <div className="burst-ring ring-1" />
            <div className="burst-ring ring-2" />
            <div className="burst-ring ring-3" />
            <div className="burst-flash" />
          </div>
        )}

        {phase === 'reveal' && (
          <>
            <div className="particle-field">
              {particles.map(p => (
                <div
                  key={p.id}
                  className={`particle ${rarityClass}`}
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: p.size,
                    height: p.size,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`,
                    '--angle': `${p.angle}deg`,
                  }}
                />
              ))}
            </div>

            {/* Single Reveal */}
            {!isMulti && rewards && rewards[0] && (
              <div className={`reveal-container single ${rarityClass}`}>
                <div className="item-glow" />
                <div className="item-icon">
                  {this.renderIcon(rewards[0].icon)}
                </div>
                <div className="item-name">{rewards[0].name || this.props.t('gacha_animation.mystery_item')}</div>
                <div className={`item-rarity ${rarityClass}`}>
                  {this.getRarityLabel()}
                </div>
              </div>
            )}

            {/* Multi Reveal (x10) */}
            {isMulti && (
              <div className={`reveal-container multi-grid ${this.state.isInstantReveal ? 'instant' : ''}`}>
                {rewards.map((reward, i) => {
                  const classMap = { 'SSR': 'ssr', 'SR': 'sr', 'R': 'r' };
                  const rClass = `rarity-${classMap[reward.rarity] || 'r'}`;
                  
                  return (
                    <div 
                      className={`grid-item ${rClass} ${reward.isConverted ? 'converted' : ''}`} 
                      key={i} 
                      style={{ animationDelay: this.state.isInstantReveal ? '0s' : `${i * 0.1}s` }}
                    >
                      <div className="grid-icon">{this.renderIcon(reward.icon)}</div>
                      <div className="grid-stars">{reward.rarity}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={`light-rays ${rarityClass}`}>
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="ray"
                  style={{ transform: `rotate(${i * 30}deg)` }}
                />
              ))}
            </div>
            
            <p className="click-hint">{this.props.t('gacha_animation.click_continue')}</p>
          </>
        )}

        {phase === 'done' && <div className="fadeout-layer" />}
      </div>
    );
  }
}

export default withTranslation()(GachaAnimation);
