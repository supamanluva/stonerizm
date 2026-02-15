const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
}

// ===== VERTEX SHADER =====
const vsSource = `
    attribute vec4 aVertexPosition;
    varying vec2 vUv;
    void main(void) {
        gl_Position = aVertexPosition;
        vUv = aVertexPosition.xy * 0.5 + 0.5;
    }
`;

// ===== FRAGMENT SHADER - MAMMOTH DOOM CORE =====
const fsSource = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_audio;
    uniform float u_mode;
    uniform float u_hyper;
    uniform sampler2D u_webcam;
    uniform float u_webcamEnabled;
    uniform sampler2D u_prevFrame;

    // Doom-reactive uniforms
    uniform float u_bass;
    uniform float u_mid;
    uniform float u_high;
    uniform float u_doomMode;
    uniform float u_riffPhase;
    uniform float u_noteFreq;
    uniform float u_noteOn;
    uniform float u_riffFlash;
    uniform float u_kick;
    uniform float u_snare;

    varying vec2 vUv;

    mat2 rot(float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c);
    }

    vec3 palette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.263, 0.416, 0.557);
        return a + b * cos(6.28318 * (c * t + d));
    }

    // Doom palette - deep purples, burnt orange, blood red, void black
    vec3 doomPalette(float t, float bass) {
        vec3 a = vec3(0.15, 0.02, 0.08);
        vec3 b = vec3(0.55, 0.15, 0.3);
        vec3 c = vec3(0.8, 0.5, 0.3);
        vec3 d = vec3(0.0, 0.1, 0.2);
        vec3 base = a + b * cos(6.28318 * (c * t + d));
        base += vec3(0.5, 0.15, 0.0) * bass;
        return base;
    }

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
        vec2 uv0 = uv;
        vec3 finalColor = vec3(0.0);

        vec2 m = u_mouse * 2.0 - 1.0;

        float speed = 0.2;
        if (u_hyper > 0.5) speed = 2.0;

        if (u_doomMode > 0.5) {
            speed = 0.08 + u_bass * 0.06;
        }

        float time = u_time * speed;
        float audio = u_audio * 0.1;

        // ===== MAMMOTH STOMP - KICK SHOCKWAVE =====
        if (u_doomMode > 0.5 && u_kick > 0.01) {
            // Radial shockwave from center - earth cracking underfoot
            float dist = length(uv);
            float waveRadius = (1.0 - u_kick) * 2.5;
            float waveWidth = 0.15 + u_kick * 0.2;
            float wave = smoothstep(waveWidth, 0.0, abs(dist - waveRadius));
            wave *= u_kick;

            // Displacement: push UVs outward from the stomp
            vec2 dir = normalize(uv + 0.001);
            uv += dir * wave * 0.12 * u_kick;

            // Ground tremor - shake everything
            float tremor = u_kick * 0.015;
            uv.x += sin(uv.y * 30.0 + time * 50.0) * tremor;
            uv.y += cos(uv.x * 25.0 + time * 40.0) * tremor;
        }

        // ===== DOOM BASS BREATHING =====
        if (u_doomMode > 0.5) {
            float breath = u_bass * 0.22 + u_kick * 0.1;
            uv *= 1.0 - breath;

            // Heavier sludge/smoke displacement
            float smokeScale = 2.5 + u_riffPhase * 2.0;
            float smokeAmt = 0.08 * u_bass + 0.03 + u_kick * 0.04;
            float sx = fbm(uv * smokeScale + time * 0.25) * smokeAmt;
            float sy = fbm(uv * smokeScale + time * 0.25 + 50.0) * smokeAmt;
            uv += vec2(sx, sy);
        }

        if (u_mode > 2.5) {
            // ===== MODE 3: SPACE VOID TRAVEL =====
            for (float i = 1.0; i < 6.0; i++) {
                float depth = fract(i * 0.2 + time * 0.1 + m.y * 0.5);
                float scale = mix(20.0, 0.5, depth);
                float fade = smoothstep(0.0, 0.3, depth) * smoothstep(1.0, 0.8, depth);

                vec2 starUV = uv * scale + i * 453.2;
                vec2 id = floor(starUV);
                vec2 gv = fract(starUV) - 0.5;

                float r = random(id);
                if (r > 0.95) {
                    float starSize = sin(time * 5.0 + r * 10.0) * 0.1 + audio;
                    if (u_doomMode > 0.5) starSize += u_bass * 0.3 + u_kick * 0.5;
                    float star = 0.05 / length(gv);
                    star *= starSize * fade;

                    vec3 starCol = (u_doomMode > 0.5) ?
                        doomPalette(r + i * 0.2 + time * 0.1, u_bass) :
                        palette(r + i * 0.2 + time * 0.1);
                    finalColor += starCol * star;
                }

                if (r > 0.985) {
                    float type = fract(r * 123.45);
                    if (type > 0.5) {
                        float size = 0.2 + fract(r * 10.0) * 0.2;
                        float planetDist = length(gv) - size;
                        float planet = 0.015 / abs(planetDist);
                        if (type > 0.85) {
                            float ringDist = abs(length(gv * vec2(1.0, 2.0)) - (size + 0.2));
                            planet += 0.01 / abs(ringDist);
                        }
                        planet += smoothstep(size, size + 0.1, length(gv)) * 0.1;

                        vec3 pCol;
                        if (u_doomMode > 0.5) {
                            if (type > 0.9) pCol = vec3(0.5, 0.0, 0.3);
                            else if (type > 0.8) pCol = vec3(0.9, 0.3, 0.0);
                            else if (type > 0.7) pCol = vec3(0.7, 0.0, 0.0);
                            else pCol = vec3(0.3, 0.0, 0.25);
                        } else {
                            if (type > 0.9) pCol = vec3(0.2, 0.5, 1.0);
                            else if (type > 0.8) pCol = vec3(1.0, 0.6, 0.2);
                            else if (type > 0.7) pCol = vec3(0.9, 0.2, 0.2);
                            else pCol = vec3(0.4, 0.8, 0.4);
                        }

                        float shadow = smoothstep(-size, size, gv.x + gv.y);
                        finalColor += pCol * planet * fade * (1.0 + audio + u_bass) * shadow;
                    } else {
                        float angle = atan(gv.y, gv.x);
                        float radius = length(gv);
                        float def = sin(angle * 5.0 + time) * 0.05;
                        float astDist = radius - (0.15 + def);
                        float ast = 0.02 / abs(astDist);
                        vec3 aCol = (u_doomMode > 0.5) ? vec3(0.5, 0.2, 0.1) : vec3(0.6, 0.5, 0.4);
                        finalColor += aCol * ast * fade * (0.8 + audio * 2.0);
                    }
                }
            }
        } else {
            // ===== MODES 0-2: FRACTAL INFINITY =====
            for (float i = 0.0; i < 4.0; i++) {
                float doomFold = 0.0;
                if (u_doomMode > 0.5) {
                    doomFold = sin(u_riffPhase * 6.28318 + i * 1.5) * 0.12 * (0.5 + u_bass);
                    // Kick makes geometry crunch inward
                    doomFold += u_kick * 0.15;
                }

                if (u_mode < 0.5) {
                    uv = fract(uv * (1.5 + doomFold)) - 0.5;
                    float rotSpd = (u_doomMode > 0.5) ? 0.06 + u_bass * 0.3 + u_kick * 0.4 : 0.2;
                    uv *= rot(time * rotSpd + i * 0.5 + audio);
                } else if (u_mode < 1.5) {
                    uv = fract(uv * (1.2 + doomFold)) - 0.5;
                    uv = abs(uv);
                    float rotSpd = (u_doomMode > 0.5) ? 0.12 + u_bass * 0.4 + u_kick * 0.5 : 0.4;
                    uv *= rot(time * rotSpd + i);
                } else {
                    float waveAmt = (u_doomMode > 0.5) ? 0.3 + u_bass * 0.25 + u_kick * 0.15 : 0.2;
                    uv = fract(uv * (1.5 + sin(time) * waveAmt + doomFold)) - 0.5;
                    float rotSpd = (u_doomMode > 0.5) ? 0.03 + u_mid * 0.12 : 0.1;
                    uv *= rot(time * rotSpd);
                    float warpStr = (u_doomMode > 0.5) ? 0.1 + u_bass * 0.18 + u_kick * 0.12 : 0.1;
                    uv += sin(uv.yx * (4.0 + u_bass * 5.0) + time) * warpStr;
                }

                float d = length(uv) * exp(-length(uv0));

                vec3 col;
                if (u_doomMode > 0.5) {
                    float doomT = length(uv0) + i * 0.4 + time * 0.15 + u_noteFreq * 3.0 + u_riffPhase * 0.5;
                    col = doomPalette(doomT, u_bass);
                    // Note onset flash
                    col += vec3(0.4, 0.15, 0.02) * u_noteOn * (1.0 + u_bass);
                    // Riff change flash
                    col += vec3(0.3, 0.1, 0.05) * u_riffFlash;
                    // KICK FLASH - mammoth stomp fire
                    col += vec3(0.6, 0.2, 0.0) * u_kick * u_kick;
                    // SNARE CRACK - brief white flash
                    col += vec3(0.3, 0.25, 0.2) * u_snare;
                } else {
                    col = palette(length(uv0) + i * 0.4 + time * 0.4 + m.x * 2.0 + audio);
                }

                if (u_hyper > 0.5) col = 1.0 - col;

                if (u_mode < 0.5) {
                    float audioMod = (u_doomMode > 0.5) ? u_bass * 18.0 + u_kick * 8.0 : audio * 10.0;
                    d = sin(d * (8.0 + m.y * 10.0 + audioMod) + time) / 8.0;
                } else if (u_mode < 1.5) {
                    float sharpness = (u_doomMode > 0.5) ? 10.0 + u_mid * 6.0 + u_kick * 4.0 : 12.0;
                    d = sin(d * sharpness + time) / 8.0;
                    d = smoothstep(0.0, 0.1, d);
                } else {
                    float softness = (u_doomMode > 0.5) ? 5.0 + u_bass * 3.0 + u_kick * 2.0 : 6.0;
                    d = sin(d * softness + time + m.y * 5.0) / 6.0;
                }

                d = abs(d);

                float glowPower = (u_hyper > 0.5) ? 1.5 : 1.2;
                if (u_doomMode > 0.5) {
                    glowPower = 1.0 + u_bass * 0.5 + u_noteOn * 0.2 + u_kick * 0.4;
                }
                d = pow(0.01 / d, glowPower);

                finalColor += col * d;
            }
        }

        // ===== MAMMOTH STOMP AFTERGLOW =====
        if (u_doomMode > 0.5 && u_kick > 0.01) {
            float dist = length(uv0);
            float waveR = (1.0 - u_kick) * 2.2;
            float ring = smoothstep(0.12, 0.0, abs(dist - waveR)) * u_kick;
            // Fiery ring expanding outward
            vec3 stompColor = mix(vec3(0.8, 0.3, 0.0), vec3(0.4, 0.0, 0.0), dist);
            finalColor += stompColor * ring * 1.5;

            // Central impact glow
            float centralGlow = exp(-dist * 3.0) * u_kick * u_kick;
            finalColor += vec3(0.5, 0.15, 0.0) * centralGlow;
        }

        // ===== DOOM VIGNETTE - THE VOID BREATHES =====
        if (u_doomMode > 0.5) {
            float vig = length(uv0) * 0.5;
            vig = smoothstep(0.15, 1.4, vig);
            float vigStrength = 0.5 + (1.0 - u_noteOn) * 0.3 - u_bass * 0.2 - u_kick * 0.15;
            vigStrength = clamp(vigStrength, 0.08, 0.8);
            finalColor *= 1.0 - vig * vigStrength;

            // Heavier smoke overlay
            float smokeOverlay = fbm(uv0 * 3.5 + time * 0.15);
            float smokeOverlay2 = fbm(uv0 * 6.0 - time * 0.1 + 100.0);
            float smoke = mix(smokeOverlay, smokeOverlay2, 0.5);
            finalColor += vec3(0.08, 0.02, 0.0) * smoke * (u_bass * 0.6 + u_kick * 0.3);

            // Dust particles kicked up by mammoth stomps
            if (u_kick > 0.2) {
                float dust = fbm(uv0 * 12.0 + time * 2.0) * u_kick * 0.15;
                finalColor += vec3(0.3, 0.15, 0.05) * dust;
            }
        }

        // Webcam
        if (u_webcamEnabled > 0.5) {
            vec2 webcamUV = uv0 * 0.5 + 0.5;
            webcamUV += finalColor.xy * 0.1 * (1.0 + audio * 5.0);
            vec3 webcamColor = texture2D(u_webcam, webcamUV).rgb;
            finalColor = mix(webcamColor, finalColor, 0.5);
        }

        // ===== FEEDBACK LOOP (THE SLUDGE TRAIL) =====
        vec2 feedbackUV = vUv;
        feedbackUV -= 0.5;

        float fbZoom = 0.99;
        float fbAngle = 0.005 * sin(time);

        if (u_doomMode > 0.5) {
            fbZoom = 0.993 - u_bass * 0.014 - u_kick * 0.008;
            fbAngle = 0.003 * sin(time * 0.3) + u_bass * 0.006 + u_kick * 0.012;
        }

        feedbackUV *= fbZoom;
        float s = sin(fbAngle);
        float c = cos(fbAngle);
        feedbackUV = vec2(feedbackUV.x * c - feedbackUV.y * s, feedbackUV.x * s + feedbackUV.y * c);
        feedbackUV += 0.5;

        vec3 prevColor = texture2D(u_prevFrame, feedbackUV).rgb;

        float decay = (u_hyper > 0.5) ? 0.8 : 0.96;
        if (u_doomMode > 0.5) {
            // Heavier sludge trails, kicks leave longer afterimages
            decay = 0.88 + u_bass * 0.06 + u_kick * 0.04;
        }

        finalColor = mix(finalColor, prevColor, decay);

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// ===== SHADER COMPILATION =====
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    },
    uniformLocations: {
        resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
        time: gl.getUniformLocation(shaderProgram, 'u_time'),
        mouse: gl.getUniformLocation(shaderProgram, 'u_mouse'),
        audio: gl.getUniformLocation(shaderProgram, 'u_audio'),
        mode: gl.getUniformLocation(shaderProgram, 'u_mode'),
        hyper: gl.getUniformLocation(shaderProgram, 'u_hyper'),
        webcam: gl.getUniformLocation(shaderProgram, 'u_webcam'),
        webcamEnabled: gl.getUniformLocation(shaderProgram, 'u_webcamEnabled'),
        prevFrame: gl.getUniformLocation(shaderProgram, 'u_prevFrame'),
        bass: gl.getUniformLocation(shaderProgram, 'u_bass'),
        mid: gl.getUniformLocation(shaderProgram, 'u_mid'),
        high: gl.getUniformLocation(shaderProgram, 'u_high'),
        doomMode: gl.getUniformLocation(shaderProgram, 'u_doomMode'),
        riffPhase: gl.getUniformLocation(shaderProgram, 'u_riffPhase'),
        noteFreq: gl.getUniformLocation(shaderProgram, 'u_noteFreq'),
        noteOn: gl.getUniformLocation(shaderProgram, 'u_noteOn'),
        riffFlash: gl.getUniformLocation(shaderProgram, 'u_riffFlash'),
        kick: gl.getUniformLocation(shaderProgram, 'u_kick'),
        snare: gl.getUniformLocation(shaderProgram, 'u_snare'),
    },
};

