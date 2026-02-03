import { useEffect, useRef, useCallback, useState } from "react";
import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";

interface UsePlayoutAudioOptions {
  settings: PlayoutSettings | undefined;
  isActivated: boolean;
  state: "kabelkrant" | "video" | "iframe" | "raadsvergadering:waiting" | "raadsvergadering:playing";
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** When true, the iframe has no audio so radio can continue playing */
  iframeMuted?: boolean;
}

interface UsePlayoutAudioReturn {
  microphoneEnabled: boolean;
  setupMicrophone: () => Promise<void>;
  setupAudioStream: (streamUrl: string) => Promise<void>;
  disableMicrophone: () => void;
  toggleAudio: () => void;
  setupVideoAudio: () => void;
}

export function usePlayoutAudio({ settings, isActivated, state, videoRef, iframeMuted = true }: UsePlayoutAudioOptions): UsePlayoutAudioReturn {
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const videoGainNodeRef = useRef<GainNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const videoAudioSetupRef = useRef<boolean>(false);
  const stateRef = useRef(state);

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Fade audio: radio/mic fades out when video or iframe (with audio) starts
  useEffect(() => {
    const fadeTimeMs = settings?.audioCrossfadeDuration ?? 1500;
    const fadeTime = fadeTimeMs / 1000;
    const currentTime = audioContextRef.current?.currentTime || 0;

    // Fade radio/mic audio:
    // - Always mute during video playback
    // - Mute during raadsvergadering:playing (it has its own audio), but NOT during :waiting
    // - During iframe: mute radio if iframeMuted is true (iframe wants silence from radio)
    if (gainNodeRef.current && microphoneEnabled) {
      const shouldMuteForIframe = state === "iframe" && iframeMuted;
      const shouldMuteRadio = state === "video" || state === "raadsvergadering:playing" || shouldMuteForIframe;
      const radioTargetGain = shouldMuteRadio ? 0 : 1;
      gainNodeRef.current.gain.cancelScheduledValues(currentTime);
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(radioTargetGain, currentTime + fadeTime);
      console.log(`[Playout] Fading radio/mic from ${gainNodeRef.current.gain.value} to ${radioTargetGain} over ${fadeTime}s (state: ${state}, iframeMuted: ${iframeMuted})`);
    }

    // Fade video audio
    if (videoGainNodeRef.current) {
      const videoTargetGain = state === "video" ? 1 : 0;
      videoGainNodeRef.current.gain.cancelScheduledValues(currentTime);
      videoGainNodeRef.current.gain.setValueAtTime(videoGainNodeRef.current.gain.value, currentTime);
      videoGainNodeRef.current.gain.linearRampToValueAtTime(videoTargetGain, currentTime + fadeTime);
      console.log(`[Playout] Fading video audio from ${videoGainNodeRef.current.gain.value} to ${videoTargetGain} over ${fadeTime}s`);
    }
  }, [state, microphoneEnabled, settings?.audioCrossfadeDuration]);

  // Setup video audio routing through gain node for fade control
  const setupVideoAudio = useCallback(() => {
    if (!videoRef.current || videoAudioSetupRef.current) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const videoSource = audioContextRef.current.createMediaElementSource(videoRef.current);
      videoGainNodeRef.current = audioContextRef.current.createGain();
      videoGainNodeRef.current.gain.value = stateRef.current === "video" ? 1 : 0;

      videoSource.connect(videoGainNodeRef.current);
      videoGainNodeRef.current.connect(audioContextRef.current.destination);

      videoAudioSetupRef.current = true;
      console.log("[Playout] Video audio routing setup complete");
    } catch (error) {
      console.error("[Playout] Error setting up video audio:", error);
    }
  }, [videoRef]);

  // Setup video audio when activated
  useEffect(() => {
    if (isActivated && videoRef.current && !videoAudioSetupRef.current) {
      setTimeout(() => {
        setupVideoAudio();
      }, 100);
    }
  }, [isActivated, setupVideoAudio, videoRef]);

  // Setup microphone audio passthrough with gain control
  const setupMicrophone = useCallback(async () => {
    try {
      // Request microphone WITHOUT audio processing (causes robotic distortion)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext();

      const source = audioContextRef.current.createMediaStreamSource(stream);
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = stateRef.current === "video" ? 0 : 1;

      source.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);

      setMicrophoneEnabled(true);
      console.log("[Playout] Microphone enabled with gain control");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Kon geen toegang krijgen tot de microfoon. Controleer de browser permissies.");
    }
  }, []);

  // Setup audio stream with gain control
  const setupAudioStream = useCallback(async (streamUrl: string) => {
    try {
      console.log("[Playout] Setting up audio stream:", streamUrl);

      const audioElement = new Audio();
      audioElement.crossOrigin = "anonymous";
      audioElement.src = streamUrl;
      audioElementRef.current = audioElement;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaElementSource(audioElement);
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = stateRef.current === "video" ? 0 : 1;

      source.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);

      await audioElement.play();

      setMicrophoneEnabled(true);
      console.log("[Playout] Audio stream enabled with gain control");
    } catch (error) {
      console.error("Error setting up audio stream:", error);
      alert("Kon de audio stream niet starten. Controleer de URL.");
    }
  }, []);

  const disableMicrophone = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = "";
      audioElementRef.current = null;
    }
    gainNodeRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicrophoneEnabled(false);
    console.log("[Playout] Audio disabled");
  }, []);

  const toggleAudio = useCallback(() => {
    if (microphoneEnabled) {
      disableMicrophone();
    } else if (settings?.audioSource === "stream" && settings?.audioStreamUrl) {
      setupAudioStream(settings.audioStreamUrl);
    } else {
      setupMicrophone();
    }
  }, [microphoneEnabled, settings, disableMicrophone, setupAudioStream, setupMicrophone]);

  // Auto-start audio source when activated based on settings
  useEffect(() => {
    if (!isActivated || !settings || microphoneEnabled) return;

    console.log("[Playout] Auto-starting audio source:", settings.audioSource);

    if (settings.audioSource === "microphone") {
      setupMicrophone();
    } else if (settings.audioSource === "stream" && settings.audioStreamUrl) {
      setupAudioStream(settings.audioStreamUrl);
    }
  }, [isActivated, settings, microphoneEnabled, setupMicrophone, setupAudioStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    microphoneEnabled,
    setupMicrophone,
    setupAudioStream,
    disableMicrophone,
    toggleAudio,
    setupVideoAudio,
  };
}
