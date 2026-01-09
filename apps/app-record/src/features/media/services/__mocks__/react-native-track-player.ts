// Mock for react-native-track-player
export const AndroidAudioContentType = {
  Speech: 'speech',
  Music: 'music',
  Movie: 'movie',
  Sonification: 'sonification',
} as const;

export const IOSCategory = {
  Playback: 'playback',
  Record: 'record',
  PlayAndRecord: 'playAndRecord',
  AudioProcessing: 'audioProcessing',
  MultiRoute: 'multiRoute',
} as const;

export const IOSCategoryMode = {
  Default: 'default',
  GameChat: 'gameChat',
  Measurement: 'measurement',
  MoviePlayback: 'moviePlayback',
  SpokenAudio: 'spokenAudio',
  VideoChat: 'videoChat',
  VideoRecording: 'videoRecording',
  VoiceChat: 'voiceChat',
} as const;

export const Capability = {
  Play: 'play',
  Pause: 'pause',
  Stop: 'stop',
  SeekTo: 'seekTo',
  SkipToNext: 'skipToNext',
  SkipToPrevious: 'skipToPrevious',
} as const;

export const AppKilledPlaybackBehavior = {
  ContinuePlayback: 'continue-playback',
  StopPlaybackAndRemoveNotification: 'stop-playback-and-remove-notification',
} as const;

export const Event = {
  RemotePlay: 'remote-play',
  RemotePause: 'remote-pause',
  RemoteStop: 'remote-stop',
  RemoteNext: 'remote-next',
  RemotePrevious: 'remote-previous',
  RemoteSeek: 'remote-seek',
  PlaybackState: 'playback-state',
  PlaybackTrackChanged: 'playback-track-changed',
  PlaybackQueueEnded: 'playback-queue-ended',
} as const;

export const State = {
  None: 'none',
  Ready: 'ready',
  Playing: 'playing',
  Paused: 'paused',
  Stopped: 'stopped',
  Buffering: 'buffering',
  Loading: 'loading',
  Error: 'error',
} as const;

export const RepeatMode = {
  Off: 'off',
  Track: 'track',
  Queue: 'queue',
} as const;

// Mock TrackPlayer methods
const mockTrackPlayer = {
  setupPlayer: jest.fn().mockResolvedValue(undefined),
  updateOptions: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockResolvedValue(undefined),
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  seekTo: jest.fn().mockResolvedValue(undefined),
  skipToNext: jest.fn().mockResolvedValue(undefined),
  skipToPrevious: jest.fn().mockResolvedValue(undefined),
  setRepeatMode: jest.fn().mockResolvedValue(undefined),
  getCurrentTrack: jest.fn().mockResolvedValue(null),
  getQueue: jest.fn().mockResolvedValue([]),
  getState: jest.fn().mockResolvedValue(State.Ready),
  getPosition: jest.fn().mockResolvedValue(0),
  getDuration: jest.fn().mockResolvedValue(0),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  removeAllListeners: jest.fn(),
};

export default mockTrackPlayer;
