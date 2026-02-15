// =====================================================
// STONERIZM — MELODIC DOOM / SPACE ROCK ENGINE
// Realistic instruments • Genre transitions • Visual sync
// =====================================================

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });

// ===== VERTEX SHADER =====
const vsSource = `
attribute vec4 aVertexPosition;
varying vec2 vUv;
void main() {
    gl_Position = aVertexPosition;
    vUv = aVertexPosition.xy * 0.5 + 0.5;
}
`;

// ===== FRAGMENT SHADER =====
const fsSource = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_audio;
uniform float u_mode;
uniform float u_hyper;
uniform sampler2D u_webcam;
uniform float u_webcamEnabled;
uniform sampler2D u_prevFrame;

// Music-reactive uniforms
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
// Genre blend: 0.0 = pure doom, 1.0 = pure space rock
uniform float u_genre;

varying vec2 vUv;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

vec3 palette(float t) {
    vec3 a = vec3(0.5); vec3 b = vec3(0.5);
    vec3 c = vec3(1.0); vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

// Doom palette: deep reds, burnt oranges, void purples
vec3 doomPalette(float t, float bass) {
    vec3 a = vec3(0.4, 0.08, 0.02);
    vec3 b = vec3(0.35, 0.12, 0.08);
    vec3 c = vec3(1.0, 0.6, 0.3);
    vec3 d = vec3(0.0, 0.15, 0.2);
    vec3 base = a + b * cos(6.28318 * (c * t + d));
    base += vec3(0.15, 0.0, 0.08) * bass;
    return base;
}

// Space rock palette: deep blues, purples, nebula pinks, cosmic cyan
vec3 spacePalette(float t, float high) {
    vec3 a = vec3(0.08, 0.05, 0.2);
    vec3 b = vec3(0.3, 0.15, 0.35);
    vec3 c = vec3(0.8, 1.2, 0.6);
    vec3 d = vec3(0.6, 0.3, 0.7);
    vec3 base = a + b * cos(6.28318 * (c * t + d));
    base += vec3(0.0, 0.05, 0.15) * high;
    return base;
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    float time = u_time;
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 uv0 = uv;
    vec2 m = u_mouse;
    float audio = u_audio;

    vec3 finalColor = vec3(0.0);

    float genre = clamp(u_genre, 0.0, 1.0);

    // ===== KICK SHOCKWAVE =====
    if (u_doomMode > 0.5 && u_kick > 0.05) {
        float kickRing = (1.0 - u_kick) * 3.0;
        float wave = smoothstep(0.15, 0.0, abs(length(uv) - kickRing));
        wave *= u_kick;
        vec2 dir = normalize(uv + 0.001);
        uv += dir * wave * 0.12 * u_kick;
        float tremor = u_kick * 0.012 * (1.0 - genre * 0.6);
        uv.x += sin(uv.y * 30.0 + time * 50.0) * tremor;
        uv.y += cos(uv.x * 25.0 + time * 40.0) * tremor;
    }

    // ===== BASS BREATHING =====
    if (u_doomMode > 0.5) {
        float breath = u_bass * 0.18 * (1.0 - genre * 0.4) + u_kick * 0.08;
        uv *= 1.0 - breath;

        float smokeScale = 2.5 + u_riffPhase * 2.0 + genre * 1.5;
        float smokeAmt = 0.06 * u_bass + 0.02 + u_kick * 0.03;
        float sx = fbm(uv * smokeScale + time * 0.25) * smokeAmt;
        float sy = fbm(uv * smokeScale + time * 0.25 + 50.0) * smokeAmt;
        uv += vec2(sx, sy);
    }

    // ===== SPACE NEBULA WARP (genre > 0.3) =====
    if (u_doomMode > 0.5 && genre > 0.3) {
        float spaceWarp = genre * 0.08;
        float nebula = fbm(uv * 1.5 + time * 0.08);
        float nebula2 = fbm(uv * 2.5 - time * 0.05 + 30.0);
        uv += vec2(nebula, nebula2) * spaceWarp * (0.5 + u_high * 0.5);
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
                if (u_doomMode > 0.5) starSize += u_bass * 0.2 + u_kick * 0.3 + u_high * genre * 0.3;
                float star = 0.05 / length(gv);
                star *= starSize * fade;

                vec3 starCol;
                if (u_doomMode > 0.5) {
                    starCol = mix(
                        doomPalette(r + i * 0.2 + time * 0.1, u_bass),
                        spacePalette(r + i * 0.2 + time * 0.08, u_high),
                        genre
                    );
                } else {
                    starCol = palette(r + i * 0.2 + time * 0.1);
                }
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
                        pCol = mix(
                            vec3(0.6, 0.15, 0.05),
                            vec3(0.15, 0.1, 0.5),
                            genre
                        );
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
                    vec3 aCol = (u_doomMode > 0.5) ?
                        mix(vec3(0.5, 0.2, 0.1), vec3(0.2, 0.15, 0.4), genre) :
                        vec3(0.6, 0.5, 0.4);
                    finalColor += aCol * ast * fade * (0.8 + audio * 2.0);
                }
            }
        }

        // ===== NEBULA LAYER for space rock =====
        if (u_doomMode > 0.5 && genre > 0.4) {
            float nebDensity = fbm(uv0 * 1.2 + time * 0.03);
            float nebDensity2 = fbm(uv0 * 2.8 - time * 0.02 + 77.0);
            float neb = nebDensity * nebDensity2;
            vec3 nebCol = spacePalette(nebDensity + time * 0.02, u_high);
            finalColor += nebCol * neb * genre * 0.4 * (0.5 + u_mid * 0.5);
        }
    } else {
        // ===== MODES 0-2: FRACTAL INFINITY =====
        for (float i = 0.0; i < 4.0; i++) {
            float doomFold = 0.0;
            if (u_doomMode > 0.5) {
                doomFold = sin(u_riffPhase * 6.28318 + i * 1.5) * 0.12 * (0.5 + u_bass);
                doomFold += u_kick * 0.12 * (1.0 - genre * 0.5);
                doomFold += sin(time * 0.3 + i * 0.8) * genre * 0.06;
            }

            if (u_mode < 0.5) {
                uv = fract(uv * (1.5 + doomFold)) - 0.5;
                float rotSpd = (u_doomMode > 0.5) ?
                    mix(0.06 + u_bass * 0.3, 0.15 + u_high * 0.15, genre) :
                    0.2;
                uv *= rot(time * rotSpd + i * 0.5 + audio);
            } else if (u_mode < 1.5) {
                uv = fract(uv * (1.2 + doomFold)) - 0.5;
                uv = abs(uv);
                float rotSpd = (u_doomMode > 0.5) ?
                    mix(0.12 + u_bass * 0.4, 0.2 + u_mid * 0.2, genre) :
                    0.4;
                uv *= rot(time * rotSpd + i);
            } else {
                float waveAmt = (u_doomMode > 0.5) ?
                    mix(0.3 + u_bass * 0.25, 0.15 + u_high * 0.12, genre) :
                    0.2;
                uv = fract(uv * (1.5 + sin(time) * waveAmt + doomFold)) - 0.5;
                float rotSpd = (u_doomMode > 0.5) ? 0.03 + u_mid * 0.12 + genre * 0.08 : 0.1;
                uv *= rot(time * rotSpd);
                float warpStr = (u_doomMode > 0.5) ?
                    mix(0.1 + u_bass * 0.18, 0.06 + u_high * 0.1, genre) :
                    0.1;
                uv += sin(uv.yx * (4.0 + u_bass * 5.0) + time) * warpStr;
            }

            float d = length(uv) * exp(-length(uv0));

            vec3 col;
            if (u_doomMode > 0.5) {
                float doomT = length(uv0) + i * 0.4 + time * 0.15 + u_noteFreq * 3.0 + u_riffPhase * 0.5;
                vec3 dCol = doomPalette(doomT, u_bass);
                vec3 sCol = spacePalette(doomT + time * 0.05, u_high);
                col = mix(dCol, sCol, genre);

                vec3 flashCol = mix(vec3(0.4, 0.15, 0.02), vec3(0.1, 0.15, 0.35), genre);
                col += flashCol * u_noteOn * (1.0 + u_bass);
                vec3 riffFlashCol = mix(vec3(0.3, 0.1, 0.05), vec3(0.1, 0.05, 0.3), genre);
                col += riffFlashCol * u_riffFlash;
                vec3 kickCol = mix(vec3(0.6, 0.2, 0.0), vec3(0.2, 0.1, 0.4), genre);
                col += kickCol * u_kick * u_kick;
                vec3 snareCol = mix(vec3(0.3, 0.25, 0.2), vec3(0.2, 0.2, 0.35), genre);
                col += snareCol * u_snare;
            } else {
                col = palette(length(uv0) + i * 0.4 + time * 0.4 + m.x * 2.0 + audio);
            }

            if (u_hyper > 0.5) col = 1.0 - col;

            if (u_mode < 0.5) {
                float audioMod = (u_doomMode > 0.5) ? u_bass * 18.0 + u_kick * 6.0 : audio * 10.0;
                d = sin(d * (8.0 + m.y * 10.0 + audioMod) + time) / 8.0;
            } else if (u_mode < 1.5) {
                float sharpness = (u_doomMode > 0.5) ?
                    mix(10.0 + u_mid * 6.0, 8.0 + u_high * 4.0, genre) :
                    12.0;
                d = sin(d * sharpness + time) / 8.0;
                d = smoothstep(0.0, 0.1, d);
            } else {
                float softness = (u_doomMode > 0.5) ?
                    mix(5.0 + u_bass * 3.0, 4.0 + u_mid * 2.0, genre) :
                    6.0;
                d = sin(d * softness + time + m.y * 5.0) / 6.0;
            }

            d = abs(d);

            float glowPower = (u_hyper > 0.5) ? 1.5 : 1.2;
            if (u_doomMode > 0.5) {
                glowPower = mix(
                    1.0 + u_bass * 0.5 + u_noteOn * 0.2 + u_kick * 0.4,
                    1.1 + u_high * 0.3 + u_noteOn * 0.15,
                    genre
                );
            }
            d = pow(0.01 / d, glowPower);

            finalColor += col * d;
        }
    }

    // ===== STOMP AFTERGLOW =====
    if (u_doomMode > 0.5 && u_kick > 0.01) {
        float dist = length(uv0);
        float waveR = (1.0 - u_kick) * 2.2;
        float ring = smoothstep(0.12, 0.0, abs(dist - waveR)) * u_kick;
        vec3 stompColor = mix(
            mix(vec3(0.8, 0.3, 0.0), vec3(0.4, 0.0, 0.0), dist),
            mix(vec3(0.3, 0.1, 0.6), vec3(0.1, 0.0, 0.3), dist),
            genre
        );
        finalColor += stompColor * ring * 1.2;

        float centralGlow = exp(-dist * 3.0) * u_kick * u_kick;
        vec3 glowCol = mix(vec3(0.5, 0.15, 0.0), vec3(0.15, 0.08, 0.4), genre);
        finalColor += glowCol * centralGlow;
    }

    // ===== VIGNETTE =====
    if (u_doomMode > 0.5) {
        float vig = length(uv0) * 0.5;
        vig = smoothstep(0.15, 1.4, vig);
        float vigStrength = mix(
            0.5 + (1.0 - u_noteOn) * 0.3 - u_bass * 0.2,
            0.35 + (1.0 - u_noteOn) * 0.2 - u_high * 0.15,
            genre
        );
        vigStrength = clamp(vigStrength, 0.08, 0.75);
        finalColor *= 1.0 - vig * vigStrength;

        float smokeOverlay = fbm(uv0 * 3.5 + time * 0.15);
        float smokeOverlay2 = fbm(uv0 * 6.0 - time * 0.1 + 100.0);
        float smoke = mix(smokeOverlay, smokeOverlay2, 0.5);
        vec3 smokeCol = mix(
            vec3(0.08, 0.02, 0.0),
            vec3(0.02, 0.02, 0.1),
            genre
        );
        finalColor += smokeCol * smoke * (u_bass * 0.5 + u_kick * 0.2 + genre * 0.15);

        if (u_kick > 0.15) {
            float dust = fbm(uv0 * 12.0 + time * 2.0) * u_kick * 0.12;
            vec3 dustCol = mix(vec3(0.3, 0.15, 0.05), vec3(0.1, 0.08, 0.25), genre);
            finalColor += dustCol * dust;
        }

        // Space rock: aurora streaks
        if (genre > 0.5) {
            float aurora = sin(uv0.x * 3.0 + time * 0.2 + fbm(uv0 * 2.0 + time * 0.1) * 3.0);
            aurora = smoothstep(0.7, 1.0, aurora) * (genre - 0.5) * 2.0;
            vec3 auroraCol = spacePalette(uv0.y + time * 0.05, u_high);
            finalColor += auroraCol * aurora * 0.15 * (0.5 + u_mid);
        }
    }

    // Webcam
    if (u_webcamEnabled > 0.5) {
        vec2 webcamUV = uv0 * 0.5 + 0.5;
        webcamUV += finalColor.xy * 0.1 * (1.0 + audio * 5.0);
        vec3 webcamColor = texture2D(u_webcam, webcamUV).rgb;
        finalColor = mix(webcamColor, finalColor, 0.5);
    }

    // ===== FEEDBACK LOOP =====
    vec2 feedbackUV = vUv;
    feedbackUV -= 0.5;

    float fbZoom = 0.99;
    float fbAngle = 0.005 * sin(time);

    if (u_doomMode > 0.5) {
        fbZoom = mix(
            0.993 - u_bass * 0.012 - u_kick * 0.006,
            0.996 - u_high * 0.005,
            genre
        );
        fbAngle = mix(
            0.003 * sin(time * 0.3) + u_bass * 0.005 + u_kick * 0.01,
            0.006 * sin(time * 0.15) + u_mid * 0.003,
            genre
        );
    }

    feedbackUV *= fbZoom;
    float s = sin(fbAngle);
    float c = cos(fbAngle);
    feedbackUV = vec2(feedbackUV.x * c - feedbackUV.y * s, feedbackUV.x * s + feedbackUV.y * c);
    feedbackUV += 0.5;

    vec3 prevColor = texture2D(u_prevFrame, feedbackUV).rgb;

    float decay = (u_hyper > 0.5) ? 0.8 : 0.96;
    if (u_doomMode > 0.5) {
        decay = mix(
            0.88 + u_bass * 0.05 + u_kick * 0.03,
            0.92 + u_high * 0.03,
            genre
        );
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
        console.error('Shader link error: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error: ' + gl.getShaderInfoLog(shader));
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
        genre: gl.getUniformLocation(shaderProgram, 'u_genre'),
    },
};

