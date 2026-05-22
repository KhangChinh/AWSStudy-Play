import React, { Component } from 'react';
import './GachaAnimation.scss';

const PARTICLE_COUNT = 40;

class GachaAnimation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      phase: 'idle', // idle | blackout | meteor | burst | reveal | done
      particles: this.generateParticles(),
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
    this.timers.forEach(t => clearTimeout(t));
  }

  startAnimation = () => {
    this.setState({ phase: 'blackout' });

    this.timers.push(setTimeout(() => {
      this.setState({ phase: 'meteor' });
    }, 600));

    this.timers.push(setTimeout(() => {
      this.setState({ phase: 'burst' });
    }, 2200));

    this.timers.push(setTimeout(() => {
      this.setState({ phase: 'reveal', particles: this.generateParticles() });
    }, 3200));
  };

  handleClose = () => {
    this.setState({ phase: 'done' });
    setTimeout(() => {
      this.setState({ phase: 'idle' });
      if (this.props.onComplete) this.props.onComplete();
    }, 500);
  };

  getRarityClass = () => {
    const r = this.props.rarity || 3;
    if (r >= 5) return 'rarity-5';
    if (r >= 4) return 'rarity-4';
    return 'rarity-3';
  };

  getRarityLabel = () => {
    const r = this.props.rarity || 3;
    if (r >= 5) return '★★★★★';
    if (r >= 4) return '★★★★';
    return '★★★';
  };

  render() {
    const { phase, particles } = this.state;
    const { rewards } = this.props;
    const rarityClass = this.getRarityClass();
    const isMulti = rewards && rewards.length > 1;

    if (phase === 'idle') return null;

    return (
      <div className={`gacha-overlay ${phase} ${rarityClass}`} onClick={phase === 'reveal' ? this.handleClose : undefined}>
        <div className="blackout-layer" />

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
                  {rewards[0].icon || '🎁'}
                </div>
                <div className="item-name">{rewards[0].name || 'Mystery Item'}</div>
                <div className={`item-rarity ${rarityClass}`}>
                  {this.getRarityLabel()}
                </div>
              </div>
            )}

            {/* Multi Reveal (x10) */}
            {isMulti && (
              <div className="reveal-container multi-grid">
                {rewards.map((reward, i) => (
                  <div className={`grid-item rarity-${reward.rarity}`} key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="grid-icon">{reward.icon}</div>
                    <div className="grid-stars">{'★'.repeat(reward.rarity)}</div>
                  </div>
                ))}
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
            
            <p className="click-hint">Click anywhere to continue</p>
          </>
        )}

        {phase === 'done' && <div className="fadeout-layer" />}
      </div>
    );
  }
}

export default GachaAnimation;
