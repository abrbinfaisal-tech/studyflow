import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Timer, 
  Watch, 
  CheckCircle2, 
  Sparkles, 
  Coffee, 
  Flame, 
  Flag, 
  Sliders,
  CloudRain
} from 'lucide-react';
import { sound } from '../utils/audio';
import { StorageService } from '../services/storage';
import confetti from 'canvas-confetti';

type TimerMode = 'pomodoro' | 'stopwatch';
type PomodoroPhase = 'focus' | 'break';

export const FocusToolsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TimerMode>('pomodoro');

  // Pomodoro settings
  const [focusDuration, setFocusDuration] = useState(25); // minutes
  const [breakDuration, setBreakDuration] = useState(5); // minutes
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('focus');
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroTopic, setPomodoroTopic] = useState('Deep Work & Exam Revision');
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);

  // Stopwatch state
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const [stopwatchTopic, setStopwatchTopic] = useState('Timed Practice Questions');

  // Audio & Ambient settings
  const [ambientSound, setAmbientSound] = useState<'off' | 'rain' | 'white'>('off');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Pomodoro Interval
  useEffect(() => {
    let interval: any = null;
    if (isPomodoroRunning) {
      interval = setInterval(() => {
        setPomodoroSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handlePomodoroComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPomodoroRunning, pomodoroPhase, focusDuration, breakDuration, pomodoroTopic]);

  // Stopwatch Interval
  useEffect(() => {
    let interval: any = null;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  const handlePomodoroComplete = () => {
    setIsPomodoroRunning(false);
    if (soundEnabled) {
      sound.playChime();
    }

    if (pomodoroPhase === 'focus') {
      // Log session to progress
      StorageService.logStudySession(focusDuration, pomodoroTopic, 'pomodoro');
      setCompletedSessionsCount(prev => prev + 1);

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#6366f1', '#10b981'],
        });
      } catch (e) {}

      // Switch to break
      setPomodoroPhase('break');
      setPomodoroSecondsLeft(breakDuration * 60);
    } else {
      // Break finished, back to focus
      setPomodoroPhase('focus');
      setPomodoroSecondsLeft(focusDuration * 60);
    }
  };

  const togglePomodoro = () => {
    sound.playTick();
    setIsPomodoroRunning(!isPomodoroRunning);
  };

  const resetPomodoro = () => {
    sound.playTick();
    setIsPomodoroRunning(false);
    setPomodoroPhase('focus');
    setPomodoroSecondsLeft(focusDuration * 60);
  };

  const setPresetDuration = (fMins: number, bMins: number) => {
    setFocusDuration(fMins);
    setBreakDuration(bMins);
    setPomodoroPhase('focus');
    setPomodoroSecondsLeft(fMins * 60);
    setIsPomodoroRunning(false);
  };

  // Stopwatch actions
  const toggleStopwatch = () => {
    sound.playTick();
    setIsStopwatchRunning(!isStopwatchRunning);
  };

  const resetStopwatch = () => {
    sound.playTick();
    setIsStopwatchRunning(false);
    setStopwatchSeconds(0);
    setLaps([]);
  };

  const recordLap = () => {
    setLaps(prev => [stopwatchSeconds, ...prev]);
  };

  const saveStopwatchToProgress = () => {
    if (stopwatchSeconds < 60) return;
    const mins = Math.round(stopwatchSeconds / 60);
    StorageService.logStudySession(mins, stopwatchTopic, 'stopwatch');
    resetStopwatch();
    try {
      confetti({ particleCount: 50, spread: 60 });
    } catch (e) {}
  };

  const handleToggleAmbient = (type: 'rain' | 'white' | 'off') => {
    setAmbientSound(type);
    sound.toggleAmbient(type);
  };

  // Format MM:SS or HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Circular progress calculation
  const totalSecondsInPhase = pomodoroPhase === 'focus' ? focusDuration * 60 : breakDuration * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalSecondsInPhase - pomodoroSecondsLeft) / totalSecondsInPhase) * 100));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-white shadow-lg shadow-purple-950/40">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Focus & Productivity Tools
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Precision Timing
              </span>
            </h2>
            <p className="text-xs text-slate-400">Time-block your study sessions, stay in flow, and track uninterrupted study hours</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('pomodoro')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pomodoro'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Pomodoro</span>
          </button>
          <button
            onClick={() => setActiveTab('stopwatch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'stopwatch'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Watch className="w-3.5 h-3.5" />
            <span>Stopwatch</span>
          </button>
        </div>
      </div>

      {/* Main Focus Tool Container */}
      <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-purple-500/30 shadow-2xl relative overflow-hidden text-center space-y-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {activeTab === 'pomodoro' ? (
          /* Pomodoro UI */
          <div className="space-y-6 relative z-10">
            {/* Phase Badge & Topic Input */}
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm transition-all"
                style={{
                  backgroundColor: pomodoroPhase === 'focus' ? 'rgba(147, 51, 234, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  borderColor: pomodoroPhase === 'focus' ? 'rgba(147, 51, 234, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                  color: pomodoroPhase === 'focus' ? '#c084fc' : '#34d399',
                }}
              >
                {pomodoroPhase === 'focus' ? (
                  <>
                    <Flame className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                    <span>Focus Phase ({focusDuration}m)</span>
                  </>
                ) : (
                  <>
                    <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recharge Break ({breakDuration}m)</span>
                  </>
                )}
              </div>

              <input
                type="text"
                value={pomodoroTopic}
                onChange={e => setPomodoroTopic(e.target.value)}
                placeholder="What are you focusing on?"
                className="text-center text-xs bg-slate-950/60 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-1.5 text-slate-200 outline-none max-w-sm w-full transition-all"
              />
            </div>

            {/* Circular Timer Visual */}
            <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="stroke-slate-800"
                  strokeWidth="5"
                  fill="transparent"
                />
                {/* Progress Glow Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className={pomodoroPhase === 'focus' ? 'stroke-purple-500' : 'stroke-emerald-400'}
                  strokeWidth="5"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center">
                <span className="font-mono text-5xl font-black text-white tracking-tight drop-shadow-md">
                  {formatTime(pomodoroSecondsLeft)}
                </span>
                <span className="text-[11px] text-purple-300/80 font-medium mt-1">
                  {isPomodoroRunning ? 'In Session' : 'Paused'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={resetPomodoro}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all shadow-md"
                title="Reset timer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={togglePomodoro}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-950/60 flex items-center gap-2 transition-all transform active:scale-95"
              >
                {isPomodoroRunning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>Pause Session</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Focus Session</span>
                  </>
                )}
              </button>
            </div>

            {/* Presets */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-slate-400 font-medium mr-1">Presets:</span>
              <button
                onClick={() => setPresetDuration(25, 5)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                  focusDuration === 25 ? 'bg-purple-950 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Standard (25m / 5m)
              </button>
              <button
                onClick={() => setPresetDuration(50, 10)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                  focusDuration === 50 ? 'bg-purple-950 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Deep Work (50m / 10m)
              </button>
              <button
                onClick={() => setPresetDuration(90, 15)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                  focusDuration === 90 ? 'bg-purple-950 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Ultra Exam (90m / 15m)
              </button>
            </div>
          </div>
        ) : (
          /* Stopwatch UI */
          <div className="space-y-6 relative z-10">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-purple-300">Continuous Practice Timing</span>
              <input
                type="text"
                value={stopwatchTopic}
                onChange={e => setStopwatchTopic(e.target.value)}
                placeholder="Subject / Practice set..."
                className="text-center text-xs bg-slate-950/60 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-1.5 text-slate-200 outline-none max-w-sm w-full"
              />
            </div>

            {/* Large stopwatch numbers */}
            <div className="py-8">
              <span className="font-mono text-6xl font-black text-white tracking-tight drop-shadow-lg">
                {formatTime(stopwatchSeconds)}
              </span>
            </div>

            {/* Stopwatch controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={resetStopwatch}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all shadow-md"
                title="Reset stopwatch"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={toggleStopwatch}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-950/60 flex items-center gap-2 transition-all transform active:scale-95"
              >
                {isStopwatchRunning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Timer</span>
                  </>
                )}
              </button>

              {isStopwatchRunning && (
                <button
                  onClick={recordLap}
                  className="p-3 rounded-2xl bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:text-white transition-all shadow-md"
                  title="Record lap"
                >
                  <Flag className="w-5 h-5" />
                </button>
              )}
            </div>

            {stopwatchSeconds > 60 && !isStopwatchRunning && (
              <button
                onClick={saveStopwatchToProgress}
                className="px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Log {Math.round(stopwatchSeconds / 60)} mins to My Progress
              </button>
            )}

            {/* Lap list */}
            {laps.length > 0 && (
              <div className="max-w-md mx-auto pt-4 border-t border-slate-800 text-left space-y-1">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Recorded Laps:</span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {laps.map((lapSec, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-purple-300 font-medium">Lap #{laps.length - idx}</span>
                      <span className="font-mono text-slate-200">{formatTime(lapSec)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ambient Sound & Audio Alerts Footer */}
        <div className="pt-6 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-purple-400" />
              Focus Ambient Sound:
            </span>
            <button
              onClick={() => handleToggleAmbient('off')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                ambientSound === 'off' ? 'bg-purple-950 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 hover:text-white'
              }`}
            >
              Muted
            </button>
            <button
              onClick={() => handleToggleAmbient('rain')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                ambientSound === 'rain' ? 'bg-purple-950 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 hover:text-white'
              }`}
            >
              Rainfall Ambience
            </button>
            <button
              onClick={() => handleToggleAmbient('white')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                ambientSound === 'white' ? 'bg-purple-950 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 hover:text-white'
              }`}
            >
              Binaural White Noise
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-purple-300 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-slate-600" />}
              <span>Chime Alert: {soundEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
