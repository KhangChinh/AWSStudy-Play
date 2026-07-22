import { Component } from 'react';
import BackgroundCssThumbnail from '../../components/BackgroundCssThumbnail';
import RankFrame from '../../components/RankFrame';
import './GachaAnimation.scss';

const PARTICLE_COUNT = 72;
const STAR_COUNT = 46;
const SHARD_COUNT = 28;
const RESULT_FLIP_DURATION_MS = 550;
const RESULT_STAGGER_MS = 120;
const SINGLE_CONVERSION_DURATION_MS = 1900;
const MULTI_CONVERSION_DURATION_MS = 2100;
const CLOSE_DELAY_MS = 1000;

class GachaAnimation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      phase: 'idle', // idle | blackout | portal | flight | burst | reveal | done
      particles: [],
      stars: [],
      shards: [],
      showSkip: false,
      isInstantReveal: false,
      canClose: false,
    };
    this.timers = [];
    this.closeUnlockTimer = null;
    this.revealStartedAt = 0;
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
    clearTimeout(this.closeUnlockTimer);
    this.closeUnlockTimer = null;
  };

  scheduleCloseUnlock = (isInstantReveal = false) => {
    clearTimeout(this.closeUnlockTimer);
    const rewards = this.props.rewards || [];
    const isMulti = rewards.length > 1;
    const hasConversion = rewards.some((reward) => reward.isConverted && reward.conversionResult);
    const itemRevealDuration = RESULT_FLIP_DURATION_MS
      + (isMulti && !isInstantReveal ? Math.max(0, rewards.length - 1) * RESULT_STAGGER_MS : 0);
    const conversionDuration = hasConversion
      ? (isMulti ? MULTI_CONVERSION_DURATION_MS : SINGLE_CONVERSION_DURATION_MS)
      : 0;
    const unlockAt = this.revealStartedAt + Math.max(itemRevealDuration, conversionDuration) + CLOSE_DELAY_MS;

    this.closeUnlockTimer = setTimeout(() => {
      this.closeUnlockTimer = null;
      this.setState({ canClose: true });
    }, Math.max(0, unlockAt - Date.now()));
  };

  enterReveal = (isInstantReveal = false) => {
    this.revealStartedAt = Date.now();
    this.setState({
      phase: 'reveal',
      particles: this.generateParticles(),
      shards: this.generateShards(),
      showSkip: false,
      isInstantReveal,
      canClose: false,
    }, () => this.scheduleCloseUnlock(isInstantReveal));
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
      canClose: false,
    });

    this.timers.push(setTimeout(() => this.setState({ phase: 'portal' }), 520));
    this.timers.push(setTimeout(() => this.setState({ phase: 'flight' }), 1600));
    this.timers.push(setTimeout(() => this.setState({ phase: 'burst' }), 3000));
    this.timers.push(setTimeout(() => this.enterReveal(false), 3900));
  };

  handleOverlayClick = () => {
    const { phase, showSkip, isInstantReveal, canClose } = this.state;
    const { hasNewItem } = this.props;

    if (phase === 'reveal') {
      if (canClose) {
        this.handleClose();
        return;
      }
      if (!isInstantReveal) {
        this.setState({ isInstantReveal: true }, () => this.scheduleCloseUnlock(true));
      }
      return;
    }

    if ((phase === 'portal' || phase === 'flight' || phase === 'burst') && !showSkip && !hasNewItem) {
      this.setState({ showSkip: true });
    }
  };

  handleSkip = (event) => {
    event.stopPropagation();
    this.clearTimers();
    this.enterReveal(true);
  };

  handleClose = () => {
    this.clearTimers();
    this.setState({ phase: 'done' });
    this.timers.push(setTimeout(() => {
      this.setState({ phase: 'idle' });
      this.props.onComplete?.();
    }, 420));
  };

  getRarityClass = () => {
    const value = Number(this.props.rarity);
    if (value === 5) return 'rarity-five-star';
    if (value === 4) return 'rarity-four-star';
    return 'rarity-r';
  };

  renderIcon = (icon) => {
    if (!icon) return '□';
    if (typeof icon === 'string') {
      return <img src={icon} alt={this.props.t?.('gacha_animation.item_icon_alt') || 'Item icon'} className="img-icon-render" />;
    }
    if (icon.kind !== 'css') return '□';
    if (icon.itemType === 'background') {
      return <BackgroundCssThumbnail item={icon.item} className="gacha-css-background" />;
    }
    if (icon.itemType === 'frame') {
      return <RankFrame tier={(icon.itemId || '').replace(/^frame_/, '') || 'none'} size={132} className="gacha-css-frame" />;
    }
    if (icon.itemType === 'title') {
      return <span className={`gacha-css-title profile-title-${icon.itemId}`}>[{icon.item?.name || icon.itemId}]</span>;
    }
    return '□';
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
            <div className="rarity-banner">{(() => { const r = Number(primaryReward.rarity || this.props.rarity); return r === 5 ? '5★' : r === 4 ? '4★' : '3★'; })()}</div>
            <div className="item-card-shell">
              <div className="item-card-glow" />
              <div className="item-card-shine" />
              <div className={primaryReward.isConverted ? 'item-icon conversion-source-icon' : 'item-icon'}>
                {this.renderIcon(primaryReward.icon)}
              </div>
              {primaryReward.isConverted && primaryReward.conversionResult && (
                <div className="conversion-result-icon">
                  {this.renderIcon(primaryReward.conversionResult.icon)}
                </div>
              )}
            </div>
            <div className={primaryReward.isConverted ? 'item-name conversion-source-name' : 'item-name'}>
              {primaryReward.name || this.props.t?.('gacha_animation.mystery_item') || 'Mystery Item'}
            </div>
            {primaryReward.isConverted && primaryReward.conversionResult && (
              <div className="conversion-result-name">{primaryReward.conversionResult.name}</div>
            )}
            <div className="item-subtitle">{primaryReward.isConverted ? (this.props.t?.('gacha_animation.converted_reward') || 'Converted Reward') : (this.props.t?.('gacha_animation.new_acquisition') || 'New Acquisition')}</div>
          </div>
        )}

        {isMulti && (
          <div className={`reveal-container multi-grid ${isInstantReveal ? 'instant' : ''}`}>
            <div className="multi-title">{this.props.t?.('gacha_animation.results') || 'Results'}</div>
            <div className="result-grid">
              {rewards.map((reward, index) => {
                const rVal = Number(reward.rarity);
                const itemRarityClass = rVal === 5 ? 'rarity-five-star' : rVal === 4 ? 'rarity-four-star' : 'rarity-r';
                const starLabel = rVal === 5 ? '5\u2605' : rVal === 4 ? '4\u2605' : '3\u2605';

                return (
                  <div
                    className={`grid-item ${itemRarityClass} ${reward.isConverted ? 'converted' : ''}`}
                    key={`${reward.id || reward.name || 'reward'}-${index}`}
                    style={{ animationDelay: isInstantReveal ? '0s' : `${index * 0.12}s` }}
                  >
                    <div className="grid-shine" />
                    <div className="grid-icon">{this.renderIcon(reward.icon)}</div>
                    <div className="grid-name">{reward.name || this.props.t?.('gacha_animation.item') || 'Item'}</div>
                    {reward.isConverted && reward.conversionResult && (
                      <div className="grid-conversion-result">
                        <div className="grid-conversion-icon">
                          {this.renderIcon(reward.conversionResult.icon)}
                        </div>
                        <div className="grid-conversion-name">{reward.conversionResult.name}</div>
                      </div>
                    )}
                    <div className="grid-rarity">{starLabel}</div>
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
