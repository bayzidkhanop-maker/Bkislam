export type SoundType = 
  | 'click' 
  | 'success' 
  | 'error' 
  | 'notification' 
  | 'messageSend' 
  | 'messageReceive' 
  | 'callRing' 
  | 'callConnect' 
  | 'callDisconnect' 
  | 'achievement';

export interface SoundSettings {
  enabled: boolean;
  masterVolume: number;
  notificationsVolume: number;
  chatVolume: number;
  callsVolume: number;
  muteCategories: Record<string, boolean>;
  doNotDisturb: boolean;
  dndStartHour: number;
  dndEndHour: number;
}

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  masterVolume: 80,
  notificationsVolume: 80,
  chatVolume: 80,
  callsVolume: 100,
  muteCategories: {},
  doNotDisturb: false,
  dndStartHour: 22,
  dndEndHour: 7,
};

// Sound asset URLs (optimized mp3/webm from public free CDNs or generated synthetically using WebAudio)
const SOUND_URLS: Record<SoundType, string> = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
  notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  messageSend: 'https://assets.mixkit.co/active_storage/sfx/238/238-preview.mp3',
  messageReceive: 'https://assets.mixkit.co/active_storage/sfx/239/239-preview.mp3',
  callRing: 'https://assets.mixkit.co/active_storage/sfx/2972/2972-preview.mp3',
  callConnect: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3',
  callDisconnect: 'https://assets.mixkit.co/active_storage/sfx/2976/2976-preview.mp3',
  achievement: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'
};

class SoundManager {
  private settings: SoundSettings = DEFAULT_SETTINGS;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private lastPlayTime: Map<string, number> = new Map();
  private activeLoops: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    this.loadSettings();
    this.preloadCriticalSounds();
    
    // Auto-pause loops when tab is hidden
    if (typeof document !== 'undefined') {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
           this.pauseAllLoops();
        } else {
           // Resuming might be tricky contextually, better left paused 
           // until triggered again.
        }
      });
    }
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem('appSoundSettings');
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch(e) {}
  }

  public saveSettings(newSettings: Partial<SoundSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('appSoundSettings', JSON.stringify(this.settings));
  }

  public getSettings() {
    return this.settings;
  }

  private isDNDActive(): boolean {
    if (!this.settings.doNotDisturb) return false;
    const hour = new Date().getHours();
    const { dndStartHour, dndEndHour } = this.settings;
    if (dndStartHour > dndEndHour) { // e.g. 22 to 7
      return hour >= dndStartHour || hour < dndEndHour;
    }
    return hour >= dndStartHour && hour < dndEndHour;
  }

  private preloadCriticalSounds() {
     const critical: SoundType[] = ['click', 'notification', 'messageReceive', 'callRing'];
     critical.forEach(type => this.getAudioElement(type));
  }

  private getAudioElement(type: SoundType): HTMLAudioElement {
     if (this.audioCache.has(type)) {
       return this.audioCache.get(type)!;
     }
     const audio = new Audio(SOUND_URLS[type]);
     audio.preload = 'auto';
     this.audioCache.set(type, audio);
     return audio;
  }

  private getCategoryVolume(type: SoundType): number {
    switch (type) {
      case 'messageSend':
      case 'messageReceive':
        return this.settings.chatVolume;
      case 'callRing':
      case 'callConnect':
      case 'callDisconnect':
        return this.settings.callsVolume;
      case 'notification':
        return this.settings.notificationsVolume;
      default:
        return 100; // UI effects use max category, scaled by master
    }
  }

  public play(type: SoundType, loop: boolean = false) {
     if (!this.settings.enabled) return;
     if (this.isDNDActive() && type !== 'callRing' && type !== 'click') return; // let calls ring even in DND unless customized

     
     // Cooldown system to prevent spamming
     const now = Date.now();
     const lastTime = this.lastPlayTime.get(type) || 0;
     if (now - lastTime < 100 && !loop) return; // 100ms cooldown for same sound
     this.lastPlayTime.set(type, now);

     const masterVol = this.settings.masterVolume / 100;
     const catVol = this.getCategoryVolume(type) / 100;
     const finalVolume = masterVol * catVol;

     if (finalVolume <= 0) return;

     try {
       const audio = this.getAudioElement(type);
       // Clone node for overlapping sounds unless it's a loop
       const playableAudio = loop ? audio : (audio.cloneNode() as HTMLAudioElement);
       
       playableAudio.volume = finalVolume;
       playableAudio.loop = loop;
       
       const playPromise = playableAudio.play();
       if (playPromise !== undefined) {
         playPromise.catch(e => {
            // Autoplay blocked
            console.warn("Audio autoplay blocked by browser", e);
         });
       }

       if (loop) {
          this.activeLoops.set(type, playableAudio);
       }
     } catch (e) {
       console.error("Audio engine error:", e);
     }
  }

  public stop(type: SoundType) {
    if (this.activeLoops.has(type)) {
      const audio = this.activeLoops.get(type)!;
      audio.pause();
      audio.currentTime = 0;
      this.activeLoops.delete(type);
    }
  }

  private pauseAllLoops() {
     this.activeLoops.forEach(audio => {
        audio.pause();
     });
  }
}

export const soundService = new SoundManager();