// ===== BUFFERS =====
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

// ===== FRAMEBUFFERS FOR FEEDBACK LOOP =====
let canvasWidth = gl.canvas.width;
let canvasHeight = gl.canvas.height;

function createTexture(width, height) {
    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return targetTexture;
}

function createFramebuffer(texture) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return fb;
}

let textureA = createTexture(canvasWidth, canvasHeight);
let textureB = createTexture(canvasWidth, canvasHeight);
let fboA = createFramebuffer(textureA);
let fboB = createFramebuffer(textureB);

function resizeFramebuffers() {
    if (canvasWidth !== gl.canvas.width || canvasHeight !== gl.canvas.height) {
        canvasWidth = gl.canvas.width;
        canvasHeight = gl.canvas.height;
        textureA = createTexture(canvasWidth, canvasHeight);
        textureB = createTexture(canvasWidth, canvasHeight);
        fboA = createFramebuffer(textureA);
        fboB = createFramebuffer(textureB);
    }
}

// ===== AUDIO CONTEXT =====
let audioContext;
let audioAnalyser;
let audioDataArray;
let hasMicStarted = false;

let webcamStream = null;
let webcamVideo = document.createElement('video');
webcamVideo.autoplay = true;
webcamVideo.muted = true;
webcamVideo.loop = true;
let hasWebcamStarted = false;

const webcamTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, webcamTexture);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

function ensureAudioContext() {
    if (audioContext) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    audioContext = new AC();
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 256;
    audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
}

function initMic() {
    if (hasMicStarted) return;
    ensureAudioContext();

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(function (stream) {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(audioAnalyser);
            hasMicStarted = true;
            document.body.classList.add('active');
            console.log("🎤 Mic enabled!");
        })
        .catch(function (err) {
            console.error('Error accessing microphone:', err);
        });
}

function initWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            webcamVideo.srcObject = stream;
            webcamVideo.play();
            hasWebcamStarted = true;
            isWebcam = 1.0;
            console.log("📷 Webcam ON");
        })
        .catch(err => {
            console.error(err);
            alert("Webcam error! Check permissions.");
        });
}

// =====================================================
// ===== DROP D STONER DOOM SYNTH ENGINE =============
// =====================================================

// Drop D tuning note frequencies (Hz)
const N = {
    D1: 36.71, A1: 55.00, D2: 73.42, Eb2: 77.78, E2: 82.41,
    F2: 87.31, Gb2: 92.50, G2: 98.00, Ab2: 103.83, A2: 110.00,
    Bb2: 116.54, B2: 123.47, C3: 130.81, Db3: 138.59, D3: 146.83,
    E3: 164.81, F3: 174.61, G3: 196.00,
};

// Drum hit types: K=kick, S=snare, H=hihat, C=crash, O=open hat, 0=rest
// Drum patterns are arrays of hits per 16th note grid, same length as note pattern total dur

