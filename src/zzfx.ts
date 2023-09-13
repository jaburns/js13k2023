// --------------------------------------------------------
// ZzFXMicro - Zuper Zmall Zound Zynth - v1.1.8
// https://github.com/KilledByAPixel/ZzFX

declare const webkitAudioContext: any;

let zzfxV = .3;    // volume
let zzfxR = 44100; // sample rate
let zzfxX = new (window.AudioContext||webkitAudioContext); // audio context

export let zzfxP = (samples:number[])=>  // play samples
{
    // create buffer and source
    let buffer = zzfxX.createBuffer(1, samples.length, zzfxR),
        source = zzfxX.createBufferSource();

    // copy samples to buffer and play
    buffer.getChannelData(0).set(samples);
    source.buffer = buffer;
    source.connect(zzfxX.destination);
    source.start();
    return source;
}

let zzfxG = // generate samples
(
    // parameters
    volume = 1, randomness = .05, frequency = 220, attack = 0, sustain = 0,
    release = .1, shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0,
    pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0,
    bitCrush = 0, delay = 0, sustainVolume = 1, decay = 0, tremolo = 0
): number[]=>
{
    // init parameters
    let PI2 = Math.PI*2,
    sign = (v:number) => v>0?1:-1,
    startSlide = slide *= 500 * PI2 / zzfxR / zzfxR,
    startFrequency = frequency *= (1 + randomness*2*Math.random() - randomness)
        * PI2 / zzfxR,
    b=[], t=0, tm=0, i=0, j=1, r=0, c=0, s=0, f, length;

    // scale by sample rate
    attack = attack * zzfxR + 9; // minimum attack to prevent pop
    decay *= zzfxR;
    sustain *= zzfxR;
    release *= zzfxR;
    delay *= zzfxR;
    deltaSlide *= 500 * PI2 / zzfxR**3;
    modulation *= PI2 / zzfxR;
    pitchJump *= PI2 / zzfxR;
    pitchJumpTime *= zzfxR;
    repeatTime = repeatTime * zzfxR | 0;

    // generate waveform
    for(length = attack + decay + sustain + release + delay | 0;
        i < length; b[i++] = s)
    {
        if (!(++c%(bitCrush*100|0)))                      // bit crush
        {
            s = shape? shape>1? shape>2? shape>3?         // wave shape
                Math.sin((t%PI2)**3) :                    // 4 noise
                Math.max(Math.min(Math.tan(t),1),-1):     // 3 tan
                1-(2*t/PI2%2+2)%2:                        // 2 saw
                1-4*Math.abs(Math.round(t/PI2)-t/PI2):    // 1 triangle
                Math.sin(t);                              // 0 sin

            s = (repeatTime ?
                    1 - tremolo + tremolo*Math.sin(PI2*i/repeatTime) // tremolo
                    : 1) *
                sign(s)*(Math.abs(s)**shapeCurve) *       // curve 0=square, 2=pointy
                volume * zzfxV * (                        // envelope
                i < attack ? i/attack :                   // attack
                i < attack + decay ?                      // decay
                1-((i-attack)/decay)*(1-sustainVolume) :  // decay falloff
                i < attack  + decay + sustain ?           // sustain
                sustainVolume :                           // sustain volume
                i < length - delay ?                      // release
                (length - i - delay)/release *            // release falloff
                sustainVolume :                           // release volume
                0);                                       // post release

            s = delay ? s/2 + (delay > i ? 0 :            // delay
                (i<length-delay? 1 : (length-i)/delay) *  // release delay
                b[i-delay|0]/2) : s;                      // sample delay
        }

        f = (frequency += slide += deltaSlide) *          // frequency
            Math.cos(modulation*tm++);                    // modulation
        t += f - f*noise*(1 - (Math.sin(i)+1)*1e9%2);     // noise

        if (j && ++j > pitchJumpTime)       // pitch jump
        {
            frequency += pitchJump;         // apply pitch jump
            startFrequency += pitchJump;    // also apply to start
            j = 0;                          // reset pitch jump time
        }

        if (repeatTime && !(++r % repeatTime)) // repeat
        {
            frequency = startFrequency;     // reset frequency
            slide = startSlide;             // reset slide
            j = j || 1;                     // reset pitch jump time
        }
    }

    return b;
}

// --------------------------------------------------------
// sound defs:

export let sndGround = zzfxG(...[1.27,,478,.02,.02,.06,1,2.75,,,,,,.9,45,.5,,.59,,.26])
export let sndShoot = zzfxG(...[1.37,,827,.02,.01,.32,4,4.22,,.5,,,,1.7,,.6,,.47])
export let sndCastle = zzfxG(...[2,.1,185,.03,,.61,4,4,,,,,,1,,1,.5,.8,.1,.1])
export let sndWin = zzfxG(...[2.11,0,97.99886,.08,.7,.34,,1.92,-0.5,10,50,.02,.12,,,.1,.06,.17,.01,.66])
export let sndLose = zzfxG(...[2.11,0,261.6256,.08,.76,.35,,1.92,,,-50,-0.01,.2,,,.1,.06,.27,.09,.2])