// ===== BUFFERS =====
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), gl.STATIC_DRAW);

// ===== FRAMEBUFFERS =====
let canvasWidth = gl.canvas.width;
let canvasHeight = gl.canvas.height;

function createTexture(w, h) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
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

// ===== AUDIO =====
let audioContext;
let audioAnalyser;
let audioDataArray;
let hasMicStarted = false;

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
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(audioAnalyser);
            hasMicStarted = true;
            document.body.classList.add('active');
        })
        .catch(err => console.error('Mic error:', err));
}

function initWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            webcamVideo.srcObject = stream;
            webcamVideo.play();
            hasWebcamStarted = true;
            isWebcam = 1.0;
        })
        .catch(err => { console.error(err); alert("Webcam error!"); });
}

// =====================================================
// ===== REALISTIC GUITAR AMP MODEL ==================
// =====================================================

class RealisticGuitar {
    constructor(ctx, dest) {
        this.ctx = ctx;
        this.inputGain = ctx.createGain();
        this.inputGain.gain.value = 0.6;

        // Preamp tube saturation
        this.preampDrive = ctx.createWaveShaper();
        this.preampDrive.curve = this._tubeSaturation(6.0);
        this.preampDrive.oversample = '4x';

        this.preampDrive2 = ctx.createWaveShaper();
        this.preampDrive2.curve = this._tubeSaturation(3.0);
        this.preampDrive2.oversample = '4x';

        // Tone stack EQ
        this.tsBass = ctx.createBiquadFilter();
        this.tsBass.type = 'lowshelf';
        this.tsBass.frequency.value = 250;
        this.tsBass.gain.value = 3;

        this.tsMid = ctx.createBiquadFilter();
        this.tsMid.type = 'peaking';
        this.tsMid.frequency.value = 800;
        this.tsMid.Q.value = 1.2;
        this.tsMid.gain.value = -2;

        this.tsTreble = ctx.createBiquadFilter();
        this.tsTreble.type = 'highshelf';
        this.tsTreble.frequency.value = 3500;
        this.tsTreble.gain.value = -6;

        this.presence = ctx.createBiquadFilter();
        this.presence.type = 'peaking';
        this.presence.frequency.value = 2200;
        this.presence.Q.value = 2.0;
        this.presence.gain.value = 2;

        // Cabinet simulation
        this.cabLP = ctx.createBiquadFilter();
        this.cabLP.type = 'lowpass';
        this.cabLP.frequency.value = 4500;
        this.cabLP.Q.value = 0.7;

        this.cabHP = ctx.createBiquadFilter();
        this.cabHP.type = 'highpass';
        this.cabHP.frequency.value = 70;
        this.cabHP.Q.value = 0.7;

        this.cabResonance = ctx.createBiquadFilter();
        this.cabResonance.type = 'peaking';
        this.cabResonance.frequency.value = 2800;
        this.cabResonance.Q.value = 3.0;
        this.cabResonance.gain.value = 4;

        this.cabBody = ctx.createBiquadFilter();
        this.cabBody.type = 'peaking';
        this.cabBody.frequency.value = 400;
        this.cabBody.Q.value = 1.5;
        this.cabBody.gain.value = 3;

        // Power amp compression
        this.powerComp = ctx.createDynamicsCompressor();
        this.powerComp.threshold.value = -18;
        this.powerComp.knee.value = 10;
        this.powerComp.ratio.value = 4;
        this.powerComp.attack.value = 0.005;
        this.powerComp.release.value = 0.1;

        // Spring reverb (multi-tap delay)
        this.reverbDelay1 = ctx.createDelay(0.2);
        this.reverbDelay1.delayTime.value = 0.037;
        this.reverbDelay2 = ctx.createDelay(0.2);
        this.reverbDelay2.delayTime.value = 0.053;
        this.reverbDelay3 = ctx.createDelay(0.2);
        this.reverbDelay3.delayTime.value = 0.071;
        this.reverbFB1 = ctx.createGain(); this.reverbFB1.gain.value = 0.35;
        this.reverbFB2 = ctx.createGain(); this.reverbFB2.gain.value = 0.3;
        this.reverbFB3 = ctx.createGain(); this.reverbFB3.gain.value = 0.25;
        this.reverbLP = ctx.createBiquadFilter();
        this.reverbLP.type = 'lowpass';
        this.reverbLP.frequency.value = 3000;
        this.reverbWet = ctx.createGain();
        this.reverbWet.gain.value = 0.12;

        // Slapback delay
        this.delay = ctx.createDelay(2.0);
        this.delay.delayTime.value = 0.42;
        this.delayFB = ctx.createGain();
        this.delayFB.gain.value = 0.2;
        this.delayLP = ctx.createBiquadFilter();
        this.delayLP.type = 'lowpass';
        this.delayLP.frequency.value = 2500;
        this.delayWet = ctx.createGain();
        this.delayWet.gain.value = 0.08;

        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.16;

        // Wire the chain
        this.inputGain.connect(this.preampDrive);
        this.preampDrive.connect(this.preampDrive2);
        this.preampDrive2.connect(this.tsBass);
        this.tsBass.connect(this.tsMid);
        this.tsMid.connect(this.tsTreble);
        this.tsTreble.connect(this.presence);
        this.presence.connect(this.cabHP);
        this.cabHP.connect(this.cabLP);
        this.cabLP.connect(this.cabResonance);
        this.cabResonance.connect(this.cabBody);
        this.cabBody.connect(this.powerComp);
        this.powerComp.connect(this.masterGain);

        // Spring reverb
        [this.reverbDelay1, this.reverbDelay2, this.reverbDelay3].forEach((d, i) => {
            this.powerComp.connect(d);
            const fb = [this.reverbFB1, this.reverbFB2, this.reverbFB3][i];
            d.connect(fb); fb.connect(d);
            d.connect(this.reverbLP);
        });
        this.reverbLP.connect(this.reverbWet);
        this.reverbWet.connect(this.masterGain);

        // Slapback
        this.powerComp.connect(this.delay);
        this.delay.connect(this.delayLP);
        this.delayLP.connect(this.delayFB);
        this.delayFB.connect(this.delay);
        this.delayLP.connect(this.delayWet);
        this.delayWet.connect(this.masterGain);

        this.masterGain.connect(dest);
        this.currentFreq = 0;
        this.noteOnValue = 0;
    }