// ===== RIFF LIBRARY - MAMMOTH DOOM =====
const RIFFS = [
    {
        name: "MAMMOTH MARCH",
        bpm: 42,
        repeats: 3,
        visualMode: 2,
        pattern: [
            { freq: N.D2, dur: 8 },
            { freq: 0, dur: 4 },
            { freq: N.D2, dur: 4, pm: true },
            { freq: N.D2, dur: 8 },
            { freq: 0, dur: 4 },
            { freq: N.F2, dur: 4 },
            { freq: N.Eb2, dur: 8 },
            { freq: N.D2, dur: 8 },
            { freq: 0, dur: 4 },
            { freq: N.D2, dur: 4, pm: true },
            { freq: N.D2, dur: 8 },
        ],
        // 64 16th notes
        drums: "K00H00S0K00H00S0K00H00S0K0K0S0H0K00H00S0K00H00S0K00H00S0K0K0S000",
    },
    {
        name: "TECTONIC CRAWL",
        bpm: 38,
        repeats: 2,
        visualMode: 0,
        pattern: [
            { freq: N.D1, dur: 16 },
            { freq: 0, dur: 4 },
            { freq: N.D2, dur: 8 },
            { freq: N.Eb2, dur: 4 },
            { freq: N.D1, dur: 16 },
            { freq: 0, dur: 4 },
            { freq: N.G2, dur: 8 },
            { freq: N.F2, dur: 4 },
        ],
        // 64 16th notes - sparse mammoth stomps
        drums: "K000000000000000S000K000000H000K000000000000000S000K00000K0S0000",
    },
    {
        name: "SABBATH WORSHIP",
        bpm: 52,
        repeats: 3,
        visualMode: 0,
        pattern: [
            { freq: N.D2, dur: 6 },
            { freq: 0, dur: 2 },
            { freq: N.D2, dur: 2 },
            { freq: N.Eb2, dur: 2 },
            { freq: N.E2, dur: 2 },
            { freq: N.F2, dur: 2 },
            { freq: N.F2, dur: 6 },
            { freq: 0, dur: 2 },
            { freq: N.F2, dur: 2 },
            { freq: N.E2, dur: 2 },
            { freq: N.Eb2, dur: 2 },
            { freq: N.D2, dur: 2 },
        ],
        // 32 16th notes
        drums: "K00H00S0K0H0K0S0K00H00S0K0K0S0H0",
    },
    {
        name: "DOPETHRONE",
        bpm: 48,
        repeats: 4,
        visualMode: 1,
        pattern: [
            { freq: N.D2, dur: 4 },
            { freq: N.D2, dur: 2, pm: true },
            { freq: N.D2, dur: 2, pm: true },
            { freq: 0, dur: 2 },
            { freq: N.F2, dur: 4 },
            { freq: N.G2, dur: 4 },
            { freq: N.F2, dur: 4 },
            { freq: N.D2, dur: 6 },
            { freq: 0, dur: 4 },
        ],
        // 32 16th notes
        drums: "K00HK0K000S0K00HK00H00S0K0K0S000",
    },
    {
        name: "WIZARD'S BONG",
        bpm: 44,
        repeats: 2,
        visualMode: 3,
        pattern: [
            { freq: N.D2, dur: 16 },
            { freq: N.Bb2, dur: 8 },
            { freq: N.A2, dur: 8 },
            { freq: N.G2, dur: 8 },
            { freq: N.F2, dur: 8 },
            { freq: N.D2, dur: 16 },
        ],
        // 64 16th notes - huge slow cymbal swells
        drums: "C000000000000000K000S000000H000K000000000000000K000S0000000K0S000",
    },
    {
        name: "COSMIC SLUDGE",
        bpm: 40,
        repeats: 3,
        visualMode: 2,
        pattern: [
            { freq: N.D2, dur: 8 },
            { freq: 0, dur: 2 },
            { freq: N.G2, dur: 8 },
            { freq: 0, dur: 2 },
            { freq: N.D2, dur: 6 },
            { freq: N.F2, dur: 2 },
            { freq: N.Bb2, dur: 6 },
            { freq: N.A2, dur: 6 },
            { freq: 0, dur: 4 },
        ],
        // 44 16th notes
        drums: "K00H00S0H0K00H00S0H0K0S0H0K00H00S0K0K0S00000",
    },
    {
        name: "IRON MONOLITH",
        bpm: 56,
        repeats: 4,
        visualMode: 0,
        pattern: [
            { freq: N.D2, dur: 3, pm: true },
            { freq: N.D2, dur: 3, pm: true },
            { freq: 0, dur: 2 },
            { freq: N.F2, dur: 4 },
            { freq: N.G2, dur: 4 },
            { freq: N.A2, dur: 4 },
            { freq: N.G2, dur: 4 },
            { freq: N.F2, dur: 4 },
            { freq: N.D2, dur: 4 },
        ],
        // 32 16th notes
        drums: "K0SK0S00K00H00S0K00H00S0K0K0S0H0",
    },
    {
        name: "PRIMORDIAL OOZE",
        bpm: 36,
        repeats: 2,
        visualMode: 2,
        pattern: [
            { freq: N.D1, dur: 12 },
            { freq: N.D2, dur: 4 },
            { freq: N.Eb2, dur: 8 },
            { freq: N.D2, dur: 8 },
            { freq: 0, dur: 4 },
            { freq: N.D1, dur: 12 },
            { freq: N.D2, dur: 4 },
            { freq: N.G2, dur: 8 },
            { freq: N.F2, dur: 4 },
            { freq: N.D2, dur: 8 },
        ],
        // 72 16th notes - extremely slow, enormous
        drums: "K00000000000K000K000S000K000000K0000000000000K000K000S000K00000K0K0000000",
    },
    {
        name: "EARTHQUAKE RITUAL",
        bpm: 46,
        repeats: 3,
        visualMode: 1,
        pattern: [
            { freq: N.D2, dur: 4 },
            { freq: N.D2, dur: 4, pm: true },
            { freq: N.D2, dur: 4 },
            { freq: N.D2, dur: 4, pm: true },
            { freq: N.Gb2, dur: 8 },
            { freq: N.G2, dur: 4 },
            { freq: N.F2, dur: 4 },
            { freq: N.D2, dur: 4 },
            { freq: N.D2, dur: 4, pm: true },
            { freq: N.D2, dur: 4 },
            { freq: N.D2, dur: 4, pm: true },
            { freq: N.Ab2, dur: 4 },
            { freq: N.G2, dur: 4 },
            { freq: N.F2, dur: 4 },
            { freq: N.Eb2, dur: 4 },
        ],
        // 64 16th notes - ritual stomps
        drums: "K00SK00SK00SK00SK000000SK00SK00SK00SK00SK00SK00SK000S000K00SK0S0",
    },
    {
        name: "LEVIATHAN DIRGE",
        bpm: 34,
        repeats: 2,
        visualMode: 3,
        pattern: [
            { freq: N.D1, dur: 24 },
            { freq: N.A1, dur: 16 },
            { freq: N.D1, dur: 24 },
        ],
        // 64 16th notes - ultra sparse, ocean-depth slow
        drums: "K00000000000000000000000S0000000K0000000000000000K000000000S00000",
    },
];

// =====================================================
// ===== DOOM DRUM MACHINE ============================
// =====================================================

class DoomDrums {
    constructor(ctx, analyser) {
        this.ctx = ctx;
        this.analyser = analyser;

        // Drum bus with its own processing chain
        this.drumBus = this.ctx.createGain();
        this.drumBus.gain.value = 0.55;

        // Compressor to glue the drums together
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -20;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 6;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.15;

        // Drum room reverb (convolver)
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.15;
        this.reverbDelay = this.ctx.createDelay(0.5);
        this.reverbDelay.delayTime.value = 0.12;
        this.reverbFeedback = this.ctx.createGain();
        this.reverbFeedback.gain.value = 0.3;
        this.reverbFilter = this.ctx.createBiquadFilter();
        this.reverbFilter.type = 'lowpass';
        this.reverbFilter.frequency.value = 2000;

        // Wire drum chain
        this.drumBus.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
        this.compressor.connect(this.analyser);

        // Reverb send
        this.drumBus.connect(this.reverbDelay);
        this.reverbDelay.connect(this.reverbFilter);
        this.reverbFilter.connect(this.reverbFeedback);
        this.reverbFeedback.connect(this.reverbDelay);
        this.reverbFilter.connect(this.reverbGain);
        this.reverbGain.connect(this.compressor);

        // Visual state
        this.kickValue = 0;
        this.snareValue = 0;
    }

    // KICK DRUM - mammoth footfall
    // Deep sine pitch sweep + sub rumble + transient click
    playKick(startTime) {
        // Sub oscillator - the mammoth stomp
        const kickOsc = this.ctx.createOscillator();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(120, startTime);
        kickOsc.frequency.exponentialRampToValueAtTime(28, startTime + 0.5);

        const kickGain = this.ctx.createGain();
        kickGain.gain.setValueAtTime(1.0, startTime);
        kickGain.gain.setValueAtTime(0.9, startTime + 0.04);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);

