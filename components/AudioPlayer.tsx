import React, { useState, useEffect, useRef } from 'react';
import { decodeAudioData } from '../services/audioUtils';

interface AudioPlayerProps {
  audioBase64: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioBase64 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Track playback timing
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Audio
  useEffect(() => {
    const initAudio = async () => {
      if (!audioBase64) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }
        
        // Decode buffer
        const buffer = await decodeAudioData(audioBase64, audioContextRef.current);
        audioBufferRef.current = buffer;
        setDuration(buffer.duration);
        
        // Reset state
        offsetRef.current = 0;
        setCurrentTime(0);
        setIsPlaying(false);
      } catch (e) {
        console.error("Failed to decode audio", e);
        setError("Unable to play audio. The format might not be supported.");
      } finally {
        setIsLoading(false);
      }
    };

    initAudio();

    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audioBase64]);

  // Update Progress Loop
  useEffect(() => {
    const updateProgress = () => {
      if (isPlaying && audioContextRef.current) {
        const now = audioContextRef.current.currentTime;
        const elapsed = (now - startTimeRef.current) * playbackRate;
        const current = offsetRef.current + elapsed;

        if (current >= duration) {
          handleEnded();
        } else {
          setCurrentTime(current);
          animationFrameRef.current = requestAnimationFrame(updateProgress);
        }
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, duration, playbackRate]);

  const playAudio = () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    try {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.playbackRate.value = playbackRate;
      source.connect(audioContextRef.current.destination);
      
      // Start playing from stored offset
      source.start(0, offsetRef.current);
      
      sourceNodeRef.current = source;
      startTimeRef.current = audioContextRef.current.currentTime;
      setIsPlaying(true);
    } catch (err) {
      console.error("Playback error:", err);
      setError("Playback failed. Please try again.");
      setIsPlaying(false);
    }
  };

  const pauseAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }
    
    if (audioContextRef.current && isPlaying) {
      // Calculate exactly where we stopped
      const now = audioContextRef.current.currentTime;
      const elapsed = (now - startTimeRef.current) * playbackRate;
      offsetRef.current = Math.min(offsetRef.current + elapsed, duration);
      setCurrentTime(offsetRef.current);
    }
    
    setIsPlaying(false);
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleEnded = () => {
    stopAudio();
    offsetRef.current = 0;
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (error) return;
    
    if (isPlaying) {
      pauseAudio();
    } else {
      // If finished, restart
      if (Math.abs(duration - offsetRef.current) < 0.1) {
        offsetRef.current = 0;
        setCurrentTime(0);
      }
      playAudio();
    }
  };

  const cycleSpeed = () => {
    if (error) return;
    
    const speeds = [0.75, 1, 1.25];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newRate = speeds[nextIdx];

    // If playing, adjust time tracking so progress bar doesn't jump
    if (isPlaying && audioContextRef.current && sourceNodeRef.current) {
      const now = audioContextRef.current.currentTime;
      const elapsedSinceStart = now - startTimeRef.current;
      
      // "Bake" the previous progress into the offset
      offsetRef.current = offsetRef.current + (elapsedSinceStart * playbackRate);
      
      // Reset start time to now
      startTimeRef.current = now;
      
      // Update the live node immediately
      try {
        sourceNodeRef.current.playbackRate.setValueAtTime(newRate, now);
      } catch (err) {
        console.error("Speed change error", err);
      }
    }

    setPlaybackRate(newRate);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) return;

    const newTime = parseFloat(e.target.value);
    offsetRef.current = newTime;
    setCurrentTime(newTime);

    if (isPlaying) {
      // Restart playback from new position
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
      }
      playAudio();
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-5 text-red-600 border border-red-100 shadow-sm flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <span className="text-sm font-medium">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-blue-600 rounded-xl p-5 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
           <h3 className="font-bold text-lg leading-tight">Listen to Explanation</h3>
           <p className="text-blue-100 text-xs mt-1">Spoken clearly and slowly</p>
        </div>
        <button 
          onClick={cycleSpeed}
          className="bg-blue-700/50 hover:bg-blue-700 border border-blue-500 hover:border-blue-400 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all"
        >
          {playbackRate}x Speed
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className={`
            w-14 h-14 flex items-center justify-center bg-white rounded-full text-blue-600 shadow-md hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all flex-shrink-0
            ${isLoading ? 'opacity-75 cursor-wait' : ''}
          `}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isLoading ? (
             <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        
        <div className="flex-1 space-y-1.5">
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            step="0.1"
            value={currentTime} 
            onChange={handleSeek}
            disabled={isLoading || duration === 0}
            className="w-full h-1.5 bg-blue-800/50 rounded-lg appearance-none cursor-pointer accent-white hover:accent-blue-100 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-blue-100 font-medium tabular-nums px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;