    _tubeSaturation(drive) {
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            if (x >= 0) curve[i] = 1.0 - Math.exp(-x * drive);
            else curve[i] = -(1.0 - Math.exp(x * drive * 1.2)) * 0.95;
        }
        return curve;
    }

    playNote(freq, startTime, duration, palmMute = false, slide = false) {
        if (freq <= 0) {
            const d = Math.max(0, (startTime - this.ctx.currentTime) * 1000);
            setTimeout(() => { this.currentFreq = 0; this.noteOnValue = 0; }, d);
            return;
        }

        const noteGain = this.ctx.createGain();
        const attack = palmMute ? 0.008 : 0.015;
        const decay = palmMute ? 0.04 : 0.08;
        const sustainLevel = palmMute ? 0.09 : 0.13;
        const release = palmMute ? 0.03 : 0.12;
        const sustainTime = Math.max(0.01, duration - attack - decay - release);

        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(sustainLevel * 1.3, startTime + attack);
        noteGain.gain.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.001), startTime + attack + decay);
        noteGain.gain.setValueAtTime(sustainLevel * 0.85, startTime + Math.max(attack + decay, duration - release));
        noteGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

        const oscs = [];
        [-6, 6, -14, 14].forEach((det, idx) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = det;
            oscs.push({ osc, gain: idx < 2 ? 0.14 : 0.06 });
        });

        // Power chord fifth
        const fifthOsc = this.ctx.createOscillator();
        fifthOsc.type = 'sawtooth';
        fifthOsc.frequency.value = freq * 1.5;
        fifthOsc.detune.value = 4;
        oscs.push({ osc: fifthOsc, gain: 0.09 });

        // Sub octave
        const subOsc = this.ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.value = freq * 0.5;
        oscs.push({ osc: subOsc, gain: 0.18 });

        // 2nd harmonic sweetener
        const harmOsc = this.ctx.createOscillator();
        harmOsc.type = 'sine';
        harmOsc.frequency.value = freq * 2;
        oscs.push({ osc: harmOsc, gain: 0.04 });

        // Pick transient
        const pickDur = 0.02;
        const pickBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * pickDur), this.ctx.sampleRate);
        const pd = pickBuf.getChannelData(0);
        for (let i = 0; i < pd.length; i++) pd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (pd.length * 0.08));
        const pickSrc = this.ctx.createBufferSource();
        pickSrc.buffer = pickBuf;
        const pickGain = this.ctx.createGain();
        pickGain.gain.value = palmMute ? 0.15 : 0.08;
        const pickFilter = this.ctx.createBiquadFilter();
        pickFilter.type = 'bandpass';
        pickFilter.frequency.value = freq * 3;
        pickFilter.Q.value = 2;

        oscs.forEach(({ osc, gain }) => {
            const g = this.ctx.createGain();
            g.gain.value = gain;
            osc.connect(g);
            g.connect(noteGain);
        });
        pickSrc.connect(pickFilter);
        pickFilter.connect(pickGain);
        pickGain.connect(noteGain);

        if (palmMute) {
            const pmFilter = this.ctx.createBiquadFilter();
            pmFilter.type = 'lowpass';
            pmFilter.frequency.value = 350;
            pmFilter.Q.value = 1.0;
            noteGain.connect(pmFilter);
            pmFilter.connect(this.inputGain);
        } else {
            noteGain.connect(this.inputGain);
        }

        const stopTime = startTime + duration + 0.05;
        oscs.forEach(({ osc }) => {
            if (slide && this.currentFreq > 0) {
                osc.frequency.setValueAtTime(this.currentFreq, startTime);
                osc.frequency.linearRampToValueAtTime(freq, startTime + 0.06);
            }
            osc.start(startTime);
            osc.stop(stopTime);
        });
        pickSrc.start(startTime);

        const noteOnDelay = Math.max(0, (startTime - this.ctx.currentTime) * 1000);
        setTimeout(() => { this.currentFreq = freq; this.noteOnValue = 1.0; }, noteOnDelay);
        setTimeout(() => { this.noteOnValue = 0; }, Math.max(0, (startTime - this.ctx.currentTime + duration) * 1000));
        setTimeout(() => {
            oscs.forEach(({ osc }) => { try { osc.disconnect(); } catch(e){} });
            try { noteGain.disconnect(); pickSrc.disconnect(); } catch(e){}
        }, (stopTime - this.ctx.currentTime) * 1000 + 300);
    }

    setDoomTone() {
        this.tsBass.gain.value = 4;
        this.tsMid.gain.value = -2;
        this.tsTreble.gain.value = -8;
        this.cabLP.frequency.value = 4000;
        this.preampDrive.curve = this._tubeSaturation(7.0);
        this.delay.delayTime.value = 0.45;
        this.delayFB.gain.value = 0.18;
        this.delayWet.gain.value = 0.06;
        this.reverbWet.gain.value = 0.1;
    }

    setSpaceTone() {
        this.tsBass.gain.value = 1;
        this.tsMid.gain.value = 1;
        this.tsTreble.gain.value = -3;
        this.cabLP.frequency.value = 5500;
        this.preampDrive.curve = this._tubeSaturation(3.0);
        this.delay.delayTime.value = 0.55;
        this.delayFB.gain.value = 0.35;
        this.delayWet.gain.value = 0.18;
        this.reverbWet.gain.value = 0.2;
    }

    setSleepTone() {
        // Matt Pike's massive wall-of-fuzz tone
        this.tsBass.gain.value = 6;
        this.tsMid.gain.value = 0;
        this.tsTreble.gain.value = -10;
        this.cabLP.frequency.value = 3500;
        this.preampDrive.curve = this._tubeSaturation(9.0);
        this.preampDrive2.curve = this._tubeSaturation(5.0);
        this.delay.delayTime.value = 0.35;
        this.delayFB.gain.value = 0.1;
        this.delayWet.gain.value = 0.03;
        this.reverbWet.gain.value = 0.06;
        this.masterGain.gain.value = 0.20;
    }

    setOmCleanTone() {
        // Minimal guitar for OM - bass leads the way
        this.tsBass.gain.value = 2;
        this.tsMid.gain.value = -1;
        this.tsTreble.gain.value = -4;
        this.cabLP.frequency.value = 5000;
        this.preampDrive.curve = this._tubeSaturation(2.0);
        this.preampDrive2.curve = this._tubeSaturation(1.5);
        this.delay.delayTime.value = 0.55;
        this.delayFB.gain.value = 0.3;
        this.delayWet.gain.value = 0.15;
        this.reverbWet.gain.value = 0.25;
        this.masterGain.gain.value = 0.08;
    }

    setFuzzTone() {
        // Gnarly octave fuzz - Think Big Muff + Octavia
        // Hard asymmetric clipping with octave-up rectification character
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            // Full-wave rectification for octave-up + hard clip
            const rect = Math.abs(x);
            const hardClip = Math.max(-0.8, Math.min(0.8, x * 12.0));
            // Mix rectified (octave) with hard-clipped for gnarly fuzz
            curve[i] = hardClip * 0.6 + (rect * 2.0 - 1.0) * 0.4;
            curve[i] = Math.max(-1.0, Math.min(1.0, curve[i]));
        }
        this.preampDrive.curve = curve;
        // Second stage: softer saturation to round out the harsh edges
        this.preampDrive2.curve = this._tubeSaturation(4.0);
        // Scooped mids, boosted bass & presence for that velcro fuzz character
        this.tsBass.gain.value = 7;
        this.tsMid.gain.value = -5;
        this.tsTreble.gain.value = -6;
        this.tsPresence.gain.value = 5;
        this.cabLP.frequency.value = 3800;
        this.cabHP.frequency.value = 90;
        this.cabResonance.gain.value = 6;
        // Minimal delay, some reverb for space
        this.delay.delayTime.value = 0.30;
        this.delayFB.gain.value = 0.08;
        this.delayWet.gain.value = 0.03;
        this.reverbWet.gain.value = 0.08;
        this.masterGain.gain.value = 0.18;
    }

    fadeOut() { this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5); }
    fadeIn() {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.16, this.ctx.currentTime + 0.5);
    }
}


// =====================================================
// ===== BASS GUITAR ==================================
// =====================================================

class BassGuitar {
    constructor(ctx, dest) {
        this.ctx = ctx;

        this.drive = ctx.createWaveShaper();
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; curve[i] = Math.tanh(x * 2.5); }
        this.drive.curve = curve;
        this.drive.oversample = '2x';

        this.bassBoost = ctx.createBiquadFilter();
        this.bassBoost.type = 'lowshelf';
        this.bassBoost.frequency.value = 200;
        this.bassBoost.gain.value = 6;

        this.midCut = ctx.createBiquadFilter();
        this.midCut.type = 'peaking';
        this.midCut.frequency.value = 600;
        this.midCut.Q.value = 1.0;
        this.midCut.gain.value = -4;

        this.cabLP = ctx.createBiquadFilter();
        this.cabLP.type = 'lowpass';
        this.cabLP.frequency.value = 3000;
        this.cabLP.Q.value = 0.7;

        this.comp = ctx.createDynamicsCompressor();
        this.comp.threshold.value = -20;
        this.comp.ratio.value = 6;
        this.comp.attack.value = 0.003;
        this.comp.release.value = 0.15;

        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.22;

        this.drive.connect(this.bassBoost);
        this.bassBoost.connect(this.midCut);
        this.midCut.connect(this.cabLP);
        this.cabLP.connect(this.comp);
        this.comp.connect(this.masterGain);
        this.masterGain.connect(dest);
    }

    playNote(freq, startTime, duration) {
        if (freq <= 0) return;

        const noteGain = this.ctx.createGain();
        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(0.18, startTime + 0.01);
        noteGain.gain.setValueAtTime(0.15, startTime + Math.max(0.02, duration - 0.08));
        noteGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

        // Fundamental sine
        const fund = this.ctx.createOscillator();
        fund.type = 'sine';
        fund.frequency.value = freq;
        const fundG = this.ctx.createGain(); fundG.gain.value = 0.3;
        fund.connect(fundG); fundG.connect(noteGain);

        // Gritty triangle
        const grit = this.ctx.createOscillator();
        grit.type = 'triangle';
        grit.frequency.value = freq;
        grit.detune.value = 3;
        const gritG = this.ctx.createGain(); gritG.gain.value = 0.15;
        grit.connect(gritG); gritG.connect(noteGain);

        // Sub octave
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = freq * 0.5;
        const subG = this.ctx.createGain(); subG.gain.value = 0.2;
        sub.connect(subG); subG.connect(noteGain);

        // Finger noise
        const noiseDur = 0.015;
        const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseDur), this.ctx.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * 0.05));
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseG = this.ctx.createGain(); noiseG.gain.value = 0.06;
        const noiseF = this.ctx.createBiquadFilter();
        noiseF.type = 'bandpass'; noiseF.frequency.value = freq * 2; noiseF.Q.value = 3;
        noiseSrc.connect(noiseF); noiseF.connect(noiseG); noiseG.connect(noteGain);

        noteGain.connect(this.drive);

        const stopTime = startTime + duration + 0.05;
        [fund, grit, sub].forEach(o => { o.start(startTime); o.stop(stopTime); });
        noiseSrc.start(startTime);

        setTimeout(() => {
            [fund, grit, sub].forEach(o => { try { o.disconnect(); } catch(e){} });
            try { noteGain.disconnect(); noiseSrc.disconnect(); } catch(e){}
        }, (stopTime - this.ctx.currentTime) * 1000 + 300);
    }

    fadeOut() { this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5); }
    fadeIn() {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.22, this.ctx.currentTime + 0.5);
    }

    setOmTone() {
        // Al Cisneros' massive Orange/Matamp bass tone - rich overtones
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; curve[i] = Math.tanh(x * 4.0); }
        this.drive.curve = curve;
        this.bassBoost.gain.value = 10;
        this.midCut.gain.value = -1;
        this.cabLP.frequency.value = 3500;
        this.masterGain.gain.value = 0.30;
    }

    setSleepTone() {
        // Fuzz bass matching Sleep's crushing guitar wall
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; curve[i] = Math.tanh(x * 5.0); }
        this.drive.curve = curve;
        this.bassBoost.gain.value = 8;
        this.midCut.gain.value = -6;
        this.cabLP.frequency.value = 2500;
        this.masterGain.gain.value = 0.28;
    }

    setDoomTone() {
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; curve[i] = Math.tanh(x * 2.5); }
        this.drive.curve = curve;
        this.bassBoost.gain.value = 6;
        this.midCut.gain.value = -4;
        this.cabLP.frequency.value = 3000;
        this.masterGain.gain.value = 0.22;
    }

    setFuzzTone() {
        // Massive fuzz bass - woolly Muff-style overdrive
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i*2)/n - 1;
            curve[i] = Math.tanh(x * 6.0) * 0.85 + Math.sin(x * Math.PI) * 0.15;
        }
        this.drive.curve = curve;
        this.bassBoost.gain.value = 9;
        this.midCut.gain.value = -3;
        this.cabLP.frequency.value = 2800;
        this.masterGain.gain.value = 0.26;
    }
}

// =====================================================
// ===== SPACE SYNTH (Mellotron + Arp) ===============
// =====================================================

class SpaceSynth {
    constructor(ctx, dest) {
        this.ctx = ctx;

        // Phaser (4-stage allpass)
        this.phaserStages = [];
        this.phaserLFO = ctx.createOscillator();
        this.phaserLFO.type = 'sine';
        this.phaserLFO.frequency.value = 0.3;
        this.phaserLFO.start();
        for (let i = 0; i < 4; i++) {
            const ap = ctx.createBiquadFilter();
            ap.type = 'allpass';
            ap.frequency.value = 1000;
            ap.Q.value = 0.5;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 800;
            this.phaserLFO.connect(lfoGain);
            lfoGain.connect(ap.frequency);
            this.phaserStages.push(ap);
        }

        // Chorus
        this.chorusDelay = ctx.createDelay(0.05);
        this.chorusDelay.delayTime.value = 0.015;
        this.chorusLFO = ctx.createOscillator();
        this.chorusLFO.type = 'sine';
        this.chorusLFO.frequency.value = 0.7;
        this.chorusLFO.start();
        this.chorusDepth = ctx.createGain();
        this.chorusDepth.gain.value = 0.004;
        this.chorusLFO.connect(this.chorusDepth);
        this.chorusDepth.connect(this.chorusDelay.delayTime);
        this.chorusMix = ctx.createGain();
        this.chorusMix.gain.value = 0.4;

        // Cosmic delay
        this.cosmicDelay = ctx.createDelay(2.0);
        this.cosmicDelay.delayTime.value = 0.666;
        this.cosmicFB = ctx.createGain();
        this.cosmicFB.gain.value = 0.4;
        this.cosmicLP = ctx.createBiquadFilter();
        this.cosmicLP.type = 'lowpass';
        this.cosmicLP.frequency.value = 3500;
        this.cosmicWet = ctx.createGain();
        this.cosmicWet.gain.value = 0.2;

        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.0;

        // Wire phaser chain
        this.padInput = ctx.createGain();
        this.padInput.gain.value = 1.0;
        let prev = this.padInput;
        this.phaserStages.forEach(ap => { prev.connect(ap); prev = ap; });

        // Phaser -> chorus
        prev.connect(this.chorusDelay);
        this.chorusDelay.connect(this.chorusMix);
        prev.connect(this.masterGain); // dry
        this.chorusMix.connect(this.masterGain);

        // Cosmic delay
        this.masterGain.connect(this.cosmicDelay);
        this.cosmicDelay.connect(this.cosmicLP);
        this.cosmicLP.connect(this.cosmicFB);
        this.cosmicFB.connect(this.cosmicDelay);
        this.cosmicLP.connect(this.cosmicWet);
        this.cosmicWet.connect(dest);

        this.masterGain.connect(dest);

        this.padOscs = [];
        this.arpOscs = [];
    }