        // Sub rumble - one octave lower for floor shake
        const subOsc = this.ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(60, startTime);
        subOsc.frequency.exponentialRampToValueAtTime(18, startTime + 0.6);

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.7, startTime);
        subGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

        // Transient click/snap (noise burst)
        const clickDur = 0.015;
        const clickBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * clickDur), this.ctx.sampleRate);
        const clickData = clickBuf.getChannelData(0);
        for (let i = 0; i < clickData.length; i++) {
            clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (clickData.length * 0.1));
        }
        const clickSrc = this.ctx.createBufferSource();
        clickSrc.buffer = clickBuf;
        const clickGain = this.ctx.createGain();
        clickGain.gain.value = 0.35;
        const clickFilter = this.ctx.createBiquadFilter();
        clickFilter.type = 'bandpass';
        clickFilter.frequency.value = 3500;
        clickFilter.Q.value = 0.8;

        // Earth rumble - low noise tail
        const rumbleDur = 0.3;
        const rumbleBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * rumbleDur), this.ctx.sampleRate);
        const rumbleData = rumbleBuf.getChannelData(0);
        for (let i = 0; i < rumbleData.length; i++) {
            rumbleData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rumbleData.length * 0.3));
        }
        const rumbleSrc = this.ctx.createBufferSource();
        rumbleSrc.buffer = rumbleBuf;
        const rumbleGain = this.ctx.createGain();
        rumbleGain.gain.setValueAtTime(0.12, startTime);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, startTime + rumbleDur);
        const rumbleFilter = this.ctx.createBiquadFilter();
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.value = 200;

        // Connect everything
        kickOsc.connect(kickGain);
        kickGain.connect(this.drumBus);

        subOsc.connect(subGain);
        subGain.connect(this.drumBus);

        clickSrc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(this.drumBus);

        rumbleSrc.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(this.drumBus);

        kickOsc.start(startTime);
        kickOsc.stop(startTime + 0.8);
        subOsc.start(startTime);
        subOsc.stop(startTime + 0.9);
        clickSrc.start(startTime);
        rumbleSrc.start(startTime);

        // Visual trigger
        const delay = Math.max(0, (startTime - this.ctx.currentTime) * 1000);
        setTimeout(() => { this.kickValue = 1.0; }, delay);

        // Cleanup
        const cleanTime = (startTime - this.ctx.currentTime + 1.0) * 1000;
        setTimeout(() => {
            try { kickOsc.disconnect(); subOsc.disconnect(); clickSrc.disconnect(); rumbleSrc.disconnect(); } catch (e) { }
        }, Math.max(0, cleanTime));
    }

    // SNARE DRUM - cracking stone
    playSnare(startTime) {
        // Body oscillator
        const snareOsc = this.ctx.createOscillator();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(200, startTime);
        snareOsc.frequency.exponentialRampToValueAtTime(120, startTime + 0.08);

        const snareOscGain = this.ctx.createGain();
        snareOscGain.gain.setValueAtTime(0.5, startTime);
        snareOscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        // Noise body - the main snare rattle
        const noiseDur = 0.22;
        const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseDur), this.ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseData.length * 0.25));
        }
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + noiseDur);

        // Bandpass for character
        const snareFilter = this.ctx.createBiquadFilter();
        snareFilter.type = 'peaking';
        snareFilter.frequency.value = 1200;
        snareFilter.Q.value = 0.8;
        snareFilter.gain.value = 6;

        // Highpass to keep it out of the kick's frequency range
        const snareHP = this.ctx.createBiquadFilter();
        snareHP.type = 'highpass';
        snareHP.frequency.value = 150;

        // Connect
        snareOsc.connect(snareOscGain);
        snareOscGain.connect(snareHP);

        noiseSrc.connect(snareFilter);
        snareFilter.connect(noiseGain);
        noiseGain.connect(snareHP);

        snareHP.connect(this.drumBus);

        snareOsc.start(startTime);
        snareOsc.stop(startTime + 0.25);
        noiseSrc.start(startTime);

        // Visual trigger
        const delay = Math.max(0, (startTime - this.ctx.currentTime) * 1000);
        setTimeout(() => { this.snareValue = 1.0; }, delay);

        setTimeout(() => {
            try { snareOsc.disconnect(); noiseSrc.disconnect(); } catch (e) { }
        }, Math.max(0, (startTime - this.ctx.currentTime + 0.5) * 1000));
    }

    // HI-HAT - distant metallic tick
    playHiHat(startTime, open = false) {
        const dur = open ? 0.3 : 0.06;
        const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        const decayRate = open ? 0.4 : 0.12;
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseData.length * decayRate));
        }
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const hatGain = this.ctx.createGain();
        hatGain.gain.value = open ? 0.12 : 0.09;

        // Highpass for metallic shimmer
        const hatHP = this.ctx.createBiquadFilter();
        hatHP.type = 'highpass';
        hatHP.frequency.value = 7000;

        // Bandpass resonance
        const hatBP = this.ctx.createBiquadFilter();
        hatBP.type = 'bandpass';
        hatBP.frequency.value = 10000;
        hatBP.Q.value = 1.5;

        noiseSrc.connect(hatHP);
        hatHP.connect(hatBP);
        hatBP.connect(hatGain);
        hatGain.connect(this.drumBus);

        noiseSrc.start(startTime);

        setTimeout(() => {
            try { noiseSrc.disconnect(); } catch (e) { }
        }, Math.max(0, (startTime - this.ctx.currentTime + 0.5) * 1000));
    }

    // CRASH CYMBAL - avalanche wash
    playCrash(startTime) {
        const dur = 2.0;
        const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseData.length * 0.35));
        }
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const crashGain = this.ctx.createGain();
        crashGain.gain.setValueAtTime(0.2, startTime);
        crashGain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

        // Filtering for cymbal character
        const crashHP = this.ctx.createBiquadFilter();
        crashHP.type = 'highpass';
        crashHP.frequency.value = 4000;
        crashHP.frequency.exponentialRampToValueAtTime(2000, startTime + dur * 0.5);

        const crashPeak = this.ctx.createBiquadFilter();
        crashPeak.type = 'peaking';
        crashPeak.frequency.value = 6000;
        crashPeak.Q.value = 2;
        crashPeak.gain.value = 8;

        noiseSrc.connect(crashHP);
        crashHP.connect(crashPeak);
        crashPeak.connect(crashGain);
        crashGain.connect(this.drumBus);

        noiseSrc.start(startTime);

        // Also triggers kick visual for the weight
        const delay = Math.max(0, (startTime - this.ctx.currentTime) * 1000);
        setTimeout(() => { this.kickValue = 0.7; }, delay);

        setTimeout(() => {
            try { noiseSrc.disconnect(); } catch (e) { }
        }, Math.max(0, (startTime - this.ctx.currentTime + dur + 0.3) * 1000));
    }

    // Schedule a drum hit
    playHit(type, startTime) {
        switch (type) {
            case 'K': this.playKick(startTime); break;
            case 'S': this.playSnare(startTime); break;
            case 'H': this.playHiHat(startTime, false); break;
            case 'O': this.playHiHat(startTime, true); break;
            case 'C': this.playCrash(startTime); break;
        }
    }

    fadeOut() {
        this.drumBus.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    }

    fadeIn() {
        this.drumBus.gain.cancelScheduledValues(this.ctx.currentTime);
        this.drumBus.gain.setValueAtTime(this.drumBus.gain.value, this.ctx.currentTime);
        this.drumBus.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 0.3);
    }
}

