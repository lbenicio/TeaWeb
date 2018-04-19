enum PlayerState {
    PREBUFFERING,
    PLAYING,
    BUFFERING,
    STOPPING,
    STOPPED
}

class AudioController {
    private static _globalContext: AudioContext;
    private static _audioInstances: AudioController[] = [];
    private static _globalReplayScheduler: NodeJS.Timer;
    private static _timeIndex: number = 0;

    static get globalContext() : AudioContext {
        if(this._globalContext) return this._globalContext;
        this._globalContext = new AudioContext();
        return this._globalContext;
    }

    static initializeAudioController() {
        //this._globalReplayScheduler = setInterval(() => { AudioController.invokeNextReplay(); }, 20); //Fix me
    }

    /*
    private static joinTracks(tracks: AudioBuffer[]) : Promise<AudioBuffer> {
        let length = Math.max.apply(Math, tracks.map(e => e.length));
        if(length == 0 || tracks.length == 0) return new Promise<AudioBuffer>((resolve, reject) => {}); //Do nothink

        let context = new OfflineAudioContext(2, length, 44100);
        //let context = new OfflineAudioContext(tracks[0].numberOfChannels, tracks[0].length, tracks[0].sampleRate);

        tracks.forEach(track => {
            let player = context.createBufferSource();
            player.buffer = track;
            player.connect(context.destination);
            player.start(0);
        });

        return context.startRendering();
    }

    static invokeNextReplay() {
        let replay: {controller: AudioController,buffer: AudioBuffer}[] = [];

        for(let instance of this._audioInstances)
            if(instance.playerState == PlayerState.PLAYING || instance.playerState == PlayerState.STOPPING) {
                let entry = {controller: instance, buffer: instance.audioCache.pop_front() };
                instance.flagPlaying = !!entry.buffer;
                instance.testBufferQueue();
                if(!!entry.buffer) replay.push(entry);
            } else if(instance.flagPlaying) {
                instance.flagPlaying = false;
                instance.testBufferQueue();
            }


        this.joinTracks(replay.map(e => e.buffer)).then(buffer => {
            if(this._timeIndex < this._globalContext.currentTime) {
                this._timeIndex = this._globalContext.currentTime;
                console.log("Resetting time index!");
            }
            //console.log(buffer.length + "|" + buffer.duration);
            //console.log(buffer);

            let player = this._globalContext.createBufferSource();
            player.buffer = buffer;
            player.connect(this._globalContext.destination);
            player.start(this._timeIndex);

            this._timeIndex += buffer.duration;
        });
    }
    */

    speakerContext: AudioContext;
    private playerState: PlayerState = PlayerState.STOPPED;
    private audioCache: AudioBuffer[] = [];
    private playingAudioCache: AudioBufferSourceNode[] = [];
    private _volume: number = 1;
    private _codecCache: CodecClientCache[] = [];
    private _timeIndex: number = 0;
    private _latencyBufferLength: number = 3;
    allowBuffering: boolean = true;

    //Events
    onSpeaking: () => void;
    onSilence: () => void;

    constructor() {
        this.speakerContext = AudioController.globalContext;

        this.onSpeaking = function () { };
        this.onSilence = function () { };
    }

    public initialize() {
        AudioController._audioInstances.push(this);
    }

    public close(){
        AudioController._audioInstances.remove(this);
    }

    playBuffer(buffer: AudioBuffer) {
        if (buffer.sampleRate != this.speakerContext.sampleRate)
            console.warn("[AudioController] Source sample rate isn't equal to playback sample rate! (" + buffer.sampleRate + " | " + this.speakerContext.sampleRate + ")");

        this.applyVolume(buffer);
        this.audioCache.push(buffer);
        if(this.playerState == PlayerState.STOPPED || this.playerState == PlayerState.STOPPING) {
            console.log("[Audio] Starting new playback");
            this.playerState = PlayerState.PREBUFFERING;
            //New audio
        }


        switch (this.playerState) {
            case PlayerState.PREBUFFERING:
            case PlayerState.BUFFERING:
                if(this.audioCache.length <= this._latencyBufferLength) {
                    if(this.playerState == PlayerState.BUFFERING) {
                        if(this.allowBuffering) break;
                    } else break;
                }
                if(this.playerState == PlayerState.PREBUFFERING) {
                    console.log("[Audio] Prebuffering succeeded (Replaying now)");
                    this.onSpeaking();
                } else {
                    if(this.allowBuffering)
                        console.log("[Audio] Buffering succeeded (Replaying now)");
                }
                this.playerState = PlayerState.PLAYING;
            case PlayerState.PLAYING:
                this.playQueue();
                break;
            default:
                break;
        }
    }

    private playQueue() {
        let buffer: AudioBuffer;
        while(buffer = this.audioCache.pop_front()) {
            if(this._timeIndex < this.speakerContext.currentTime) this._timeIndex = this.speakerContext.currentTime;

            let player = this.speakerContext.createBufferSource();
            player.buffer = buffer;

            player.onended = () => this.removeNode(player);
            this.playingAudioCache.push(player);

            player.connect(this.speakerContext.destination);
            player.start(this._timeIndex);
            this._timeIndex += buffer.duration;
         }
    }

    private removeNode(node: AudioBufferSourceNode) {
        this.playingAudioCache.remove(node);
        this.testBufferQueue();
    }

    stopAudio(now: boolean = false) {
        this.playerState = PlayerState.STOPPING;
        if(now) {
            this.playerState = PlayerState.STOPPED;
            this.audioCache = [];

            for(let entry of this.playingAudioCache)
                entry.stop(0);
            this.playingAudioCache = [];
        }
        this.testBufferQueue();
    }

    private testBufferQueue() {
        if(this.audioCache.length == 0 && this.playingAudioCache.length == 0) {
            if(this.playerState != PlayerState.STOPPING) {
                this.playerState = PlayerState.BUFFERING;
                if(!this.allowBuffering)
                    console.warn("[Audio] Detected a buffer underflow!");
            } else {
                this.playerState = PlayerState.STOPPED;
                this.onSilence();
            }
        }
    }

    get volume() : number { return this._volume; }

    set volume(val: number) {
        if(this._volume == val) return;
        this._volume = val;
        for(let buffer of this.audioCache)
            this.applyVolume(buffer);
    }

    private applyVolume(buffer: AudioBuffer) {
        for(let channel = 0; channel < buffer.numberOfChannels; channel++) {
            let data = buffer.getChannelData(channel);
            for(let sample = 0; sample < data.length; sample++) {
                let lane = data[sample];
                lane *= this._volume;
                data[sample] = lane;
            }
        }
    }

    codecCache(codec: number) : CodecClientCache {
        while(this._codecCache.length <= codec)
            this._codecCache.push(new CodecClientCache());
        return this._codecCache[codec];
    }
}