    playPad(freqs, startTime, duration) {
        if (!freqs || freqs.length === 0) return;

        freqs.forEach(freq => {
            const voices = [];
            // Mellotron-style: saw + 2x triangle detuned with tape wobble
            const types = ['sawtooth', 'triangle', 'triangle'];
            const detunes = [0, -12, 8];
            types.forEach((type, i) => {
                const osc = this.ctx.createOscillator();
                osc.type = type;
                osc.frequency.value = freq;
                osc.detune.value = detunes[i];

                // Tape wobble LFO
                const wobbleLFO = this.ctx.createOscillator();
                wobbleLFO.type = 'sine';
                wobbleLFO.frequency.value = 0.3 + Math.random() * 0.5;
                const wobbleGain = this.ctx.createGain();
                wobbleGain.gain.value = 6 + Math.random() * 4;
                wobbleLFO.connect(wobbleGain);
                wobbleGain.connect(osc.detune);
                wobbleLFO.start(startTime);
                wobbleLFO.stop(startTime + duration + 0.5);

                voices.push({ osc, wobbleLFO });
            });

            const noteGain = this.ctx.createGain();
            const attack = 1.2;
            const release = 1.5;
            noteGain.gain.setValueAtTime(0.0001, startTime);
            noteGain.gain.linearRampToValueAtTime(0.06, startTime + attack);
            noteGain.gain.setValueAtTime(0.05, startTime + Math.max(attack, duration - release));
            noteGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

            voices.forEach(({ osc }) => {
                osc.connect(noteGain);
                osc.start(startTime);
                osc.stop(startTime + duration + 0.1);
            });
            noteGain.connect(this.padInput);

            setTimeout(() => {
                voices.forEach(({ osc, wobbleLFO }) => {
                    try { osc.disconnect(); wobbleLFO.disconnect(); } catch(e){}
                });
                try { noteGain.disconnect(); } catch(e){}
            }, (startTime + duration - this.ctx.currentTime) * 1000 + 500);
        });
    }

    playArpNote(freq, startTime, duration) {
        if (!freq || freq <= 0) return;

        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.0001, startTime);
        oscGain.gain.linearRampToValueAtTime(0.07, startTime + 0.01);
        oscGain.gain.exponentialRampToValueAtTime(0.03, startTime + duration * 0.3);
        oscGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

        // Resonant filter sweep
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 8;
        filter.frequency.setValueAtTime(freq * 6, startTime);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration * 0.8);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.padInput);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);

        setTimeout(() => {
            try { osc.disconnect(); filter.disconnect(); oscGain.disconnect(); } catch(e){}
        }, (startTime + duration - this.ctx.currentTime) * 1000 + 300);
    }

    fadeIn(time = 2.0) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.32, this.ctx.currentTime + time);
    }

    fadeOut(time = 2.0) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + time);
    }
}


// =====================================================
// ===== DOOM DRUMS ===================================
// =====================================================

class DoomDrums {
    constructor(ctx, dest) {
        this.ctx = ctx;

        this.roomVerb = ctx.createConvolver();
        const roomLen = ctx.sampleRate * 1.2;
        const roomBuf = ctx.createBuffer(2, roomLen, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = roomBuf.getChannelData(ch);
            for (let i = 0; i < roomLen; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (roomLen * 0.25)) * 0.5;
            }
        }
        this.roomVerb.buffer = roomBuf;

        this.roomWet = ctx.createGain();
        this.roomWet.gain.value = 0.10;
        this.roomVerb.connect(this.roomWet);
        this.roomWet.connect(dest);

        this.dryGain = ctx.createGain();
        this.dryGain.gain.value = 0.32;
        this.dryGain.connect(dest);
        this.dryGain.connect(this.roomVerb);

        this.kickVal = 0;
        this.snareVal = 0;
    }

    kick(time) {
        const body = this.ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(110, time);
        body.frequency.exponentialRampToValueAtTime(32, time + 0.35);

        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(55, time);
        sub.frequency.exponentialRampToValueAtTime(20, time + 0.4);

        const bodyG = this.ctx.createGain();
        bodyG.gain.setValueAtTime(0.55, time);
        bodyG.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        const subG = this.ctx.createGain();
        subG.gain.setValueAtTime(0.40, time);
        subG.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

        // Click transient
        const clickDur = 0.008;
        const clickBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * clickDur), this.ctx.sampleRate);
        const cd = clickBuf.getChannelData(0);
        for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (cd.length * 0.15));
        const clickSrc = this.ctx.createBufferSource();
        clickSrc.buffer = clickBuf;
        const clickG = this.ctx.createGain();
        clickG.gain.value = 0.3;
        const clickF = this.ctx.createBiquadFilter();
        clickF.type = 'highpass';
        clickF.frequency.value = 3000;

        body.connect(bodyG); bodyG.connect(this.dryGain);
        sub.connect(subG); subG.connect(this.dryGain);
        clickSrc.connect(clickF); clickF.connect(clickG); clickG.connect(this.dryGain);

        body.start(time); body.stop(time + 0.6);
        sub.start(time); sub.stop(time + 0.7);
        clickSrc.start(time);

        const d = Math.max(0, (time - this.ctx.currentTime) * 1000);
        setTimeout(() => this.kickVal = 1.0, d);
        setTimeout(() => this.kickVal = 0, d + 120);
        setTimeout(() => {
            [body, sub].forEach(o => { try { o.disconnect(); } catch(e){} });
            try { bodyG.disconnect(); subG.disconnect(); clickSrc.disconnect(); } catch(e){}
        }, (time - this.ctx.currentTime) * 1000 + 800);
    }

    snare(time) {
        const body = this.ctx.createOscillator();
        body.type = 'triangle';
        body.frequency.setValueAtTime(210, time);
        body.frequency.exponentialRampToValueAtTime(130, time + 0.08);

        const bodyG = this.ctx.createGain();
        bodyG.gain.setValueAtTime(0.32, time);
        bodyG.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        // Noise buzz
        const nDur = 0.25;
        const nBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * nDur), this.ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * 0.3));
        const nSrc = this.ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const nG = this.ctx.createGain(); nG.gain.value = 0.25;
        const nHP = this.ctx.createBiquadFilter();
        nHP.type = 'highpass'; nHP.frequency.value = 2000;
        const nBP = this.ctx.createBiquadFilter();
        nBP.type = 'bandpass'; nBP.frequency.value = 4000; nBP.Q.value = 1;

        body.connect(bodyG); bodyG.connect(this.dryGain);
        nSrc.connect(nHP); nHP.connect(nBP); nBP.connect(nG); nG.connect(this.dryGain);

        body.start(time); body.stop(time + 0.3);
        nSrc.start(time);

        const d = Math.max(0, (time - this.ctx.currentTime) * 1000);
        setTimeout(() => this.snareVal = 1.0, d);
        setTimeout(() => this.snareVal = 0, d + 80);
        setTimeout(() => {
            try { body.disconnect(); bodyG.disconnect(); nSrc.disconnect(); nG.disconnect(); } catch(e){}
        }, (time - this.ctx.currentTime) * 1000 + 500);
    }

    hihat(time, open = false) {
        const dur = open ? 0.3 : 0.06;
        const nBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        const decay = open ? 0.5 : 0.08;
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * decay));
        const nSrc = this.ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const g = this.ctx.createGain(); g.gain.value = open ? 0.18 : 0.15;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 7500;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = 2;

        nSrc.connect(hp); hp.connect(bp); bp.connect(g); g.connect(this.dryGain);
        nSrc.start(time);

        setTimeout(() => { try { nSrc.disconnect(); g.disconnect(); } catch(e){} },
            (time - this.ctx.currentTime) * 1000 + 500);
    }

    ride(time, bell = false) {
        const dur = 0.8;
        const nBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * 0.6));
        const nSrc = this.ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const g = this.ctx.createGain(); g.gain.value = 0.1;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 5000;
        const pk = this.ctx.createBiquadFilter();
        pk.type = 'peaking'; pk.frequency.value = 8000; pk.Q.value = 3; pk.gain.value = 4;

        nSrc.connect(hp); hp.connect(pk); pk.connect(g); g.connect(this.dryGain);

        if (bell) {
            const bellOsc = this.ctx.createOscillator();
            bellOsc.type = 'sine';
            bellOsc.frequency.value = 4200;
            const bellG = this.ctx.createGain();
            bellG.gain.setValueAtTime(0.04, time);
            bellG.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
            bellOsc.connect(bellG); bellG.connect(this.dryGain);
            bellOsc.start(time); bellOsc.stop(time + 0.6);
        }

        nSrc.start(time);
        setTimeout(() => { try { nSrc.disconnect(); g.disconnect(); } catch(e){} },
            (time - this.ctx.currentTime) * 1000 + 1000);
    }

    tom(time, pitch = 'mid') {
        const freqs = { high: 200, mid: 140, low: 90 };
        const f = freqs[pitch] || 140;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, time);
        osc.frequency.exponentialRampToValueAtTime(f * 0.5, time + 0.3);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.5, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
        osc.connect(g); g.connect(this.dryGain);
        osc.start(time); osc.stop(time + 0.4);
        setTimeout(() => { try { osc.disconnect(); g.disconnect(); } catch(e){} },
            (time - this.ctx.currentTime) * 1000 + 500);
    }

    crash(time) {
        const dur = 1.5;
        const nBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * 0.5));
        const nSrc = this.ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const g = this.ctx.createGain(); g.gain.value = 0.2;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 4000;

        nSrc.connect(hp); hp.connect(g); g.connect(this.dryGain);
        nSrc.start(time);
        setTimeout(() => { try { nSrc.disconnect(); g.disconnect(); } catch(e){} },
            (time - this.ctx.currentTime) * 1000 + 2000);
    }

    setSpaceRoom() {
        this.roomWet.gain.value = 0.20;
        this.dryGain.gain.value = 0.28;
    }

    setDoomRoom() {
        this.roomWet.gain.value = 0.10;
        this.dryGain.gain.value = 0.32;
    }
}


// ===== NOTE FREQUENCIES (Drop D) =====
const N = {
    R: 0,    // Rest
    D1: 36.71, Eb1: 38.89, E1: 41.20, F1: 43.65, Gb1: 46.25, G1: 49.00,
    Ab1: 51.91, A1: 55.00, Bb1: 58.27, B1: 61.74,
    D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, Gb2: 92.50, G2: 98.00,
    Ab2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,
    D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Gb3: 185.00, G3: 196.00,
    Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
    D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Gb4: 369.99, G4: 392.00,
    Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
    D5: 587.33, E5: 659.26, G5: 783.99, A5: 880.00, B5: 987.77,
};