// =====================================================
// ===== DOOM GUITAR SYNTH ============================
// =====================================================

class DoomSynth {
    constructor(ctx, analyser) {
        this.ctx = ctx;
        this.analyser = analyser;

        this.inputGain = this.ctx.createGain();
        this.inputGain.gain.value = 0.55;

        // Heavier distortion for mammoth tone
        this.distortion = this.ctx.createWaveShaper();
        this.distortion.curve = this.makeDistortionCurve(450);
        this.distortion.oversample = '4x';

        // Second stage fuzz
        this.fuzz = this.ctx.createWaveShaper();
        this.fuzz.curve = this.makeAsymmetricFuzz(200);
        this.fuzz.oversample = '4x';

        // Dark lowpass filter - even darker for mammoth
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 1500;
        this.filter.Q.value = 2.2;

        // Low-mid emphasis for thickness
        this.midBoost = this.ctx.createBiquadFilter();
        this.midBoost.type = 'peaking';
        this.midBoost.frequency.value = 400;
        this.midBoost.Q.value = 1.0;
        this.midBoost.gain.value = 4;

        // Darkness filter
        this.filter2 = this.ctx.createBiquadFilter();
        this.filter2.type = 'lowpass';
        this.filter2.frequency.value = 3000;
        this.filter2.Q.value = 0.5;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.2;

        // Cavernous delay
        this.delay = this.ctx.createDelay(2.0);
        this.delay.delayTime.value = 0.5;
        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.value = 0.22;
        this.delayWet = this.ctx.createGain();
        this.delayWet.gain.value = 0.1;

        // Wire the chain: input -> dist -> fuzz -> filter -> midboost -> filter2 -> master
        this.inputGain.connect(this.distortion);
        this.distortion.connect(this.fuzz);
        this.fuzz.connect(this.filter);
        this.filter.connect(this.midBoost);
        this.midBoost.connect(this.filter2);

        this.filter2.connect(this.masterGain);

        // Delay send
        this.filter2.connect(this.delay);
        this.delay.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delay);
        this.delay.connect(this.delayWet);
        this.delayWet.connect(this.masterGain);

        this.masterGain.connect(this.ctx.destination);
        this.masterGain.connect(this.analyser);

        this.currentFreq = 0;
        this.noteOnValue = 0;
    }

    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    // Asymmetric fuzz for more harmonic richness (tube amp style)
    makeAsymmetricFuzz(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            if (x >= 0) {
                curve[i] = Math.tanh(x * amount * 0.01);
            } else {
                curve[i] = Math.tanh(x * amount * 0.015) * 0.9;
            }
        }
        return curve;
    }

    playNote(freq, startTime, duration, palmMute = false) {
        if (freq <= 0) {
            const restDelay = Math.max(0, (startTime - this.ctx.currentTime) * 1000);
            setTimeout(() => {
                this.currentFreq = 0;
                this.noteOnValue = 0;
            }, restDelay);
            return;
        }

        const noteGain = this.ctx.createGain();
        const attack = palmMute ? 0.012 : 0.035;
        const release = palmMute ? 0.04 : 0.15;
        const peakGain = palmMute ? 0.16 : 0.2;
        const sustainTime = Math.max(0.01, duration - attack - release);

        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(peakGain, startTime + attack);
        noteGain.gain.setValueAtTime(peakGain * 0.9, startTime + attack + sustainTime * 0.5);
        noteGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

        const oscs = [];

        // Main detuned pair
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = freq;
        osc1.detune.value = -8;
        oscs.push({ osc: osc1, gain: 0.18 });

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = freq;
        osc2.detune.value = 8;
        oscs.push({ osc: osc2, gain: 0.18 });

        // Extra detuned pair for massive width
        const osc1b = this.ctx.createOscillator();
        osc1b.type = 'sawtooth';
        osc1b.frequency.value = freq;
        osc1b.detune.value = -18;
        oscs.push({ osc: osc1b, gain: 0.08 });

        const osc2b = this.ctx.createOscillator();
        osc2b.type = 'sawtooth';
        osc2b.frequency.value = freq;
        osc2b.detune.value = 18;
        oscs.push({ osc: osc2b, gain: 0.08 });

        // Power chord fifth
        const osc3 = this.ctx.createOscillator();
        osc3.type = 'sawtooth';
        osc3.frequency.value = freq * 1.5;
        osc3.detune.value = 5;
        oscs.push({ osc: osc3, gain: 0.12 });

        // Sub-bass sine (one octave down)
        const subOsc = this.ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.value = freq * 0.5;
        oscs.push({ osc: subOsc, gain: 0.24 });

        // SUB-SUB bass for that mammoth floor rumble (two octaves down on low notes)
        if (freq < 90) {
            const subSub = this.ctx.createOscillator();
            subSub.type = 'sine';
            subSub.frequency.value = freq * 0.25;
            oscs.push({ osc: subSub, gain: 0.15 });
        }

        // Square wave layer for grit
        const sqOsc = this.ctx.createOscillator();
        sqOsc.type = 'square';
        sqOsc.frequency.value = freq;
        sqOsc.detune.value = 3;
        oscs.push({ osc: sqOsc, gain: 0.06 });

        oscs.forEach(({ osc, gain }) => {
            const g = this.ctx.createGain();
            g.gain.value = gain;
            osc.connect(g);
            g.connect(noteGain);
        });

        if (palmMute) {
            const pmFilter = this.ctx.createBiquadFilter();
            pmFilter.type = 'lowpass';
            pmFilter.frequency.value = 380;
            pmFilter.Q.value = 0.8;
            noteGain.connect(pmFilter);
            pmFilter.connect(this.inputGain);

            // Chunkier noise burst
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.03);
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.12));
            }
            const noiseSource = this.ctx.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.value = 0.1;
            noiseSource.connect(noiseGain);
            noiseGain.connect(pmFilter);
            noiseSource.start(startTime);
        } else {
            noteGain.connect(this.inputGain);
        }

        const stopTime = startTime + duration + 0.05;
        oscs.forEach(({ osc }) => {
            osc.start(startTime);
            osc.stop(stopTime);
        });

        const noteOnDelay = Math.max(0, (startTime - this.ctx.currentTime) * 1000);
        setTimeout(() => {
            this.currentFreq = freq;
            this.noteOnValue = 1.0;
        }, noteOnDelay);

        const noteOffDelay = Math.max(0, (startTime - this.ctx.currentTime + duration) * 1000);
        setTimeout(() => {
            this.noteOnValue = 0;
        }, noteOffDelay);

        setTimeout(() => {
            oscs.forEach(({ osc }) => {
                try { osc.disconnect(); } catch (e) { }
            });
            try { noteGain.disconnect(); } catch (e) { }
        }, (stopTime - this.ctx.currentTime) * 1000 + 200);
    }

    fadeOut() {
        this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
    }

    fadeIn() {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.3);
    }
}

// =====================================================
// ===== RIFF SEQUENCER ===============================
// =====================================================

