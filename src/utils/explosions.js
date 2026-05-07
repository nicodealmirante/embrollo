import confetti from 'canvas-confetti';

export const triggerMolotovExplosion = (x, y) => {
  const duration = 800;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 25, spread: 360, ticks: 60, zIndex: 100 };

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 40 * (timeLeft / duration);
    const colors = ['#ff0000', '#ff4500', '#ff8c00', '#ffa500', '#ffd700', '#222222']; // Fire colors + some dark smoke

    confetti(Object.assign({}, defaults, {
      particleCount,
      colors: colors,
      origin: { x: x !== undefined ? x : 0.5, y: y !== undefined ? y : 0.5 },
      shapes: ['square', 'circle'],
      scalar: 1.2,
      gravity: 0.8,
      drift: 0
    }));
  }, 100);
};