// ===== SONG DATA =====
const SONGS = [
    {
        name: "MONOLITH RISING",
        sections: [
            {
                name: "DOOM AWAKENS",
                genre: 0.0, bpm: 56, repeats: 3, visualMode: 0,
                guitar: [
                    { f: N.D1, dur: 4, pm: true },
                    { f: N.R, dur: 1 },
                    { f: N.D1, dur: 2, pm: true },
                    { f: N.Eb1, dur: 2, slide: true },
                    { f: N.D1, dur: 4 },
                    { f: N.R, dur: 1 },
                    { f: N.A1, dur: 2 },
                    { f: N.G1, dur: 2, slide: true },
                ],
                bass: [
                    { f: N.D1, dur: 4 }, { f: N.R, dur: 1 },
                    { f: N.D1, dur: 3 },
                    { f: N.D1, dur: 4 }, { f: N.R, dur: 1 },
                    { f: N.A1, dur: 2 }, { f: N.G1, dur: 1 },
                ],
                drums: "K---S---K-K-S---|K---S---K-K-S-OH",
                padChord: null,
                arp: null,
            },
            {
                name: "MAMMOTH MARCH",
                genre: 0.1, bpm: 58, repeats: 3, visualMode: 1, style: 'fuzz',
                guitar: [
                    { f: N.D1, dur: 3 }, { f: N.F1, dur: 1 },
                    { f: N.G1, dur: 2 }, { f: N.D1, dur: 2 },
                    { f: N.Bb1, dur: 3 }, { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 2 }, { f: N.F1, dur: 1 }, { f: N.D1, dur: 1 },
                ],
                bass: [
                    { f: N.D1, dur: 3 }, { f: N.F1, dur: 1 },
                    { f: N.G1, dur: 2 }, { f: N.D1, dur: 2 },
                    { f: N.Bb1, dur: 3 }, { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 2 }, { f: N.F1, dur: 2 },
                ],
                drums: "K--K--S-K--K--S-|K--K--S-K--KT-TL",
                padChord: null,
                arp: null,
            },
            {
                name: "ASCENDING",
                genre: 0.35, bpm: 62, repeats: 3, visualMode: 2,
                guitar: [
                    { f: N.D2, dur: 2 }, { f: N.F2, dur: 2 },
                    { f: N.G2, dur: 2 }, { f: N.A2, dur: 2 },
                    { f: N.Bb2, dur: 3 }, { f: N.A2, dur: 1 },
                    { f: N.G2, dur: 2 }, { f: N.F2, dur: 1 }, { f: N.D2, dur: 1 },
                ],
                bass: [
                    { f: N.D1, dur: 4 }, { f: N.G1, dur: 4 },
                    { f: N.Bb1, dur: 4 }, { f: N.A1, dur: 2 }, { f: N.D1, dur: 2 },
                ],
                drums: "K-H-S-H-K-H-S-H-|K-H-S-H-K-H-SOH-",
                padChord: [N.D3, N.F3, N.A3],
                arp: null,
            },
            {
                name: "COSMIC DRIFT",
                genre: 0.7, bpm: 82, repeats: 4, visualMode: 3,
                guitar: [
                    { f: N.D3, dur: 2 }, { f: N.G3, dur: 1 }, { f: N.A3, dur: 1 },
                    { f: N.Bb3, dur: 2 }, { f: N.A3, dur: 1 }, { f: N.G3, dur: 1 },
                    { f: N.F3, dur: 2 }, { f: N.D3, dur: 2 },
                    { f: N.E3, dur: 2 }, { f: N.F3, dur: 1 }, { f: N.G3, dur: 1 },
                ],
                bass: [
                    { f: N.D2, dur: 2 }, { f: N.G2, dur: 2 },
                    { f: N.Bb2, dur: 2 }, { f: N.A2, dur: 2 },
                    { f: N.F2, dur: 2 }, { f: N.D2, dur: 2 },
                    { f: N.E2, dur: 2 }, { f: N.G2, dur: 2 },
                ],
                drums: "K-R-S-R-K-R-S-R-|K-R-S-R-K-R-S-RB",
                padChord: [N.D4, N.G4, N.Bb4],
                arp: [N.D4, N.F4, N.G4, N.A4, N.Bb4, N.A4, N.G4, N.F4],
            },
            {
                name: "NEBULA SEQUENCE",
                genre: 0.9, bpm: 88, repeats: 4, visualMode: 3,
                guitar: [
                    { f: N.A3, dur: 1 }, { f: N.B3, dur: 1 },
                    { f: N.D4, dur: 2 }, { f: N.E4, dur: 1 }, { f: N.D4, dur: 1 },
                    { f: N.B3, dur: 1 }, { f: N.A3, dur: 1 },
                    { f: N.G3, dur: 2 }, { f: N.A3, dur: 1 }, { f: N.B3, dur: 1 },
                    { f: N.D4, dur: 1 }, { f: N.E4, dur: 1 },
                    { f: N.G4, dur: 2 },
                ],
                bass: [
                    { f: N.A2, dur: 2 }, { f: N.D2, dur: 2 },
                    { f: N.B2, dur: 2 }, { f: N.A2, dur: 2 },
                    { f: N.G2, dur: 2 }, { f: N.A2, dur: 2 },
                    { f: N.D3, dur: 2 }, { f: N.E3, dur: 2 },
                ],
                drums: "K-R-S-R-K-R-S-RB|K-R-S-RBK-R-SOH-",
                padChord: [N.A3, N.D4, N.E4, N.G4],
                arp: [N.A4, N.D5, N.E5, N.G5, N.A5, N.G5, N.E5, N.D5],
            },
            {
                name: "RE-ENTRY",
                genre: 0.4, bpm: 66, repeats: 2, visualMode: 2,
                guitar: [
                    { f: N.D2, dur: 3 }, { f: N.F2, dur: 1 },
                    { f: N.A2, dur: 2 }, { f: N.G2, dur: 2 },
                    { f: N.Bb2, dur: 3 }, { f: N.A2, dur: 1 },
                    { f: N.G2, dur: 2 }, { f: N.D2, dur: 2 },
                ],
                bass: [
                    { f: N.D1, dur: 4 }, { f: N.A1, dur: 2 }, { f: N.G1, dur: 2 },
                    { f: N.Bb1, dur: 3 }, { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 2 }, { f: N.D1, dur: 2 },
                ],
                drums: "K---S-H-K-K-S---|K---S-H-K-K-SOHT",
                padChord: [N.D3, N.F3, N.A3],
                arp: null,
            },
            {
                name: "LEVIATHAN DIRGE",
                genre: 0.0, bpm: 50, repeats: 2, visualMode: 0, style: 'fuzz',
                guitar: [
                    { f: N.D1, dur: 6 },
                    { f: N.Eb1, dur: 2, slide: true },
                    { f: N.D1, dur: 4 },
                    { f: N.R, dur: 2 },
                    { f: N.G1, dur: 3 }, { f: N.F1, dur: 1 },
                    { f: N.D1, dur: 4 },
                    { f: N.R, dur: 2 },
                ],
                bass: [
                    { f: N.D1, dur: 6 }, { f: N.Eb1, dur: 2 },
                    { f: N.D1, dur: 6 }, { f: N.R, dur: 2 },
                    { f: N.G1, dur: 3 }, { f: N.F1, dur: 1 },
                    { f: N.D1, dur: 4 }, { f: N.R, dur: 2 },
                ],
                drums: "K-------S-------|K-------S---T-TL",
                padChord: null,
                arp: null,
            },
        ]
    },
    {
        name: "VOID TRAVELER",
        sections: [
            {
                name: "STAR BIRTH",
                genre: 0.85, bpm: 78, repeats: 3, visualMode: 3,
                guitar: [
                    { f: N.E3, dur: 2 }, { f: N.G3, dur: 1 }, { f: N.A3, dur: 1 },
                    { f: N.B3, dur: 2 }, { f: N.A3, dur: 1 }, { f: N.G3, dur: 1 },
                    { f: N.E3, dur: 2 }, { f: N.D3, dur: 2 },
                    { f: N.E3, dur: 2 }, { f: N.G3, dur: 2 },
                ],
                bass: [
                    { f: N.E2, dur: 4 }, { f: N.B2, dur: 4 },
                    { f: N.E2, dur: 2 }, { f: N.D2, dur: 2 },
                    { f: N.E2, dur: 2 }, { f: N.G2, dur: 2 },
                ],
                drums: "K-R-S-R-K-R-S-R-|K-RBS-R-K-R-SOH-",
                padChord: [N.E3, N.G3, N.B3, N.D4],
                arp: [N.E4, N.G4, N.B4, N.D5, N.E5, N.D5, N.B4, N.G4],
            },
            {
                name: "GRAVITY WELL",
                genre: 0.5, bpm: 66, repeats: 3, visualMode: 2,
                guitar: [
                    { f: N.E2, dur: 3 }, { f: N.G2, dur: 1 },
                    { f: N.A2, dur: 2 }, { f: N.E2, dur: 2 },
                    { f: N.D2, dur: 3 }, { f: N.E2, dur: 1 },
                    { f: N.F2, dur: 2 }, { f: N.E2, dur: 2 },
                ],
                bass: [
                    { f: N.E1, dur: 4 }, { f: N.A1, dur: 4 },
                    { f: N.D2, dur: 2 }, { f: N.E1, dur: 2 },
                    { f: N.F1, dur: 2 }, { f: N.E1, dur: 2 },
                ],
                drums: "K--KS-H-K--KS-H-|K--KS-H-K--KS-OHT",
                padChord: [N.E3, N.A3, N.B3],
                arp: [N.E4, N.A4, N.B4, N.E5],
            },
            {
                name: "BLACK HOLE SUN",
                genre: 0.0, bpm: 56, repeats: 3, visualMode: 0, style: 'fuzz',
                guitar: [
                    { f: N.E1, dur: 4, pm: true },
                    { f: N.R, dur: 1 },
                    { f: N.E1, dur: 2, pm: true },
                    { f: N.F1, dur: 1, slide: true },
                    { f: N.E1, dur: 4 },
                    { f: N.G1, dur: 2 },
                    { f: N.F1, dur: 1 }, { f: N.E1, dur: 1 },
                ],
                bass: [
                    { f: N.E1, dur: 4 }, { f: N.R, dur: 1 },
                    { f: N.E1, dur: 3 },
                    { f: N.E1, dur: 4 },
                    { f: N.G1, dur: 2 }, { f: N.F1, dur: 1 }, { f: N.E1, dur: 1 },
                ],
                drums: "K---S---K-K-S---|K---S---K-K-S-TL",
                padChord: null,
                arp: null,
            },
            {
                name: "ESCAPE VELOCITY",
                genre: 0.6, bpm: 74, repeats: 3, visualMode: 2,
                guitar: [
                    { f: N.A2, dur: 2 }, { f: N.D3, dur: 1 }, { f: N.E3, dur: 1 },
                    { f: N.G3, dur: 2 }, { f: N.E3, dur: 1 }, { f: N.D3, dur: 1 },
                    { f: N.A2, dur: 2 }, { f: N.G2, dur: 2 },
                    { f: N.A2, dur: 2 }, { f: N.D3, dur: 2 },
                ],
                bass: [
                    { f: N.A1, dur: 4 }, { f: N.G1, dur: 4 },
                    { f: N.A1, dur: 2 }, { f: N.G1, dur: 2 },
                    { f: N.A1, dur: 2 }, { f: N.D2, dur: 2 },
                ],
                drums: "K-H-S-H-K-H-S-H-|K-H-S-H-K-H-SOH-",
                padChord: [N.A3, N.D4, N.E4],
                arp: [N.A4, N.D5, N.E5, N.A5, N.E5, N.D5],
            },
            {
                name: "KOSMISCHE MUSIK",
                genre: 0.95, bpm: 88, repeats: 4, visualMode: 3,
                guitar: [
                    { f: N.D3, dur: 1 }, { f: N.E3, dur: 1 },
                    { f: N.G3, dur: 1 }, { f: N.A3, dur: 1 },
                    { f: N.D4, dur: 2 },
                    { f: N.B3, dur: 1 }, { f: N.A3, dur: 1 },
                    { f: N.G3, dur: 1 }, { f: N.E3, dur: 1 },
                    { f: N.D3, dur: 2 },
                    { f: N.E3, dur: 1 }, { f: N.G3, dur: 1 },
                    { f: N.A3, dur: 1 }, { f: N.B3, dur: 1 },
                ],
                bass: [
                    { f: N.D2, dur: 2 }, { f: N.G2, dur: 2 },
                    { f: N.D3, dur: 2 }, { f: N.B2, dur: 2 },
                    { f: N.G2, dur: 2 }, { f: N.D2, dur: 2 },
                    { f: N.E2, dur: 2 }, { f: N.A2, dur: 2 },
                ],
                drums: "K-RBS-R-K-RBS-R-|K-RBS-RBK-RBS-OH-",
                padChord: [N.D4, N.G4, N.A4, N.B4],
                arp: [N.D5, N.G5, N.A5, N.B5, N.D5, N.A5, N.G5, N.E5],
            },
        ]
    },
    {
        name: "DOPESMOKER",
        style: "sleep",
        sections: [
            {
                name: "THE WEEDIAN",
                genre: 0.0, bpm: 52, repeats: 4, visualMode: 0,
                guitar: [
                    { f: N.D1, dur: 4 },
                    { f: N.R, dur: 1 },
                    { f: N.D1, dur: 2, pm: true },
                    { f: N.Eb1, dur: 1, slide: true },
                    { f: N.D1, dur: 4 },
                    { f: N.G1, dur: 2 },
                    { f: N.F1, dur: 1 },
                    { f: N.D1, dur: 1 },
                ],
                bass: [
                    { f: N.D1, dur: 4 }, { f: N.D1, dur: 4 },
                    { f: N.D1, dur: 4 },
                    { f: N.G1, dur: 2 }, { f: N.F1, dur: 1 }, { f: N.D1, dur: 1 },
                ],
                drums: "K-------S-------|K-------S-----TL",
                padChord: null,
                arp: null,
            },
            {
                name: "DRAGONAUT",
                genre: 0.0, bpm: 62, repeats: 4, visualMode: 1,
                guitar: [
                    { f: N.D1, dur: 2, pm: true },
                    { f: N.R, dur: 1 },
                    { f: N.D1, dur: 1, pm: true },
                    { f: N.F1, dur: 2 },
                    { f: N.G1, dur: 2 },
                    { f: N.F1, dur: 1 },
                    { f: N.D1, dur: 1 },
                    { f: N.D1, dur: 1, pm: true },
                    { f: N.R, dur: 1 },
                    { f: N.Bb1, dur: 2 },
                    { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 1 },
                ],
                bass: [
                    { f: N.D1, dur: 4 }, { f: N.F1, dur: 2 }, { f: N.G1, dur: 2 },
                    { f: N.F1, dur: 2 }, { f: N.D1, dur: 2 },
                    { f: N.Bb1, dur: 2 }, { f: N.G1, dur: 2 },
                ],
                drums: "K-K-S---K-K-S---|K-K-S---K-K-S-TL",
                padChord: null,
                arp: null,
            },
            {
                name: "HOLY MOUNTAIN",
                genre: 0.0, bpm: 58, repeats: 3, visualMode: 0,
                guitar: [
                    { f: N.D1, dur: 3 },
                    { f: N.F1, dur: 1 },
                    { f: N.G1, dur: 4 },
                    { f: N.Bb1, dur: 3 },
                    { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 2 },
                    { f: N.D1, dur: 2 },
                ],
                bass: [
                    { f: N.D1, dur: 4 }, { f: N.G1, dur: 4 },
                    { f: N.Bb1, dur: 4 }, { f: N.D1, dur: 4 },
                ],
                drums: "K---S---K-K-S---|K---S---K---S-TL",
                padChord: null,
                arp: null,
            },
            {
                name: "AQUARIAN",
                genre: 0.1, bpm: 64, repeats: 3, visualMode: 1,
                guitar: [
                    { f: N.D2, dur: 2 },
                    { f: N.F2, dur: 1 },
                    { f: N.G2, dur: 1 },
                    { f: N.D2, dur: 2 },
                    { f: N.R, dur: 1 },
                    { f: N.Bb1, dur: 1 },
                    { f: N.A1, dur: 2 },
                    { f: N.G1, dur: 2 },
                    { f: N.F1, dur: 2 },
                    { f: N.D1, dur: 2 },
                ],
                bass: [
                    { f: N.D1, dur: 4 }, { f: N.G1, dur: 2 }, { f: N.Bb1, dur: 2 },
                    { f: N.A1, dur: 4 }, { f: N.G1, dur: 2 }, { f: N.D1, dur: 2 },
                ],
                drums: "K-H-S-H-K-H-S-OH|K-H-S-H-K-H-S-OH",
                padChord: null,
                arp: null,
            },
            {
                name: "SONIC TITAN",
                genre: 0.0, bpm: 52, repeats: 3, visualMode: 0,
                guitar: [
                    { f: N.D1, dur: 8 },
                    { f: N.R, dur: 2 },
                    { f: N.Eb1, dur: 2, slide: true },
                    { f: N.D1, dur: 4 },
                ],
                bass: [
                    { f: N.D1, dur: 8 },
                    { f: N.Eb1, dur: 2 },
                    { f: N.D1, dur: 6 },
                ],
                drums: "K-------S-------|K-------S-----TL",
                padChord: null,
                arp: null,
            },
        ]
    },
    {
        name: "ADVAITIC SONGS",
        style: "om",
        sections: [
            {
                name: "MANTRA OF THE PILGRIM",
                genre: 0.0, bpm: 62, repeats: 4, visualMode: 0,
                guitar: [
                    { f: N.D2, dur: 4 },
                    { f: N.R, dur: 4 },
                    { f: N.Eb2, dur: 4 },
                    { f: N.D2, dur: 4 },
                ],
                bass: [
                    { f: N.D1, dur: 2 }, { f: N.Eb1, dur: 1 }, { f: N.F1, dur: 1 },
                    { f: N.D1, dur: 2 }, { f: N.Eb1, dur: 1 }, { f: N.D1, dur: 1 },
                    { f: N.G1, dur: 2 }, { f: N.F1, dur: 1 }, { f: N.Eb1, dur: 1 },
                    { f: N.D1, dur: 2 }, { f: N.R, dur: 2 },
                ],
                drums: "K---R---K---R---|K---R---K---R-RB",
                padChord: null,
                arp: null,
            },
            {
                name: "AT GIZA",
                genre: 0.05, bpm: 66, repeats: 4, visualMode: 0,
                guitar: [
                    { f: N.R, dur: 4 },
                    { f: N.D2, dur: 4 },
                    { f: N.R, dur: 4 },
                    { f: N.Eb2, dur: 2 },
                    { f: N.D2, dur: 2 },
                ],
                bass: [
                    { f: N.D1, dur: 2 }, { f: N.F1, dur: 2 },
                    { f: N.G1, dur: 2 }, { f: N.F1, dur: 1 }, { f: N.Eb1, dur: 1 },
                    { f: N.D1, dur: 2 }, { f: N.Eb1, dur: 1 }, { f: N.F1, dur: 1 },
                    { f: N.G1, dur: 2 }, { f: N.A1, dur: 1 }, { f: N.G1, dur: 1 },
                ],
                drums: "K-R-R-RBK-R-R-RB|K-R-R-RBK-R-SORB",
                padChord: null,
                arp: null,
            },
            {
                name: "STATE OF NON-RETURN",
                genre: 0.1, bpm: 62, repeats: 3, visualMode: 1,
                guitar: [
                    { f: N.D2, dur: 4 },
                    { f: N.Eb2, dur: 2 },
                    { f: N.G2, dur: 2 },
                    { f: N.Eb2, dur: 2 },
                    { f: N.D2, dur: 4 },
                    { f: N.F2, dur: 1 },
                    { f: N.Eb2, dur: 1 },
                ],
                bass: [
                    { f: N.D1, dur: 2 }, { f: N.Eb1, dur: 1 }, { f: N.G1, dur: 1 },
                    { f: N.A1, dur: 2 }, { f: N.G1, dur: 1 }, { f: N.F1, dur: 1 },
                    { f: N.Eb1, dur: 2 }, { f: N.D1, dur: 1 }, { f: N.Eb1, dur: 1 },
                    { f: N.D1, dur: 2 }, { f: N.G1, dur: 1 }, { f: N.F1, dur: 1 },
                ],
                drums: "K-R-S-R-K-R-S-RB|K-R-S-R-K-R-S-RB",
                padChord: null,
                arp: null,
            },
            {
                name: "THEBES",
                genre: 0.3, bpm: 68, repeats: 3, visualMode: 2,
                guitar: [
                    { f: N.D2, dur: 2 }, { f: N.G2, dur: 1 }, { f: N.A2, dur: 1 },
                    { f: N.Bb2, dur: 2 }, { f: N.A2, dur: 1 }, { f: N.G2, dur: 1 },
                    { f: N.F2, dur: 2 }, { f: N.D2, dur: 2 },
                    { f: N.Eb2, dur: 2 }, { f: N.D2, dur: 2 },
                ],
                bass: [
                    { f: N.D1, dur: 2 }, { f: N.G1, dur: 2 },
                    { f: N.A1, dur: 2 }, { f: N.Bb1, dur: 2 },
                    { f: N.A1, dur: 2 }, { f: N.G1, dur: 1 }, { f: N.F1, dur: 1 },
                    { f: N.Eb1, dur: 1 }, { f: N.D1, dur: 1 }, { f: N.G1, dur: 1 }, { f: N.D1, dur: 1 },
                ],
                drums: "K-R-S-R-K-R-S-OH|K-R-S-R-K-R-SORB",
                padChord: [N.D3, N.G3, N.Bb3],
                arp: null,
            },
            {
                name: "MEDITATION IS THE PRACTICE OF DEATH",
                genre: 0.0, bpm: 54, repeats: 3, visualMode: 0,
                guitar: [
                    { f: N.D2, dur: 8 },
                    { f: N.R, dur: 4 },
                    { f: N.Eb2, dur: 2 },
                    { f: N.D2, dur: 2 },
                ],
                bass: [
                    { f: N.D1, dur: 8 },
                    { f: N.Eb1, dur: 4 },
                    { f: N.D1, dur: 4 },
                ],
                drums: "K-------R-------|K-------R-----RB",
                padChord: null,
                arp: null,
            },
        ]
    },
    {
        name: "SLUDGE MONOLITH",
        style: "fuzz",
        sections: [
            {
                name: "IRON PSALM",
                genre: 0.0, bpm: 50, repeats: 4, visualMode: 0, style: 'fuzz',
                guitar: [
                    { f: N.E1, dur: 6 },
                    { f: N.R, dur: 2 },
                    { f: N.E1, dur: 4, pm: true },
                    { f: N.F1, dur: 2, slide: true },
                    { f: N.E1, dur: 6 },
                    { f: N.R, dur: 2 },
                    { f: N.G1, dur: 3 },
                    { f: N.F1, dur: 1 },
                    { f: N.E1, dur: 4 },
                    { f: N.R, dur: 2 },
                ],
                bass: [
                    { f: N.E1, dur: 8 },
                    { f: N.E1, dur: 4 }, { f: N.F1, dur: 2 }, { f: N.E1, dur: 2 },
                    { f: N.E1, dur: 8 },
                    { f: N.G1, dur: 3 }, { f: N.F1, dur: 1 },
                    { f: N.E1, dur: 4 }, { f: N.R, dur: 2 },
                ],
                drums: "K-------S-------|K-------S---T-TL",
                padChord: null,
                arp: null,
            },
            {
                name: "SLUDGE PROCESSIONAL",
                genre: 0.0, bpm: 52, repeats: 4, visualMode: 1, style: 'fuzz',
                guitar: [
                    { f: N.E1, dur: 2, pm: true },
                    { f: N.R, dur: 1 },
                    { f: N.E1, dur: 1, pm: true },
                    { f: N.F1, dur: 2 },
                    { f: N.G1, dur: 2 },
                    { f: N.F1, dur: 1 },
                    { f: N.E1, dur: 1 },
                    { f: N.E1, dur: 2, pm: true },
                    { f: N.R, dur: 1 },
                    { f: N.Bb1, dur: 2 },
                    { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 1 },
                    { f: N.E1, dur: 2 },
                    { f: N.R, dur: 2 },
                ],
                bass: [
                    { f: N.E1, dur: 4 }, { f: N.F1, dur: 2 }, { f: N.G1, dur: 2 },
                    { f: N.F1, dur: 2 }, { f: N.E1, dur: 2 },
                    { f: N.Bb1, dur: 2 }, { f: N.A1, dur: 1 }, { f: N.G1, dur: 1 },
                    { f: N.E1, dur: 2 }, { f: N.R, dur: 2 },
                ],
                drums: "K-K-S---K-K-S---|K-K-S---K-K-S-TL",
                padChord: null,
                arp: null,
            },
            {
                name: "TAR PIT CRAWL",
                genre: 0.0, bpm: 48, repeats: 3, visualMode: 0, style: 'fuzz',
                guitar: [
                    { f: N.E1, dur: 8 },
                    { f: N.Bb1, dur: 4 },
                    { f: N.A1, dur: 2 },
                    { f: N.E1, dur: 2 },
                    { f: N.E1, dur: 6 },
                    { f: N.F1, dur: 2, slide: true },
                    { f: N.E1, dur: 4 },
                    { f: N.R, dur: 4 },
                ],
                bass: [
                    { f: N.E1, dur: 8 },
                    { f: N.Bb1, dur: 4 },
                    { f: N.A1, dur: 2 }, { f: N.E1, dur: 2 },
                    { f: N.E1, dur: 8 },
                    { f: N.F1, dur: 2 }, { f: N.E1, dur: 6 },
                ],
                drums: "K-------S-------|K-----------T-TL",
                padChord: null,
                arp: null,
            },
            {
                name: "THE BLACKENING",
                genre: 0.05, bpm: 56, repeats: 4, visualMode: 1, style: 'fuzz',
                guitar: [
                    { f: N.E1, dur: 3 },
                    { f: N.G1, dur: 1 },
                    { f: N.A1, dur: 2 },
                    { f: N.E1, dur: 2 },
                    { f: N.B1, dur: 3 },
                    { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 2 },
                    { f: N.F1, dur: 1 },
                    { f: N.E1, dur: 1 },
                ],
                bass: [
                    { f: N.E1, dur: 3 }, { f: N.G1, dur: 1 },
                    { f: N.A1, dur: 2 }, { f: N.E1, dur: 2 },
                    { f: N.B1, dur: 3 }, { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 2 }, { f: N.F1, dur: 1 }, { f: N.E1, dur: 1 },
                ],
                drums: "K---S---K-K-S---|K---S---K-K-S-OH",
                padChord: null,
                arp: null,
            },
            {
                name: "TECTONIC GRIND",
                genre: 0.0, bpm: 50, repeats: 3, visualMode: 0, style: 'fuzz',
                guitar: [
                    { f: N.E1, dur: 4, pm: true },
                    { f: N.R, dur: 1 },
                    { f: N.E1, dur: 2, pm: true },
                    { f: N.G1, dur: 1 },
                    { f: N.E1, dur: 4, pm: true },
                    { f: N.R, dur: 1 },
                    { f: N.F1, dur: 2, slide: true },
                    { f: N.E1, dur: 1 },
                ],
                bass: [
                    { f: N.E1, dur: 4 }, { f: N.R, dur: 1 },
                    { f: N.E1, dur: 2 }, { f: N.G1, dur: 1 },
                    { f: N.E1, dur: 4 }, { f: N.R, dur: 1 },
                    { f: N.F1, dur: 2 }, { f: N.E1, dur: 1 },
                ],
                drums: "K--K--S-K--K--S-|K--K--S-K--KT-TL",
                padChord: null,
                arp: null,
            },
            {
                name: "BURIAL RITES",
                genre: 0.0, bpm: 46, repeats: 2, visualMode: 0, style: 'fuzz',
                guitar: [
                    { f: N.E1, dur: 8 },
                    { f: N.R, dur: 4 },
                    { f: N.F1, dur: 2, slide: true },
                    { f: N.E1, dur: 8 },
                    { f: N.R, dur: 2 },
                ],
                bass: [
                    { f: N.E1, dur: 8 },
                    { f: N.F1, dur: 4 },
                    { f: N.E1, dur: 10 },
                ],
                drums: "K-------S-------|K-----------S-TL",
                padChord: null,
                arp: null,
            },
        ]
    },
];


