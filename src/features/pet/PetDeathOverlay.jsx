import React, { useState, useEffect, useRef } from 'react';
import { cosmeticManager, assetUrl } from '../../services/cosmeticServices';
import './PetOverlay.scss';

const GRAVITY = 0.5;
const WALK_SPEED = 2;
const JUMP_SPEED_Y = -12;
const JUMP_SPEED_X = 3;
const TASKBAR_HEIGHT = 48;

const PetDeathOverlay = ({ equippedPet }) => {
  const [petId, setPetId] = useState(equippedPet !== undefined ? equippedPet : (localStorage.getItem('equippedPet') || null));
  const [pos, setPos] = useState({ x: 100, y: 0 });
  const [vel, setVel] = useState({ x: 0, y: 0 });
  const [state, setState] = useState('Idle');
  const [dir, setDir] = useState('right');
  const [frame, setFrame] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDead, setIsDead] = useState(false);
  
  const dbPet = cosmeticManager.getCosmeticInfo('pets', petId);
  
  const pet = React.useMemo(() => {
    if (!dbPet) return null;
    
    const allAnims = {
      Idle: { file: dbPet.assets?.sitting || dbPet.assets?.idle, frames: 2, speed: 150 },
      Walk: { file: dbPet.assets?.run || dbPet.assets?.walk, frames: 4, speed: 100 },
      Hurt: { file: dbPet.assets?.hurt, frames: 6, speed: 200 },
      Attack: { file: dbPet.assets?.attack, frames: 8, speed: 100 },
      Death: { file: dbPet.assets?.death, frames: 8, speed: 150, loop: false },
      Jump: { file: dbPet.assets?.jump, frames: 8, speed: 150 },
      Sleep: { file: dbPet.assets?.sleep, frames: 4, speed: 200 },
      CarrotSkill: { file: dbPet.assets?.carrotskill, frames: 8, speed: 150 },
      Sitting: { file: dbPet.assets?.sitting, frames: 2, speed: 150 },
      LieDown: { file: dbPet.assets?.liedown, frames: 8, speed: 150 }
    };

    const validAnimations = {};
    for (const [key, config] of Object.entries(allAnims)) {
      if (config.file) {
        validAnimations[key] = {
          fileUrl: assetUrl(config.file),
          frames: config.frames,
          speed: config.speed,
          loop: config.loop !== false,
          type: config.file.endsWith('.gif') ? 'gif' : 'sprite'
        };
      }
    }

    if (Object.keys(validAnimations).length === 0 && dbPet?.imageUrl) {
      validAnimations['Idle'] = {
        fileUrl: assetUrl(dbPet.imageUrl),
        frames: 1,
        speed: 1000,
        loop: true,
        type: dbPet.imageUrl.endsWith('.gif') ? 'gif' : 'sprite'
      };
    }

      return dbPet ? {
        name: dbPet.name || petId,
        width: 32,
        height: 35,
        isDbPet: true,
        animations: validAnimations
      } : null;
  }, [dbPet]);

  const posRef = useRef(pos);
  const velRef = useRef(vel);
  const stateRef = useRef(state);
  const dirRef = useRef(dir);
  const isDraggingRef = useRef(isDragging);
  const frameTimerRef = useRef(null);
  const behaviorTimerRef = useRef(null);
  const deathTimerRef = useRef(null);
  const targetRef = useRef(null);

  useEffect(() => {
    const handlePetChange = (e) => {
      setPetId(e.detail);
      setState('Idle');
      setIsDead(false);
      setPos(p => ({ ...p, y: window.innerHeight - TASKBAR_HEIGHT }));
    };
    window.addEventListener('petChanged', handlePetChange);
    return () => window.removeEventListener('petChanged', handlePetChange);
  }, []);

  useEffect(() => {
    if (equippedPet !== undefined && equippedPet !== petId) {
      setPetId(equippedPet);
      setState('Idle');
      setIsDead(false);
      setPos(p => ({ ...p, y: window.innerHeight - TASKBAR_HEIGHT }));
    }
  }, [equippedPet]);

  // Update refs
  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { velRef.current = vel; }, [vel]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { dirRef.current = dir; }, [dir]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  // Frame animation
  useEffect(() => {
    if (!pet || isDead) return;
    const animConfig = pet.animations[state];
    if (!animConfig) {
      if (state === 'Attack' || state === 'Death' || state === 'Hurt' || state === 'Jump') {
         setState('Idle');
      }
      return;
    }

    setFrame(0);
    clearInterval(frameTimerRef.current);
    
    if (animConfig.type !== 'gif') {
      const activeFramesCount = animConfig.frames;
      frameTimerRef.current = setInterval(() => {
        setFrame(f => {
          if (stateRef.current === 'Death' && f === activeFramesCount - 1) {
            clearInterval(frameTimerRef.current);
            return f; // stop at last frame
          }
          return (f + 1) % activeFramesCount;
        });
      }, animConfig.speed);
    }

    return () => clearInterval(frameTimerRef.current);
  }, [pet, state, isDead]);

  const getGroundY = (x, petWidth) => {
    let highestGround = window.innerHeight - TASKBAR_HEIGHT;
    // Check valid widgets (Currency, Friends, Rank)
    const widgets = document.querySelectorAll('.dashboard-currency-panel, .desktop-friends-widget, .desktop-focus-control-center');
    const petLeft = x;
    const petRight = x + petWidth;

    widgets.forEach(w => {
      const rect = w.getBoundingClientRect();
      // Check horizontal overlap
      if (petRight > rect.left && petLeft < rect.right) {
        // If the widget is above the taskbar and below the pet's current position (or we are falling on it)
        // Wait, since we calculate this every frame, if pet is above widget, widget top is ground
        // To prevent snapping from under a widget to its top, only consider it ground if pos.y <= rect.top
        if (rect.top < highestGround && posRef.current.y <= rect.top + 10) { // +10 grace margin
          highestGround = rect.top;
        }
      }
    });
    return highestGround - pet.height + 12;
  };

  // Physics & Behavior Loop
  useEffect(() => {
    if (!pet || isDead) return;

    let animationFrameId;

    const loop = () => {
      let { x, y } = posRef.current;
      let { x: vx, y: vy } = velRef.current;
      let s = stateRef.current;
      let d = dirRef.current;
      
      const groundY = getGroundY(x, pet.width * 1.5); // pet visually scaled by 1.5

      if (isDraggingRef.current) {
        // Handled by mouse move
      } else {
        // Gravity & Vertical Movement
        if (y < groundY || vy < 0) {
          vy += GRAVITY;
          y += vy;
          
          if (vy > 0 && s !== 'Hurt' && s !== 'Jump' && s !== 'Death') {
            setState('Hurt');
            s = 'Hurt';
          }
          
          // Landing logic
          if (vy > 0 && y >= groundY) {
            y = groundY;
            vy = 0;
            vx = 0; // stop horizontal momentum on land
            
            if (s === 'Hurt' || s === 'Jump') {
              // Hurt impact / Jump land
              if (Math.random() < 0.2 && pet.animations.Death && s === 'Hurt') {
                setState('Death');
                clearTimeout(deathTimerRef.current);
                deathTimerRef.current = setTimeout(() => {
                  setIsDead(true);
                  setTimeout(() => {
                    setIsDead(false);
                    setState('Idle');
                    setPos({ x: window.innerWidth / 2, y: -100 }); // respawn from sky
                  }, 5000);
                }, 1500);
                return;
              } else {
                // Stay hurt for a second on landing so the user can see it
                setTimeout(() => {
                  if (stateRef.current === 'Hurt' || stateRef.current === 'Jump') {
                    setState('Idle');
                  }
                }, 1000);
              }
            }
          }
        } else {
          y = groundY; // Snap to ground (if walked off edge, next frame will fall)
          vy = 0;
        }

        // Horizontal movement
        if (s === 'Walk' && targetRef.current === null) {
          x += (d === 'right' ? WALK_SPEED : -WALK_SPEED);
          if (x <= 0) {
            x = 0;
            setDir('right');
          } else if (x >= window.innerWidth - pet.width * 1.5) {
            x = window.innerWidth - pet.width * 1.5;
            setDir('left');
          }
        } else if (s === 'Walk' && targetRef.current) {
          // Move towards target
          const tx = targetRef.current.x;
          if (Math.abs(tx - x) < 5) {
            setState('Attack');
            setTimeout(() => {
               setState('Idle');
               targetRef.current = null;
            }, 2000);
          } else {
            if (tx > x) {
              x += WALK_SPEED;
              setDir('right');
            } else {
              x -= WALK_SPEED;
              setDir('left');
            }
          }
        } else if (s === 'Jump' || vy !== 0) {
          // Mid-air horizontal movement (if any)
          x += vx;
          if (x <= 0) { x = 0; vx = 0; }
          if (x >= window.innerWidth - pet.width * 1.5) { x = window.innerWidth - pet.width * 1.5; vx = 0; }
        }
      }

      if (!isDraggingRef.current) {
        setPos({ x, y });
        setVel({ x: vx, y: vy });
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [pet, isDead]);

  // AI Behavior
  useEffect(() => {
    if (!pet || isDead) return;

    let timeoutId;
    const scheduleNext = (delay) => {
      timeoutId = setTimeout(pickAction, delay);
    };

    const pickAction = () => {
      if (isDraggingRef.current || stateRef.current === 'Hurt' || stateRef.current === 'Death') {
        scheduleNext(1000);
        return;
      }

      const rand = Math.random();
      let nextState = 'Idle';
      let delay = 3000 + Math.random() * 2000; // default 3-5 seconds

      // Basic actions
      if (rand < 0.1 && pet.animations.Attack) {
        const widgets = document.querySelectorAll('.minigame-widget-container, .btn-start, .quest-widget');
        if (widgets.length > 0) {
          const targetEl = widgets[Math.floor(Math.random() * widgets.length)];
          const rect = targetEl.getBoundingClientRect();
          targetRef.current = { x: rect.left + rect.width / 2 - pet.width / 2 };
          nextState = 'Walk';
        }
      } else if (rand < 0.2 && pet.animations.Jump) {
         nextState = 'Jump';
         setVel({ x: dirRef.current === 'right' ? JUMP_SPEED_X : -JUMP_SPEED_X, y: JUMP_SPEED_Y });
         targetRef.current = null;
         const jumpFrames = pet.animations.Jump.frames;
         delay = (jumpFrames * pet.animations.Jump.speed) || 1000;
      } else if (rand < 0.4 && pet.animations.CarrotSkill) {
         nextState = 'CarrotSkill';
         targetRef.current = null;
         const skillFrames = pet.animations.CarrotSkill.frames;
         delay = (skillFrames * pet.animations.CarrotSkill.speed) || 2000;
      } else if (rand < 0.5 && pet.animations.Sleep) {
         nextState = 'Sleep';
         targetRef.current = null;
         delay = 5000 + Math.random() * 5000; // Sleep for 5-10s
      } else if (rand < 0.6 && pet.animations.Sitting) {
         nextState = 'Sitting';
         targetRef.current = null;
         delay = 4000;
      } else if (rand < 0.8) {
        nextState = 'Walk';
        if (Math.random() < 0.5) setDir(d => d === 'right' ? 'left' : 'right');
        targetRef.current = null;
        delay = 3000 + Math.random() * 2000;
      } else {
        nextState = 'Idle';
        targetRef.current = null;
      }

      setState(nextState);
      scheduleNext(delay);
    };

    scheduleNext(3000);

    return () => clearTimeout(timeoutId);
  }, [pet, isDead]);

  if (!pet || isDead) return null;

  const handlePointerDown = (e) => {
    setIsDragging(true);
    targetRef.current = null;
    e.target.setPointerCapture(e.pointerId);
    if (pet.animations.LieDown) {
      setState('LieDown');
    } else {
      setState('Idle'); // Don't hurt when grabbing
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPos(p => ({
      x: e.clientX - pet.width / 2,
      y: e.clientY - pet.height / 2
    }));
    // Do not set velocity here to prevent throwing momentum
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
    setState('Hurt');
    setVel({ x: 0, y: 0 }); // Reset velocity when dropped so it drops straight down
    
    // If dropped directly on the ground, ensure it recovers from Hurt state
    setTimeout(() => {
      if (stateRef.current === 'Hurt' && velRef.current.y === 0) {
        setState('Idle');
      }
    }, 1000);
  };

  if (!pet) return null;

  const animConfig = pet.animations[state] || pet.animations['Idle'];
  if (!animConfig) return null;

  const style = {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    width: pet.width,
    height: pet.height,
    backgroundImage: `url('${animConfig.fileUrl}')`,
    transform: `scale(1.5) scaleX(${dir === 'left' ? -1 : 1})`,
    transformOrigin: 'bottom center',
    zIndex: 9999,
    touchAction: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    imageRendering: 'pixelated',
    backgroundRepeat: 'no-repeat'
  };

  if (animConfig.type !== 'gif') {
    style.backgroundPosition = `-${frame * pet.width}px 0`;
  }

  return (
    <div 
      className="pet-overlay"
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
};

export default PetDeathOverlay;