class RiffSequencer {
    constructor(synth, drums) {
        this.synth = synth;
        this.drums = drums;
        this.isPlaying = false;
        this.currentRiffIndex = Math.floor(Math.random() * RIFFS.length);
        this.currentRepeat = 0;
        this.currentStep = 0;
        this.nextNoteTime = 0;
        this.schedulerTimer = null;
        this.riffPhase = 0;

        // Drum tracking: global 16th-note counter within the current pattern
        this.drumIndex = 0;
        this.nextDrumTime = 0;
    }

    get currentRiff() {
        return RIFFS[this.currentRiffIndex];
    }

    get sixteenthDuration() {
        return 60.0 / this.currentRiff.bpm / 4.0;
    }

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.synth.fadeIn();
        this.drums.fadeIn();
        this.nextNoteTime = this.synth.ctx.currentTime + 0.1;
        this.nextDrumTime = this.synth.ctx.currentTime + 0.1;
        this.currentStep = 0;
        this.drumIndex = 0;
        this.currentRepeat = 0;
        this.scheduleAhead();
        showRiffName(this.currentRiff.name, this.currentRiff.bpm);
        if (isDoom > 0.5) {
            currentMode = this.currentRiff.visualMode;
        }
    }

    stop() {
        this.isPlaying = false;
        if (this.schedulerTimer) {
            clearTimeout(this.schedulerTimer);
            this.schedulerTimer = null;
        }
        this.synth.fadeOut();
        this.drums.fadeOut();
        this.synth.currentFreq = 0;
        this.synth.noteOnValue = 0;
    }

    scheduleAhead() {
        if (!this.isPlaying) return;

        const lookAhead = 0.3;

        // Schedule guitar notes
        while (this.nextNoteTime < this.synth.ctx.currentTime + lookAhead) {
            this.scheduleNote();
        }

        // Schedule drum hits
        while (this.nextDrumTime < this.synth.ctx.currentTime + lookAhead) {
            this.scheduleDrum();
        }

        this.schedulerTimer = setTimeout(() => this.scheduleAhead(), 50);
    }

    scheduleNote() {
        const riff = this.currentRiff;
        const step = riff.pattern[this.currentStep];
        const dur = step.dur * this.sixteenthDuration;

        // Calculate riff phase (0-1)
        const totalDur = riff.pattern.reduce((sum, s) => sum + s.dur, 0);
        let stepsToHere = 0;
        for (let i = 0; i < this.currentStep; i++) {
            stepsToHere += riff.pattern[i].dur;
        }
        this.riffPhase = stepsToHere / totalDur;

        this.synth.playNote(step.freq, this.nextNoteTime, dur * 0.93, step.pm || false);

        this.nextNoteTime += dur;
        this.currentStep++;

        if (this.currentStep >= riff.pattern.length) {
            this.currentStep = 0;
            this.currentRepeat++;

            if (this.currentRepeat >= riff.repeats) {
                this.currentRepeat = 0;
                this.nextRiff();
            }
        }
    }

    scheduleDrum() {
        const riff = this.currentRiff;
        const drumPattern = riff.drums || "";

        if (drumPattern.length === 0) {
            // No drum pattern, advance silently
            this.nextDrumTime += this.sixteenthDuration;
            this.drumIndex++;
            return;
        }

        const idx = this.drumIndex % drumPattern.length;
        const hit = drumPattern[idx];

        if (hit !== '0') {
            this.drums.playHit(hit, this.nextDrumTime);
        }

        this.nextDrumTime += this.sixteenthDuration;
        this.drumIndex++;

        // Reset drum index when pattern loops
        if (this.drumIndex >= drumPattern.length) {
            this.drumIndex = 0;
        }
    }

    nextRiff() {
        let next;
        do {
            next = Math.floor(Math.random() * RIFFS.length);
        } while (next === this.currentRiffIndex && RIFFS.length > 1);

        this.currentRiffIndex = next;
        this.currentStep = 0;
        this.drumIndex = 0;

        riffTransitionFlash = 1.0;
        if (isDoom > 0.5) {
            currentMode = this.currentRiff.visualMode;
        }
        showRiffName(this.currentRiff.name, this.currentRiff.bpm);
        console.log(`🦣 Riff: ${this.currentRiff.name} (${this.currentRiff.bpm} BPM)`);
    }
}

// Instances (created on demand)
let doomSynth = null;
let doomDrums = null;
let riffSequencer = null;

// ===== UI: RIFF NAME DISPLAY =====
function showRiffName(name, bpm) {
    const nameEl = document.getElementById('riff-name');
    const statusEl = document.getElementById('doom-status');
    const overlay = document.getElementById('doom-overlay');

    if (!nameEl || !overlay) return;

    nameEl.textContent = name;
    nameEl.classList.remove('show');
    void nameEl.offsetWidth;
    nameEl.classList.add('show');

    if (statusEl) {
        statusEl.textContent = `⛧ MAMMOTH DOOM ⛧  ${bpm} BPM`;
    }
}

// ===== INPUT STATE =====
let mouseX = 0.5;
let mouseY = 0.5;
let currentMode = 0.0;
let isHyper = 0.0;
let isWebcam = 0.0;
let isDoom = 0.0;
let isAutoPilot = 0.0;
let autoPilotTimer = 0.0;
const autoPilotChangeTime = 7.0;
let riffTransitionFlash = 0.0;

let smoothBass = 0;
let smoothMid = 0;
let smoothHigh = 0;
let smoothNoteOn = 0;
let smoothNoteFreq = 0;
let smoothKick = 0;
let smoothSnare = 0;

function handleFirstInteraction() {
    ensureAudioContext();
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

document.body.addEventListener('click', () => {
    handleFirstInteraction();
    initMic();
}, { once: true });

document.body.addEventListener('keydown', () => {
    handleFirstInteraction();
}, { once: true });

document.addEventListener('keydown', (e) => {
    if (e.key === '1') currentMode = 0.0;
    if (e.key === '2') currentMode = 1.0;
    if (e.key === '3') currentMode = 2.0;
    if (e.key === '4') currentMode = 3.0;

    if (e.key === 'w' || e.key === 'W') {
        if (!hasWebcamStarted) {
            initWebcam();
        } else {
            isWebcam = (isWebcam > 0.5) ? 0.0 : 1.0;
        }
    }

    if (e.key === 'a' || e.key === 'A') {
        isAutoPilot = (isAutoPilot > 0.5) ? 0.0 : 1.0;
    }

    // ===== DOOM MODE TOGGLE (D) =====
    if (e.key === 'd' || e.key === 'D') {
        ensureAudioContext();
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        if (isDoom < 0.5) {
            isDoom = 1.0;
            document.body.classList.add('active');
            document.body.classList.add('doom-active');

            if (!doomSynth) {
                doomSynth = new DoomSynth(audioContext, audioAnalyser);
                doomDrums = new DoomDrums(audioContext, audioAnalyser);
                riffSequencer = new RiffSequencer(doomSynth, doomDrums);
            }
            riffSequencer.start();

            const overlay = document.getElementById('doom-overlay');
            if (overlay) overlay.classList.add('active');

            console.log("🦣 MAMMOTH DOOM ACTIVATED 🦣");
        } else {
            isDoom = 0.0;
            document.body.classList.remove('doom-active');

            if (riffSequencer) riffSequencer.stop();

            const overlay = document.getElementById('doom-overlay');
            if (overlay) overlay.classList.remove('active');

            console.log("Doom mode off");
        }
    }

    if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    }
});