// =====================================================
// ===== SONG SEQUENCER ===============================
// =====================================================

class SongSequencer {
    constructor(guitar, bass, drums, spaceSynth) {
        this.guitar = guitar;
        this.bass = bass;
        this.drums = drums;
        this.spaceSynth = spaceSynth;
        this.currentSong = 0;
        this.currentSection = 0;
        this.currentRepeat = 0;
        this.isPlaying = false;
        this.scheduledUntil = 0;
        this.lookAhead = 0.2;
        this.scheduleInterval = null;
        this.targetGenre = 0.0;
        this.riffFlashVal = 0;
        this.shuffleMode = false;
        this.shuffleOrder = [];
        this.shuffleIndex = 0;
    }

    _buildShuffleOrder() {
        this.shuffleOrder = SONGS.map((_, i) => i);
        // Fisher-Yates shuffle
        for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
        }
        this.shuffleIndex = 0;
    }

    start() {
        this.isPlaying = true;
        this.currentSong = 0;
        this.currentSection = 0;
        this.currentRepeat = 0;
        this.scheduledUntil = audioContext.currentTime + 0.5;
        if (this.shuffleMode) this._buildShuffleOrder();
        this.applySection();
        this.updateSongPicker();
        this.scheduleInterval = setInterval(() => this.schedule(), 100);
    }

    stop() {
        this.isPlaying = false;
        if (this.scheduleInterval) clearInterval(this.scheduleInterval);
    }

    playSong(index) {
        if (index < 0 || index >= SONGS.length) return;
        console.log('[STONERIZM] playSong:', index, SONGS[index].name);
        this.currentSong = index;
        this.currentSection = 0;
        this.currentRepeat = 0;
        this.scheduledUntil = audioContext.currentTime + 0.3;
        this.applySection();
        this.updateSongPicker();
    }

    nextSong() {
        if (this.shuffleMode) {
            this.shuffleIndex = (this.shuffleIndex + 1) % this.shuffleOrder.length;
            if (this.shuffleIndex === 0) this._buildShuffleOrder();
            this.playSong(this.shuffleOrder[this.shuffleIndex]);
        } else {
            this.playSong((this.currentSong + 1) % SONGS.length);
        }
    }

    prevSong() {
        if (this.shuffleMode) {
            this.shuffleIndex = (this.shuffleIndex - 1 + this.shuffleOrder.length) % this.shuffleOrder.length;
            this.playSong(this.shuffleOrder[this.shuffleIndex]);
        } else {
            this.playSong((this.currentSong - 1 + SONGS.length) % SONGS.length);
        }
    }

    toggleShuffle() {
        this.shuffleMode = !this.shuffleMode;
        if (this.shuffleMode) this._buildShuffleOrder();
        const btn = document.getElementById('btn-shuffle');
        if (btn) btn.classList.toggle('shuffle-active', this.shuffleMode);
    }

    updateSongPicker() {
        const btns = document.querySelectorAll('#song-list .song-btn');
        btns.forEach((btn, i) => btn.classList.toggle('active', i === this.currentSong));
    }

    applySection() {
        const song = SONGS[this.currentSong];
        const section = song.sections[this.currentSection];
        this.targetGenre = section.genre;

        // Apply instrument tones based on song style
        const g = section.genre;
        if (section.style === 'fuzz' || song.style === 'fuzz') {
            this.guitar.setFuzzTone();
            this.bass.setFuzzTone();
            this.drums.setDoomRoom();
        } else if (song.style === 'sleep') {
            // Alternate between sleep wall-of-fuzz and octave fuzz for variety
            if (this.currentSection % 2 === 1) {
                this.guitar.setFuzzTone();
                this.bass.setFuzzTone();
            } else {
                this.guitar.setSleepTone();
                this.bass.setSleepTone();
            }
            this.drums.setDoomRoom();
        } else if (song.style === 'om') {
            this.guitar.setOmCleanTone();
            this.bass.setOmTone();
            this.drums.setDoomRoom();
        } else if (g < 0.3) {
            this.guitar.setDoomTone();
            this.drums.setDoomRoom();
        } else if (g > 0.6) {
            this.guitar.setSpaceTone();
            this.drums.setSpaceRoom();
        } else {
            // Blend
            this.guitar.tsBass.gain.value = 4 - g * 5;
            this.guitar.tsMid.gain.value = -2 + g * 3;
            this.guitar.delay.delayTime.value = 0.42 + g * 0.15;
            this.guitar.delayFB.gain.value = 0.18 + g * 0.2;
            this.guitar.delayWet.gain.value = 0.06 + g * 0.14;
            this.drums.roomWet.gain.value = 0.15 + g * 0.2;
        }

        // Space synth fading
        if (g > 0.25) {
            this.spaceSynth.fadeIn(3.0);
        } else {
            this.spaceSynth.fadeOut(3.0);
        }

        // Visual mode
        currentMode = section.visualMode;

        this.showSection(song.name, section.name, g, section.style || song.style);
    }

    showSection(songName, sectionName, genre, style) {
        let icon, label;
        if (style === 'fuzz') { icon = '\u26A1'; label = 'FUZZ DOOM'; }
        else if (songName === 'DOPESMOKER') { icon = '\uD83C\uDF3F'; label = 'SLEEP'; }
        else if (songName === 'ADVAITIC SONGS') { icon = '\uD83D\uDD49\uFE0F'; label = 'OM'; }
        else if (genre < 0.2) { icon = '\uD83E\uDDA3'; label = 'STONER DOOM'; }
        else if (genre < 0.5) { icon = '\uD83E\uDDA3'; label = 'DOOM RISING'; }
        else if (genre < 0.75) { icon = '\uD83D\uDE80'; label = 'SPACE ROCK'; }
        else { icon = '\uD83C\uDF0C'; label = 'KRAUTROCK'; }

        showRiffName(sectionName);
        const gi = document.getElementById('genre-indicator');
        if (gi) {
            gi.textContent = icon + ' ' + label;
            gi.className = genre > 0.5 ? 'space-mode' : 'doom-mode';
        }
        const ds = document.getElementById('doom-status');
        if (ds) ds.textContent = songName;
    }

    schedule() {
        if (!this.isPlaying) return;
        const now = audioContext.currentTime;
        if (this.scheduledUntil > now + this.lookAhead) return;

        const song = SONGS[this.currentSong];
        const section = song.sections[this.currentSection];
        const beatDur = 60.0 / section.bpm;
        let t = this.scheduledUntil;

        // Schedule guitar riff
        let guitarDur = 0;
        section.guitar.forEach(note => {
            const noteDuration = note.dur * beatDur;
            this.guitar.playNote(note.f, t + guitarDur, noteDuration, note.pm || false, note.slide || false);
            guitarDur += noteDuration;
        });

        // Schedule bass
        let bassDur = 0;
        section.bass.forEach(note => {
            const noteDuration = note.dur * beatDur;
            this.bass.playNote(note.f, t + bassDur, noteDuration);
            bassDur += noteDuration;
        });

        // Schedule drums using pattern string
        const patternDur = Math.max(guitarDur, bassDur);
        const drumStr = section.drums.replace(/\|/g, '');
        const stepDur = patternDur / drumStr.length;
        for (let i = 0; i < drumStr.length; i++) {
            const stepTime = t + i * stepDur;
            const ch = drumStr[i];
            if (ch === 'K') this.drums.kick(stepTime);
            else if (ch === 'S') this.drums.snare(stepTime);
            else if (ch === 'H') this.drums.hihat(stepTime);
            else if (ch === 'O') this.drums.hihat(stepTime, true);
            else if (ch === 'R') this.drums.ride(stepTime);
            else if (ch === 'B') this.drums.ride(stepTime, true);
            else if (ch === 'T') this.drums.tom(stepTime, 'high');
            else if (ch === 'L') this.drums.tom(stepTime, 'low');
            else if (ch === 'C') this.drums.crash(stepTime);
        }

        // Schedule pad for whole section
        if (section.padChord && section.genre > 0.2) {
            this.spaceSynth.playPad(section.padChord, t, patternDur);
        }

        // Schedule arp on 16th notes
        if (section.arp && section.genre > 0.5) {
            const arpStepDur = beatDur * 0.25;
            const arpLen = section.arp.length;
            let arpTime = t;
            let arpIdx = 0;
            while (arpTime < t + patternDur) {
                this.spaceSynth.playArpNote(section.arp[arpIdx % arpLen], arpTime, arpStepDur * 0.8);
                arpTime += arpStepDur;
                arpIdx++;
            }
        }

        // Riff flash for visuals
        const flashDelay = Math.max(0, (t - now) * 1000);
        setTimeout(() => { this.riffFlashVal = 1.0; }, flashDelay);
        setTimeout(() => { this.riffFlashVal = 0; }, flashDelay + 150);

        this.scheduledUntil = t + patternDur;

        // Advance repeat/section/song
        this.currentRepeat++;
        if (this.currentRepeat >= section.repeats) {
            this.currentRepeat = 0;
            this.currentSection++;
            if (this.currentSection >= song.sections.length) {
                this.currentSection = 0;
                if (this.shuffleMode) {
                    this.shuffleIndex = (this.shuffleIndex + 1) % this.shuffleOrder.length;
                    if (this.shuffleIndex === 0) this._buildShuffleOrder();
                    this.currentSong = this.shuffleOrder[this.shuffleIndex];
                } else {
                    this.currentSong = (this.currentSong + 1) % SONGS.length;
                }
                this.updateSongPicker();
            }

            // Schedule crash on section transitions
            this.drums.crash(this.scheduledUntil);

            // Apply next section after the transition
            const transitionDelay = Math.max(0, (this.scheduledUntil - now) * 1000);
            setTimeout(() => this.applySection(), transitionDelay);
        }
    }
}


