/* --- SYSTEM SOUND EFFECTS ENGINE --- */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSystemSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'hover') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        oscillator.start(now);
        oscillator.stop(now + 0.05);

    } else if (type === 'click') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.1);

        gainNode.gain.setValueAtTime(0.05, now); // 5% volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }
}
function initSoundEffects() {
    const interactiveElements = document.querySelectorAll('button, .window-controls span, a, input');

    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => playSystemSound('hover'));
        el.addEventListener('click', () => playSystemSound('click'));
    });
}

document.addEventListener('DOMContentLoaded', initSoundEffects);