document.addEventListener('mousedown', () => isHyper = 1.0);
document.addEventListener('mouseup', () => isHyper = 0.0);
document.addEventListener('touchstart', () => isHyper = 1.0);
document.addEventListener('touchend', () => isHyper = 0.0);

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = 1.0 - (e.clientY / window.innerHeight);
});

document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX / window.innerWidth;
        mouseY = 1.0 - (e.touches[0].clientY / window.innerHeight);
    }
}, { passive: false });

// ===== RENDER LOOP =====
function render(now) {
    now *= 0.001;

    if (isAutoPilot > 0.5 && isDoom < 0.5) {
        if (now - autoPilotTimer > autoPilotChangeTime) {
            currentMode = (currentMode + 1.0) % 4.0;
            autoPilotTimer = now;
        }
    }

    // ===== FREQUENCY BAND ANALYSIS =====
    let audioValue = 0;
    let rawBass = 0;
    let rawMid = 0;
    let rawHigh = 0;

    if (audioAnalyser && audioDataArray) {
        audioAnalyser.getByteFrequencyData(audioDataArray);
        const len = audioDataArray.length;

        let sum = 0;
        for (let i = 0; i < len / 4; i++) sum += audioDataArray[i];
        audioValue = sum / (len / 4 * 255);
        audioValue = Math.pow(audioValue, 2.0) * 2.0;

        let bassSum = 0;
        for (let i = 0; i < 4; i++) bassSum += audioDataArray[i];
        rawBass = bassSum / (4 * 255);
        rawBass = Math.pow(rawBass, 1.5) * 2.5;

        let midSum = 0;
        for (let i = 4; i < 20; i++) midSum += audioDataArray[i];
        rawMid = midSum / (16 * 255);
        rawMid = Math.pow(rawMid, 1.5) * 2.0;

        let highSum = 0;
        for (let i = 20; i < 64; i++) highSum += audioDataArray[i];
        rawHigh = highSum / (44 * 255);
        rawHigh = Math.pow(rawHigh, 1.5) * 2.0;
    }

    smoothBass += (rawBass - smoothBass) * 0.25;
    smoothMid += (rawMid - smoothMid) * 0.2;
    smoothHigh += (rawHigh - smoothHigh) * 0.2;

    const targetNoteOn = doomSynth ? doomSynth.noteOnValue : 0;
    const targetFreq = doomSynth ? doomSynth.currentFreq : 0;
    smoothNoteOn += (targetNoteOn - smoothNoteOn) * 0.15;
    const normalizedFreq = targetFreq > 0 ? Math.max(0, Math.min(1, (targetFreq - 36.71) / 110.12)) : smoothNoteFreq;
    smoothNoteFreq += (normalizedFreq - smoothNoteFreq) * 0.1;

    // Kick and snare visual tracking with fast attack, slow decay
    const rawKick = doomDrums ? doomDrums.kickValue : 0;
    const rawSnare = doomDrums ? doomDrums.snareValue : 0;

    if (rawKick > smoothKick) {
        smoothKick += (rawKick - smoothKick) * 0.7; // Fast attack
    } else {
        smoothKick *= 0.92; // Slow decay - mammoth weight lingers
    }

    if (rawSnare > smoothSnare) {
        smoothSnare += (rawSnare - smoothSnare) * 0.8;
    } else {
        smoothSnare *= 0.88;
    }

    // Reset trigger values after reading
    if (doomDrums) {
        doomDrums.kickValue *= 0.85;
        doomDrums.snareValue *= 0.8;
    }

    riffTransitionFlash *= 0.94;

    const riffPhase = riffSequencer ? riffSequencer.riffPhase : 0;

    // ===== RENDERING =====
    resizeCanvasToDisplaySize(gl.canvas);
    resizeFramebuffers();

    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(programInfo.program);

    if (hasWebcamStarted && isWebcam > 0.5) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, webcamTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, webcamVideo);
        gl.uniform1i(programInfo.uniformLocations.webcam, 0);
        gl.uniform1f(programInfo.uniformLocations.webcamEnabled, 1.0);
    } else {
        gl.uniform1f(programInfo.uniformLocations.webcamEnabled, 0.0);
    }

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureB);
    gl.uniform1i(programInfo.uniformLocations.prevFrame, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.uniform2f(programInfo.uniformLocations.resolution, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(programInfo.uniformLocations.time, now);
    gl.uniform2f(programInfo.uniformLocations.mouse, mouseX, mouseY);
    gl.uniform1f(programInfo.uniformLocations.audio, audioValue);
    gl.uniform1f(programInfo.uniformLocations.mode, currentMode);
    gl.uniform1f(programInfo.uniformLocations.hyper, isHyper);

    gl.uniform1f(programInfo.uniformLocations.bass, smoothBass);
    gl.uniform1f(programInfo.uniformLocations.mid, smoothMid);
    gl.uniform1f(programInfo.uniformLocations.high, smoothHigh);
    gl.uniform1f(programInfo.uniformLocations.doomMode, isDoom);
    gl.uniform1f(programInfo.uniformLocations.riffPhase, riffPhase);
    gl.uniform1f(programInfo.uniformLocations.noteFreq, smoothNoteFreq);
    gl.uniform1f(programInfo.uniformLocations.noteOn, smoothNoteOn);
    gl.uniform1f(programInfo.uniformLocations.riffFlash, riffTransitionFlash);
    gl.uniform1f(programInfo.uniformLocations.kick, smoothKick);
    gl.uniform1f(programInfo.uniformLocations.snare, smoothSnare);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    let tempTex = textureA;
    textureA = textureB;
    textureB = tempTex;

    let tempFbo = fboA;
    fboA = fboB;
    fboB = tempFbo;

    drawTextureToScreen(textureB);

    requestAnimationFrame(render);
}

// ===== DISPLAY SHADER =====
const vsDisplay = `
attribute vec4 aVertexPosition;
varying vec2 vUv;
void main() {
    gl_Position = aVertexPosition;
    vUv = aVertexPosition.xy * 0.5 + 0.5;
}
`;
const fsDisplay = `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 vUv;
void main() {
    gl_FragColor = texture2D(u_texture, vUv);
}
`;

const displayProgram = initShaderProgram(gl, vsDisplay, fsDisplay);
const displayLocs = {
    pos: gl.getAttribLocation(displayProgram, 'aVertexPosition'),
    tex: gl.getUniformLocation(displayProgram, 'u_texture'),
};

function drawTextureToScreen(tex) {
    gl.useProgram(displayProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(displayLocs.tex, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(displayLocs.pos, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(displayLocs.pos);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function resizeCanvasToDisplaySize(canvas) {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

requestAnimationFrame(render);