// ===== INSTANCES =====
let guitar, bass, drums, spaceSynth, sequencer, mainBus;
let isDoom = false;

// ===== UI =====
function showRiffName(name) {
    const el = document.getElementById('riff-name');
    if (el) {
        el.textContent = name;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'riffFade 4s ease-out forwards';
    }
}

// ===== INPUT STATE =====
let mouseX = 0.5, mouseY = 0.5;
let currentMode = 0;
const totalModes = 4;
let isHyper = 0.0;
let isWebcam = 0.0;
let smoothGenre = 0.0;
let targetGenre = 0.0;
let smoothBass = 0, smoothMid = 0, smoothHigh = 0;
let currentPing = 0;

// ===== EVENT LISTENERS =====
canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / canvas.width;
    mouseY = 1.0 - e.clientY / canvas.height;
});

canvas.addEventListener('click', () => {
    currentMode = (currentMode + 1) % totalModes;
    initMic();
});

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'd') {
        ensureAudioContext();
        if (!isDoom) {
            isDoom = true;
            mainBus = audioContext.createGain();
            mainBus.gain.value = 0.55;

            // Master compressor/limiter
            const masterComp = audioContext.createDynamicsCompressor();
            masterComp.threshold.value = -6;
            masterComp.knee.value = 3;
            masterComp.ratio.value = 14;
            masterComp.attack.value = 0.002;
            masterComp.release.value = 0.15;

            mainBus.connect(masterComp);
            masterComp.connect(audioContext.destination);
            masterComp.connect(audioAnalyser);

            guitar = new RealisticGuitar(audioContext, mainBus);
            bass = new BassGuitar(audioContext, mainBus);
            drums = new DoomDrums(audioContext, mainBus);
            spaceSynth = new SpaceSynth(audioContext, mainBus);

            sequencer = new SongSequencer(guitar, bass, drums, spaceSynth);
            sequencer.start();

            // Build song picker buttons
            const songList = document.getElementById('song-list');
            if (songList && songList.children.length === 0) {
                SONGS.forEach((song, i) => {
                    const btn = document.createElement('button');
                    btn.className = 'song-btn' + (i === 0 ? ' active' : '');
                    btn.textContent = song.name;
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        console.log('[STONERIZM] Song button clicked:', i, song.name, 'isPlaying:', sequencer?.isPlaying);
                        if (sequencer && sequencer.isPlaying) sequencer.playSong(i);
                    });
                    songList.appendChild(btn);
                });
            }
            // Wire control buttons
            document.getElementById('btn-prev').addEventListener('click', () => {
                if (sequencer && sequencer.isPlaying) sequencer.prevSong();
            });
            document.getElementById('btn-next').addEventListener('click', () => {
                if (sequencer && sequencer.isPlaying) sequencer.nextSong();
            });
            document.getElementById('btn-shuffle').addEventListener('click', () => {
                if (sequencer) sequencer.toggleShuffle();
            });

            document.getElementById('doom-overlay').classList.add('active');
            document.getElementById('song-picker').classList.add('active');
            document.getElementById('doom-status').textContent = 'MONOLITH RISING';
            const gi = document.getElementById('genre-indicator');
            if (gi) { gi.textContent = '\uD83E\uDDA3 STONER DOOM'; gi.className = 'doom-mode'; }
        } else {
            isDoom = false;
            if (sequencer) sequencer.stop();
            if (guitar) guitar.fadeOut();
            if (bass) bass.fadeOut();
            if (spaceSynth) spaceSynth.fadeOut();
            document.getElementById('doom-overlay').classList.remove('active');
            document.getElementById('song-picker').classList.remove('active');
            document.getElementById('doom-status').textContent = 'PRESS D FOR DOOM';
            const gi = document.getElementById('genre-indicator');
            if (gi) gi.textContent = '';
        }
    }
    if (key === 'h') isHyper = isHyper > 0 ? 0.0 : 1.0;
    if (key === 'w') {
        if (!hasWebcamStarted) initWebcam();
        else isWebcam = isWebcam > 0 ? 0.0 : 1.0;
    }
    if (key >= '1' && key <= '4') currentMode = parseInt(key) - 1;
    if (key === 'm') initMic();
    if (key === 'n' && isDoom && sequencer) sequencer.nextSong();
    if (key === 'p' && isDoom && sequencer) sequencer.prevSong();
    if (key === 's' && isDoom && sequencer) sequencer.toggleShuffle();
    // Number keys 5-9 select songs directly (5 = song 0, 9 = song 4)
    if (key >= '5' && key <= '9' && isDoom && sequencer && sequencer.isPlaying) {
        sequencer.playSong(parseInt(key) - 5);
    }
});

