/* ============ SOUND EFFECTS (PM-04) ============
   Implements synthesized sound effects using Web Audio API.
   R1: PM.sound.play(name) for correct, wrong, catch, evolve, tap
   R2: AudioContext created lazily on first user gesture and resumed if suspended
   R3: Master gain ≤ 0.2. Each sound ≤ 600 ms. wrong is soft, low, short blip.
       evolve is a rising arpeggio distinct from catch.
   R4: Subscribe to answer:correct, answer:wrong, catch:done (play evolve if evolved else catch)
   R5: Setting sound (default on). Absent AudioContext → silent, no error.
   R6: tap on keypad presses, quiet.
*/
(function(){
  var PM = window.PM || {};

  // Sound settings
  var MASTER_GAIN = 0.2; // Maximum master gain
  var MAX_SOUND_DURATION = 600; // ms

  // Read sound setting from PM settings
  var SOUND_ENABLED = true;
  if (PM.settings && typeof PM.settings.get === "function") {
    SOUND_ENABLED = PM.settings.get("sound") !== false;
  }

  // Audio context and state
  var audioContext = null;
  var masterGain = null;
  var isInitialized = false;

  // Sound effect configurations
  var sounds = {
    correct: {
      type: "sine",
      frequency: 880, // A5
      duration: 150,
      gain: 0.3
    },
    wrong: {
      type: "square",
      frequency: 220, // A3
      duration: 100,
      gain: 0.2
    },
    catch: {
      type: "sine",
      frequency: 440, // A4
      duration: 300,
      gain: 0.4
    },
    evolve: {
      type: "sine",
      frequency: 261.63, // C4
      duration: 500,
      gain: 0.5,
      // Rising arpeggio effect using multiple frequencies
      arpeggio: [261.63, 329.63, 392.00, 523.25], // C4, E4, G4, C5
      arpeggioDuration: 125
    },
    tap: {
      type: "sine",
      frequency: 523.25, // C5
      duration: 50,
      gain: 0.1
    }
  };

  // Initialize audio context on first user gesture
  function initAudioContext() {
    if (isInitialized) return;

    try {
      // Create AudioContext if it doesn't exist
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Create master gain node
      if (!masterGain) {
        masterGain = audioContext.createGain();
        masterGain.gain.value = MASTER_GAIN;
        masterGain.connect(audioContext.destination);
      }

      isInitialized = true;
    } catch (e) {
      // Silent failure if AudioContext creation fails
      console.warn("AudioContext not available:", e);
      isInitialized = false;
      audioContext = null;
      masterGain = null;
    }
  }

  // Play a sound effect
  function playSound(name) {
    // If sound is disabled, do nothing immediately
    if (!SOUND_ENABLED) return;

    // Initialize audio context if needed (but don't fail if not available)
    if (!isInitialized) {
      initAudioContext();
      // If initialization fails, we still continue - it's better to have silent mode than error
    }

    // If audio context isn't initialized or available, do nothing
    if (!isInitialized || !audioContext) return;

    try {
      var config = sounds[name];
      if (!config) return;

      // Resume audio context if suspended
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      // Create oscillator and gain node for this sound
      var oscillator = audioContext.createOscillator();
      var gainNode = audioContext.createGain();

      // Configure oscillator
      oscillator.type = config.type;
      oscillator.frequency.value = config.frequency;

      // Configure gain (volume)
      gainNode.gain.value = config.gain;

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);

      // Set up the sound to stop after its duration
      var startTime = audioContext.currentTime;
      var endTime = startTime + (config.duration / 1000);

      // For evolve sound, create arpeggio effect
      if (name === "evolve" && config.arpeggio) {
        playEvolveArpeggio(oscillator, gainNode, config, startTime);
      } else {
        // Simple single tone
        oscillator.start(startTime);
        oscillator.stop(endTime);
      }

      // Clean up nodes after playback
      oscillator.onended = function() {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
      };

    } catch (e) {
      console.warn("Failed to play sound:", name, e);
    }
  }

  // Play evolve arpeggio effect
  function playEvolveArpeggio(oscillator, gainNode, config, startTime) {
    var frequencies = config.arpeggio;
    var duration = config.arpeggioDuration;

    // Create a sequence of tones for the arpeggio
    for (var i = 0; i < frequencies.length; i++) {
      var freq = frequencies[i];
      var time = startTime + (i * duration / 1000);

      // Create a new oscillator for each tone in the sequence
      var seqOsc = audioContext.createOscillator();
      var seqGain = audioContext.createGain();

      seqOsc.type = config.type;
      seqOsc.frequency.value = freq;
      seqGain.gain.value = config.gain * (0.7 + (i * 0.3 / frequencies.length)); // Volume fades in

      seqOsc.connect(seqGain);
      seqGain.connect(masterGain);

      seqOsc.start(time);
      seqOsc.stop(time + duration / 1000);

      seqOsc.onended = function() {
        try {
          seqOsc.disconnect();
          seqGain.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    }

    // Stop the main oscillator at the end of the sequence
    oscillator.stop(startTime + (frequencies.length * duration / 1000));
  }

  // Initialize sound system on first user interaction
  function handleUserInteraction() {
    initAudioContext();
    document.removeEventListener("touchstart", handleUserInteraction);
    document.removeEventListener("mousedown", handleUserInteraction);
    document.removeEventListener("keydown", handleUserInteraction);
  }

  // Setup event listeners for audio initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      document.addEventListener("touchstart", handleUserInteraction);
      document.addEventListener("mousedown", handleUserInteraction);
      document.addEventListener("keydown", handleUserInteraction);
    });
  } else {
    document.addEventListener("touchstart", handleUserInteraction);
    document.addEventListener("mousedown", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);
  }

  // Setup event listeners for sound effects
  if (PM.on) {
    // Subscribe to answer events
    PM.on("answer:correct", function() {
      playSound("correct");
    });

    PM.on("answer:wrong", function() {
      playSound("wrong");
    });

    // Subscribe to catch event
    PM.on("catch:done", function(data) {
      if (data && data.evolved) {
        playSound("evolve");
      } else {
        playSound("catch");
      }
    });

    // Listen for settings changes
    PM.on("settings:change", function(payload) {
      if (payload.key === "sound") {
        SOUND_ENABLED = payload.value !== false;
      }
    });
  }

  // Export sound API
  if (!PM.sound) {
    PM.sound = {
      play: playSound,
      enable: function(enabled) {
        SOUND_ENABLED = enabled;
      },
      isEnabled: function() {
        return SOUND_ENABLED;
      }
    };
  }

  window.PM = PM;

  // Add tap sound support for keypad presses
  if (typeof pressKey === 'function') {
    var originalPressKey = pressKey;
    pressKey = function(d) {
      if (SOUND_ENABLED) {
        playSound("tap");
      }
      return originalPressKey(d);
    };
  }
})();