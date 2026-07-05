import React, { Component } from 'react';
import './GachaAnimation.scss';

const PARTICLE_COUNT = 72;
const STAR_COUNT = 46;
const SHARD_COUNT = 28;

class GachaAnimation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      phase: 'idle', // idle | blackout | portal | flight | burst | reveal | done
      particles: this.generateParticles(),
      stars: this.generateStars(),
      shards: this.generateShards(),
      showSkip: false,
      isInstantReveal: false,
    };
    this.timers = [];
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.isPlaying && this.props.isPlaying) {
      this.startAnimation();
    }
  }

  componentWillUnmount() {
    this.clearTimers();
  }

  clearTimers = () => {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  };

  generateParticles = () => (
    [...Array(PARTICLE_COUNT)].map((_, id) => ({
      id,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 5 + 2,
      delay: Math.random() * 2.4,
      duration: Math.random() * 3 + 2,
      angle: Math.random() * 360,
    }))
  );

  generateStars = () => (
    [...Array(STAR_COUNT)].map((_, id) => ({
      id,
      y: Math.random() * 100,
      width: Math.random() * 120 + 60,
      delay: Math.random() * 1.2,
      duration: Math.random() * 0.8 + 0.65,
      opacity: Math.random() * 0.55 + 0.2,
    }))
  );

  generateShards = () => (
    [...Array(SHARD_COUNT)].map((_, id) => ({
      id,
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.7,
      distance: Math.random() * 180 + 80,
    }))
  );

  startAnimation = () => {
    this.clearTimers();
    this.setState({
      phase: 'blackout',
      particles: this.generateParticles(),
      stars: this.generateStars(),
      shards: this.generateShards(),
      showSkip: false,
      isInstantReveal: false,
    });

    this.timers.push(setTimeout(() => this.setState({ phase: 'portal' }), 520));
    this.timers.push(setTimeout(() => this.setState({ phase: 'flight' }), 1600));
    this.timers.push(setTimeout(() => this.setState({ phase: 'burst' }), 3000));
    this.timers.push(setTimeout(() => {
      this.setState({
        phase: 'reveal',
        particles: this.generateParticles(),
        shards: this.generateShards(),
        showSkip: false,
      });
    }, 3900));
  };

  handleOverlayClick = () => {
    const { phase, showSkip, isInstantReveal } = this.state;
    const { hasNewItem } = this.props;

    if (phase === 'reveal') {
      if (!isInstantReveal) {
        this.setState({ isInstantReveal: true });
        return;
      }
      this.handleClose();
      return;
    }

    if ((phase === 'portal' || phase === 'flight' || phase === 'burst') && !showSkip && !hasNewItem) {
      this.setState({ showSkip: true });
    }
  };

  handleSkip = (event) => {
    event.stopPropagation();
    this.clearTimers();
    this.setState({
      phase: 'reveal',
      particles: this.generateParticles(),
      shards: this.generateShards(),
      showSkip: false,
      isInstantReveal: true,
    });
  };

  handleClose = () => {
    this.setState({ phase: 'done' });
    setTimeout(() => {
      this.setState({ phase: 'idle' });
      this.props.onComplete?.();
    }, 420);
  };

  getRarityClass = () => {
    const map = {
      SSR: 'rarity-ssr',
      SR: 'rarity-sr',
      R: 'rarity-r',
    };
    return map[this.props.rarity] || 'rarity-r';
  };

  renderIcon = (icon) => {
    if (!icon) return '□';
    if (typeof icon === 'string' && (icon.startsWith('/') || icon.startsWith('http'))) {
      return <img src={icon} alt={this.props.t?.('gacha_animation.item_icon_alt') || 'Item icon'} className="img-icon-render" />;
    }
    return icon;
  };

  renderPortal = (rarityClass) => (
    <div className={`summon-stage ${rarityClass}`}>
      <div className="cinema-line top" />
      <div className="cinema-line bottom" />
      <div className="portal-core">
        <div className="portal-halo halo-one" />
        <div className="portal-halo halo-two" />
        <div className="portal-halo halo-three" />
        <div className="portal-glyphs">
          {[...Array(12)].map((_, index) => (
            <span key={index} style={{ transform: `rotate(${index * 30}deg)` }} />
          ))}
        </div>
        <div className="summon-sigil" />
      </div>
      <div className="summon-title">{this.props.t?.('gacha_animation.signal_acquired') || 'Signal Acquired'}</div>
    </div>
  );

  renderFlight = (rarityClass, stars, isMulti) => (
    <div className={`flight-stage ${rarityClass}`}>
      <div className="warp-tunnel" />
      <div className="speed-lines">
        {stars.map((star) => (
          <span
            key={star.id}
            style={{
              top: `${star.y}%`,
              width: star.width,
              opacity: star.opacity,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>
      <div className={`summon-comet ${isMulti ? 'multi' : ''}`}>
        <div className="comet-aura" />
        <div className="comet-head" />
        <div className="comet-tail" />
      </div>
    </div>
  );

  renderBurst = (rarityClass, shards) => (
    <div className={`burst-stage ${rarityClass}`}>
      <div className="impact-flash" />
      <div className="impact-core" />
      <div className="impact-ring ring-one" />
      <div className="impact-ring ring-two" />
      <div className="impact-ring ring-three" />
      <div className="shard-field">
        {shards.map((shard) => (
          <span
            key={shard.id}
            style={{
              left: `${shard.x}%`,
              top: `${shard.y}%`,
              transform: `rotate(${shard.rotation}deg)`,
              animationDelay: `${shard.delay}s`,
              '--travel': `${shard.distance}px`,
            }}
          />
        ))}
      </div>
    </div>
  );

  renderReveal = (rarityClass, rewards, isMulti) => {
    const { particles, shards, isInstantReveal } = this.state;
    const primaryReward = rewards?.[0];

    return (
      <>
        <div className="reveal-ambience">
          <div className="reveal-orbit orbit-one" />
          <div className="reveal-orbit orbit-two" />
          <div className="reveal-orbit orbit-three" />
        </div>

        <div className="particle-field">
          {particles.map((particle) => (
            <span
              key={particle.id}
              className={`particle ${rarityClass}`}
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                '--angle': `${particle.angle}deg`,
              }}
            />
          ))}
        </div>

        <div className="floating-shards">
          {shards.slice(0, 18).map((shard) => (
            <span
              key={shard.id}
              style={{
                left: `${shard.x}%`,
                top: `${shard.y}%`,
                transform: `rotate(${shard.rotation}deg)`,
                animationDelay: `${shard.delay}s`,
              }}
            />
          ))}
        </div>

        {!isMulti && primaryReward && (
          <div className={`reveal-container single ${rarityClass}`}>
            <div className="rarity-banner">{primaryReward.rarity || this.props.rarity || 'R'}</div>
            <div className="item-card-shell">
              <div className="item-card-glow" />
              <div className="item-card-shine" />
              <div className="item-icon">{this.renderIcon(primaryReward.icon)}</div>
            </div>
            <div className="item-name">{primaryReward.name || this.props.t?.('gacha_animation.mystery_item') || 'Mystery Item'}</div>
            <div className="item-subtitle">{primaryReward.isConverted ? (this.props.t?.('gacha_animation.converted_reward') || 'Converted Reward') : (this.props.t?.('gacha_animation.new_acquisition') || 'New Acquisition')}</div>
          </div>
        )}

        {isMulti && (
          <div className={`reveal-container multi-grid ${isInstantReveal ? 'instant' : ''}`}>
            <div className="multi-title">{this.props.t?.('gacha_animation.results') || 'Results'}</div>
            <div className="result-grid">
              {rewards.map((reward, index) => {
                const classMap = { SSR: 'ssr', SR: 'sr', R: 'r' };
                const itemRarityClass = `rarity-${classMap[reward.rarity] || 'r'}`;

                return (
                  <div
                    className={`grid-item ${itemRarityClass} ${reward.isConverted ? 'converted' : ''}`}
                    key={`${reward.id || reward.name || 'reward'}-${index}`}
                    style={{ animationDelay: isInstantReveal ? '0s' : `${index * 0.12}s` }}
                  >
                    <div className="grid-shine" />
                    <div className="grid-icon">{this.renderIcon(reward.icon)}</div>
                    <div className="grid-name">{reward.name || this.props.t?.('gacha_animation.item') || 'Item'}</div>
                    <div className="grid-rarity">{reward.rarity || 'R'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="click-hint">{this.props.t?.('gacha_animation.click_continue') || 'Click anywhere to continue'}</p>
      </>
    );
  };

  render() {
    const { phase, stars, shards, showSkip } = this.state;
    const { rewards = [] } = this.props;
    const rarityClass = this.getRarityClass();
    const isMulti = rewards.length > 1;

    if (phase === 'idle') return null;

    return (
      <div className={`gacha-overlay ${phase} ${rarityClass}`} onClick={this.handleOverlayClick}>
        <div className="blackout-layer" />
        <div className="gacha-vignette" />

        {showSkip && (
          <button className="gacha-skip-btn" onClick={this.handleSkip}>
            {this.props.t?.('gacha_animation.skip') || 'Skip'}
          </button>
        )}

        {phase === 'portal' && this.renderPortal(rarityClass)}
        {phase === 'flight' && this.renderFlight(rarityClass, stars, isMulti)}
        {phase === 'burst' && this.renderBurst(rarityClass, shards)}
        {phase === 'reveal' && this.renderReveal(rarityClass, rewards, isMulti)}
        {phase === 'done' && <div className="fadeout-layer" />}
      </div>
    );
  }
}

export default GachaAnimation;