// ===== DISPLAY SHADER =====
const displayVS = `
    attribute vec4 aVertexPosition;
    varying vec2 vUv;
    void main() {
        gl_Position = aVertexPosition;
        vUv = aVertexPosition.xy * 0.5 + 0.5;
    }
`;

const displayFS = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D u_texture;
    void main() {
        gl_FragColor = texture2D(u_texture, vUv);
    }
`;

const displayProgram = initShaderProgram(gl, displayVS, displayFS);
const displayProgramInfo = {
    program: displayProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(displayProgram, 'aVertexPosition'),
    },
    uniformLocations: {
        texture: gl.getUniformLocation(displayProgram, 'u_texture'),
    },
};

function drawTextureToScreen(texture) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(displayProgramInfo.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(displayProgramInfo.attribLocations.vertexPosition);
    gl.vertexAttribPointer(displayProgramInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(displayProgramInfo.uniformLocations.texture, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ===== RENDER LOOP =====
let startTime = performance.now() / 1000;

function render() {
    requestAnimationFrame(render);

    const time = performance.now() / 1000 - startTime;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    resizeFramebuffers();

    // Audio analysis
    let audioLevel = 0, bassLevel = 0, midLevel = 0, highLevel = 0;
    if (audioAnalyser && audioDataArray) {
        audioAnalyser.getByteFrequencyData(audioDataArray);
        const total = audioDataArray.length;
        let sum = 0;
        for (let i = 0; i < total; i++) sum += audioDataArray[i];
        audioLevel = sum / (total * 255);

        const third = Math.floor(total / 3);
        let bSum = 0, mSum = 0, hSum = 0;
        for (let i = 0; i < third; i++) bSum += audioDataArray[i];
        for (let i = third; i < third * 2; i++) mSum += audioDataArray[i];
        for (let i = third * 2; i < total; i++) hSum += audioDataArray[i];
        bassLevel = bSum / (third * 255);
        midLevel = mSum / (third * 255);
        highLevel = hSum / (third * 255);
    }

    smoothBass += (bassLevel - smoothBass) * 0.15;
    smoothMid += (midLevel - smoothMid) * 0.15;
    smoothHigh += (highLevel - smoothHigh) * 0.15;

    // Smooth genre transition
    if (sequencer && sequencer.isPlaying) {
        targetGenre = sequencer.targetGenre;
    }
    smoothGenre += (targetGenre - smoothGenre) * 0.02;

    // Render to framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.useProgram(programInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    gl.uniform2f(programInfo.uniformLocations.resolution, canvasWidth, canvasHeight);
    gl.uniform1f(programInfo.uniformLocations.time, time);
    gl.uniform2f(programInfo.uniformLocations.mouse, mouseX, mouseY);
    gl.uniform1f(programInfo.uniformLocations.audio, audioLevel);
    gl.uniform1f(programInfo.uniformLocations.mode, currentMode);
    gl.uniform1f(programInfo.uniformLocations.hyper, isHyper);
    gl.uniform1f(programInfo.uniformLocations.doomMode, isDoom ? 1.0 : 0.0);
    gl.uniform1f(programInfo.uniformLocations.genre, smoothGenre);

    // Guitar visual data
    let noteFreq = 0, noteOn = 0, riffFlash = 0, kickVal = 0, snareVal = 0;
    if (guitar) { noteFreq = guitar.currentFreq; noteOn = guitar.noteOnValue; }
    if (sequencer) riffFlash = sequencer.riffFlashVal;
    if (drums) { kickVal = drums.kickVal; snareVal = drums.snareVal; }

    gl.uniform1f(programInfo.uniformLocations.riffPhase, time * 0.3);
    gl.uniform1f(programInfo.uniformLocations.noteFreq, noteFreq);
    gl.uniform1f(programInfo.uniformLocations.noteOn, noteOn);
    gl.uniform1f(programInfo.uniformLocations.riffFlash, riffFlash);
    gl.uniform1f(programInfo.uniformLocations.kick, kickVal);
    gl.uniform1f(programInfo.uniformLocations.snare, snareVal);
    gl.uniform1f(programInfo.uniformLocations.bass, smoothBass);
    gl.uniform1f(programInfo.uniformLocations.mid, smoothMid);
    gl.uniform1f(programInfo.uniformLocations.high, smoothHigh);

    // Previous frame
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureB);
    gl.uniform1i(programInfo.uniformLocations.prevFrame, 0);

    // Webcam
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, webcamTexture);
    if (hasWebcamStarted && webcamVideo.readyState >= 2) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, webcamVideo);
    }
    gl.uniform1i(programInfo.uniformLocations.webcam, 1);
    gl.uniform1f(programInfo.uniformLocations.webcamEnabled, isWebcam);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Display
    drawTextureToScreen(textureA);

    // Ping pong
    const tempTex = textureA;
    textureA = textureB;
    textureB = tempTex;
    const tempFbo = fboA;
    fboA = fboB;
    fboB = tempFbo;
}

render();
