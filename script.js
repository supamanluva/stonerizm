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

        // Preamp tube saturation — cranked for metal punch
        this.preampDrive = ctx.createWaveShaper();
        this.preampDrive.curve = this._tubeSaturation(8.0);
        this.preampDrive.oversample = '4x';

        this.preampDrive2 = ctx.createWaveShaper();
        this.preampDrive2.curve = this._tubeSaturation(4.5);
        this.preampDrive2.oversample = '4x';

        // Tone stack EQ — aggressive metal voicing
        this.tsBass = ctx.createBiquadFilter();
        this.tsBass.type = 'lowshelf';
        this.tsBass.frequency.value = 220;
        this.tsBass.gain.value = 5;

        this.tsMid = ctx.createBiquadFilter();
        this.tsMid.type = 'peaking';
        this.tsMid.frequency.value = 800;
        this.tsMid.Q.value = 1.4;
        this.tsMid.gain.value = -1;

        this.tsTreble = ctx.createBiquadFilter();
        this.tsTreble.type = 'highshelf';
        this.tsTreble.frequency.value = 3500;
        this.tsTreble.gain.value = -5;

        this.presence = ctx.createBiquadFilter();
        this.presence.type = 'peaking';
        this.presence.frequency.value = 2200;
        this.presence.Q.value = 2.0;
        this.presence.gain.value = 4;

        // Upper mid aggression — adds snarl and cut
        this.upperMidPush = ctx.createBiquadFilter();
        this.upperMidPush.type = 'peaking';
        this.upperMidPush.frequency.value = 1600;
        this.upperMidPush.Q.value = 1.8;
        this.upperMidPush.gain.value = 3;

        // Cabinet simulation — tight and punchy 4x12
        this.cabLP = ctx.createBiquadFilter();
        this.cabLP.type = 'lowpass';
        this.cabLP.frequency.value = 4200;
        this.cabLP.Q.value = 0.8;

        this.cabHP = ctx.createBiquadFilter();
        this.cabHP.type = 'highpass';
        this.cabHP.frequency.value = 75;
        this.cabHP.Q.value = 0.8;

        this.cabResonance = ctx.createBiquadFilter();
        this.cabResonance.type = 'peaking';
        this.cabResonance.frequency.value = 2800;
        this.cabResonance.Q.value = 3.0;
        this.cabResonance.gain.value = 6;

        this.cabBody = ctx.createBiquadFilter();
        this.cabBody.type = 'peaking';
        this.cabBody.frequency.value = 400;
        this.cabBody.Q.value = 1.5;
        this.cabBody.gain.value = 5;

        // Power amp compression — tight and aggressive
        this.powerComp = ctx.createDynamicsCompressor();
        this.powerComp.threshold.value = -14;
        this.powerComp.knee.value = 6;
        this.powerComp.ratio.value = 6;
        this.powerComp.attack.value = 0.003;
        this.powerComp.release.value = 0.08;

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
        this.masterGain.gain.value = 0.22;

        // Wah-wah filter (peaking, inline — transparent when off)
        this.wahFilter = ctx.createBiquadFilter();
        this.wahFilter.type = 'peaking';
        this.wahFilter.frequency.value = 600;
        this.wahFilter.Q.value = 0.5;
        this.wahFilter.gain.value = 0;

        this.wahLFO = ctx.createOscillator();
        this.wahLFO.type = 'triangle';
        this.wahLFO.frequency.value = 2.0;
        this.wahLFO.start();

        this.wahLFOGain = ctx.createGain();
        this.wahLFOGain.gain.value = 0;
        this.wahLFO.connect(this.wahLFOGain);
        this.wahLFOGain.connect(this.wahFilter.frequency);

        // Wire the chain
        this.inputGain.connect(this.preampDrive);
        this.preampDrive.connect(this.preampDrive2);
        this.preampDrive2.connect(this.wahFilter);
        this.wahFilter.connect(this.tsBass);
        this.tsBass.connect(this.tsMid);
        this.tsMid.connect(this.tsTreble);
        this.tsTreble.connect(this.presence);
        this.presence.connect(this.upperMidPush);
        this.upperMidPush.connect(this.cabHP);
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
            // Asymmetric tube clipping: positive soft (triode plate limiting),
            // negative harder (grid current cutoff) — generates warm even harmonics
            const bias = 0.04;
            const xb = x + bias;
            let y;
            if (xb >= 0) {
                y = Math.tanh(xb * drive * 0.8) * 0.95;
                y += Math.sin(xb * Math.PI * drive * 0.3) * 0.04;
            } else {
                y = -Math.tanh(-xb * drive * 1.4) * 0.98;
                y *= 1.0 - Math.exp(xb * drive * 2.0) * 0.06;
            }
            curve[i] = Math.max(-1.0, Math.min(1.0, y));
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
        const attack = palmMute ? 0.006 : 0.012;
        const decay = palmMute ? 0.03 : 0.06;
        const sustainLevel = palmMute ? 0.12 : 0.18;
        const release = palmMute ? 0.025 : 0.10;
        const sustainTime = Math.max(0.01, duration - attack - decay - release);

        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(sustainLevel * 1.3, startTime + attack);
        noteGain.gain.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.001), startTime + attack + decay);
        noteGain.gain.setValueAtTime(sustainLevel * 0.85, startTime + Math.max(attack + decay, duration - release));
        noteGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

        const oscs = [];
        // 6 detuned sawtooth oscillators for massive wall of sound
        [-6, 6, -14, 14, -22, 22].forEach((det, idx) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = det;
            oscs.push({ osc, gain: idx < 2 ? 0.18 : idx < 4 ? 0.10 : 0.05 });
        });

        // Power chord fifth — beefier
        const fifthOsc = this.ctx.createOscillator();
        fifthOsc.type = 'sawtooth';
        fifthOsc.frequency.value = freq * 1.5;
        fifthOsc.detune.value = 4;
        oscs.push({ osc: fifthOsc, gain: 0.14 });

        // Doubled fifth with slight detune for width
        const fifthOsc2 = this.ctx.createOscillator();
        fifthOsc2.type = 'sawtooth';
        fifthOsc2.frequency.value = freq * 1.5;
        fifthOsc2.detune.value = -8;
        oscs.push({ osc: fifthOsc2, gain: 0.08 });

        // Sub octave — heavier
        const subOsc = this.ctx.createOscillator();
        subOsc.type = 'sawtooth';
        subOsc.frequency.value = freq * 0.5;
        oscs.push({ osc: subOsc, gain: 0.22 });

        // 2nd harmonic sweetener — hotter
        const harmOsc = this.ctx.createOscillator();
        harmOsc.type = 'sine';
        harmOsc.frequency.value = freq * 2;
        oscs.push({ osc: harmOsc, gain: 0.06 });

        // Pick transient — hotter for more attack bite
        const pickDur = 0.025;
        const pickBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * pickDur), this.ctx.sampleRate);
        const pd = pickBuf.getChannelData(0);
        for (let i = 0; i < pd.length; i++) pd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (pd.length * 0.06));
        const pickSrc = this.ctx.createBufferSource();
        pickSrc.buffer = pickBuf;
        const pickGain = this.ctx.createGain();
        pickGain.gain.value = palmMute ? 0.22 : 0.15;
        const pickFilter = this.ctx.createBiquadFilter();
        pickFilter.type = 'bandpass';
        pickFilter.frequency.value = freq * 3;
        pickFilter.Q.value = 1.5;

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

        // Vibrato with delayed onset (natural playing style)
        if (!palmMute && duration > 0.3) {
            const vibLFO = this.ctx.createOscillator();
            vibLFO.type = 'sine';
            vibLFO.frequency.value = 4.5 + Math.random() * 1.5;
            const vibGain = this.ctx.createGain();
            const vibDelay = Math.min(duration * 0.35, 0.3);
            const vibPeak = Math.min(duration * 0.7, 0.8);
            vibGain.gain.setValueAtTime(0, startTime);
            vibGain.gain.linearRampToValueAtTime(0, startTime + vibDelay);
            vibGain.gain.linearRampToValueAtTime(freq * 0.006, startTime + vibPeak);
            vibLFO.connect(vibGain);
            oscs.forEach(({ osc }) => vibGain.connect(osc.frequency));
            vibLFO.start(startTime);
            vibLFO.stop(startTime + duration + 0.05);
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

    killAllNotes() {
        const old = this.inputGain;
        this.inputGain = this.ctx.createGain();
        this.inputGain.gain.value = 0.6;
        this.inputGain.connect(this.preampDrive);
        try {
            old.gain.setValueAtTime(old.gain.value, this.ctx.currentTime);
            old.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.015);
        } catch(e) {}
        setTimeout(() => { try { old.disconnect(); } catch(e) {} }, 100);
    }

    setDoomTone() {
        this.tsBass.gain.value = 6;
        this.tsMid.gain.value = -1;
        this.tsTreble.gain.value = -7;
        this.cabLP.frequency.value = 3800;
        this.preampDrive.curve = this._tubeSaturation(9.0);
        this.preampDrive2.curve = this._tubeSaturation(5.0);
        this.delay.delayTime.value = 0.45;
        this.delayFB.gain.value = 0.18;
        this.delayWet.gain.value = 0.06;
        this.reverbWet.gain.value = 0.1;
        this.masterGain.gain.value = 0.22;
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
        this.tsBass.gain.value = 8;
        this.tsMid.gain.value = 1;
        this.tsTreble.gain.value = -8;
        this.cabLP.frequency.value = 3200;
        this.preampDrive.curve = this._tubeSaturation(11.0);
        this.preampDrive2.curve = this._tubeSaturation(6.0);
        this.delay.delayTime.value = 0.35;
        this.delayFB.gain.value = 0.1;
        this.delayWet.gain.value = 0.03;
        this.reverbWet.gain.value = 0.06;
        this.masterGain.gain.value = 0.24;
    }

    setOmCleanTone() {
        // Minimal guitar for OM - bass leads the way
        this.tsBass.gain.value = 3;
        this.tsMid.gain.value = 0;
        this.tsTreble.gain.value = -4;
        this.cabLP.frequency.value = 5000;
        this.preampDrive.curve = this._tubeSaturation(3.0);
        this.preampDrive2.curve = this._tubeSaturation(2.0);
        this.delay.delayTime.value = 0.55;
        this.delayFB.gain.value = 0.3;
        this.delayWet.gain.value = 0.15;
        this.reverbWet.gain.value = 0.25;
        this.masterGain.gain.value = 0.12;
    }

    setFuzzTone() {
        // Gnarly octave fuzz - Think Big Muff + Octavia
        // Hard asymmetric clipping with octave-up rectification character
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            // Full-wave rectification for octave-up + hard clip
            const rect = Math.abs(x);
            const hardClip = Math.max(-0.8, Math.min(0.8, x * 14.0));
            // Mix rectified (octave) with hard-clipped for gnarly fuzz
            curve[i] = hardClip * 0.6 + (rect * 2.0 - 1.0) * 0.4;
            curve[i] = Math.max(-1.0, Math.min(1.0, curve[i]));
        }
        this.preampDrive.curve = curve;
        // Second stage: softer saturation to round out the harsh edges
        this.preampDrive2.curve = this._tubeSaturation(5.0);
        // Scooped mids, boosted bass & presence for that velcro fuzz character
        this.tsBass.gain.value = 8;
        this.tsMid.gain.value = -4;
        this.tsTreble.gain.value = -5;
        this.presence.gain.value = 6;
        this.cabLP.frequency.value = 3600;
        this.cabHP.frequency.value = 90;
        this.cabResonance.gain.value = 7;
        // Minimal delay, some reverb for space
        this.delay.delayTime.value = 0.30;
        this.delayFB.gain.value = 0.08;
        this.delayWet.gain.value = 0.03;
        this.reverbWet.gain.value = 0.08;
        this.masterGain.gain.value = 0.24;
    }

    fadeOut() { this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5); }
    fadeIn() {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.22, this.ctx.currentTime + 0.5);
    }

    enableWah(rate = 2.0) {
        this.wahFilter.Q.value = 8;
        this.wahFilter.gain.value = 15;
        this.wahFilter.frequency.value = 600;
        this.wahLFO.frequency.value = rate;
        this.wahLFOGain.gain.value = 500;
    }

    disableWah() {
        this.wahFilter.Q.value = 0.5;
        this.wahFilter.gain.value = 0;
        this.wahLFOGain.gain.value = 0;
    }

    set70sTone() {
        // Warm crunchy 70s tone — pushed hard like Iommi
        this.tsBass.gain.value = 5;
        this.tsMid.gain.value = 3;
        this.tsTreble.gain.value = -3;
        this.cabLP.frequency.value = 4800;
        this.preampDrive.curve = this._tubeSaturation(6.0);
        this.preampDrive2.curve = this._tubeSaturation(3.5);
        this.delay.delayTime.value = 0.40;
        this.delayFB.gain.value = 0.15;
        this.delayWet.gain.value = 0.05;
        this.reverbWet.gain.value = 0.12;
        this.masterGain.gain.value = 0.22;
        this.disableWah();
    }
}


// =====================================================
// ===== BASS GUITAR ==================================
// =====================================================

class BassGuitar {
    constructor(ctx, dest) {
        this.ctx = ctx;

        // Dual-stage drive for massive bass distortion
        this.drive = ctx.createWaveShaper();
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; curve[i] = Math.tanh(x * 3.5); }
        this.drive.curve = curve;
        this.drive.oversample = '4x';

        this.drive2 = ctx.createWaveShaper();
        const curve2 = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; curve2[i] = Math.tanh(x * 2.0); }
        this.drive2.curve = curve2;
        this.drive2.oversample = '2x';

        this.bassBoost = ctx.createBiquadFilter();
        this.bassBoost.type = 'lowshelf';
        this.bassBoost.frequency.value = 150;
        this.bassBoost.gain.value = 9;

        // Low-mid growl
        this.lowMidGrowl = ctx.createBiquadFilter();
        this.lowMidGrowl.type = 'peaking';
        this.lowMidGrowl.frequency.value = 800;
        this.lowMidGrowl.Q.value = 1.2;
        this.lowMidGrowl.gain.value = 3;

        this.midCut = ctx.createBiquadFilter();
        this.midCut.type = 'peaking';
        this.midCut.frequency.value = 500;
        this.midCut.Q.value = 1.0;
        this.midCut.gain.value = -3;

        // Sub enhancement
        this.subBoost = ctx.createBiquadFilter();
        this.subBoost.type = 'peaking';
        this.subBoost.frequency.value = 60;
        this.subBoost.Q.value = 1.5;
        this.subBoost.gain.value = 5;

        this.cabLP = ctx.createBiquadFilter();
        this.cabLP.type = 'lowpass';
        this.cabLP.frequency.value = 3200;
        this.cabLP.Q.value = 0.8;

        this.comp = ctx.createDynamicsCompressor();
        this.comp.threshold.value = -16;
        this.comp.ratio.value = 8;
        this.comp.attack.value = 0.002;
        this.comp.release.value = 0.12;

        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.30;

        this._noteInput = ctx.createGain();
        this._noteInput.gain.value = 1.0;
        this._noteInput.connect(this.drive);

        this.drive.connect(this.drive2);
        this.drive2.connect(this.bassBoost);
        this.bassBoost.connect(this.subBoost);
        this.subBoost.connect(this.lowMidGrowl);
        this.lowMidGrowl.connect(this.midCut);
        this.midCut.connect(this.cabLP);
        this.cabLP.connect(this.comp);
        this.comp.connect(this.masterGain);
        this.masterGain.connect(dest);
    }

    playNote(freq, startTime, duration) {
        if (freq <= 0) return;

        const noteGain = this.ctx.createGain();
        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(0.26, startTime + 0.008);
        noteGain.gain.setValueAtTime(0.20, startTime + Math.max(0.02, duration - 0.06));
        noteGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

        // Fundamental sine — heavier
        const fund = this.ctx.createOscillator();
        fund.type = 'sine';
        fund.frequency.value = freq;
        const fundG = this.ctx.createGain(); fundG.gain.value = 0.38;
        fund.connect(fundG); fundG.connect(noteGain);

        // Gritty triangle — louder for more grind
        const grit = this.ctx.createOscillator();
        grit.type = 'triangle';
        grit.frequency.value = freq;
        grit.detune.value = 3;
        const gritG = this.ctx.createGain(); gritG.gain.value = 0.22;
        grit.connect(gritG); gritG.connect(noteGain);

        // Sawtooth grit layer for harmonic richness
        const sawGrit = this.ctx.createOscillator();
        sawGrit.type = 'sawtooth';
        sawGrit.frequency.value = freq;
        sawGrit.detune.value = -5;
        const sawGritG = this.ctx.createGain(); sawGritG.gain.value = 0.12;
        sawGrit.connect(sawGritG); sawGritG.connect(noteGain);

        // Sub octave — massive
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = freq * 0.5;
        const subG = this.ctx.createGain(); subG.gain.value = 0.28;
        sub.connect(subG); subG.connect(noteGain);

        // 2nd harmonic for presence
        const harm = this.ctx.createOscillator();
        harm.type = 'sine';
        harm.frequency.value = freq * 2;
        const harmG = this.ctx.createGain(); harmG.gain.value = 0.06;
        harm.connect(harmG); harmG.connect(noteGain);

        // Finger noise — heavier thump
        const noiseDur = 0.02;
        const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseDur), this.ctx.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * 0.04));
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseG = this.ctx.createGain(); noiseG.gain.value = 0.12;
        const noiseF = this.ctx.createBiquadFilter();
        noiseF.type = 'bandpass'; noiseF.frequency.value = freq * 2; noiseF.Q.value = 2;
        noiseSrc.connect(noiseF); noiseF.connect(noiseG); noiseG.connect(noteGain);

        noteGain.connect(this._noteInput);

        const stopTime = startTime + duration + 0.05;
        [fund, grit, sawGrit, sub, harm].forEach(o => { o.start(startTime); o.stop(stopTime); });
        noiseSrc.start(startTime);

        setTimeout(() => {
            [fund, grit, sawGrit, sub, harm].forEach(o => { try { o.disconnect(); } catch(e){} });
            try { noteGain.disconnect(); noiseSrc.disconnect(); } catch(e){}
        }, (stopTime - this.ctx.currentTime) * 1000 + 300);
    }

    killAllNotes() {
        const old = this._noteInput;
        this._noteInput = this.ctx.createGain();
        this._noteInput.gain.value = 1.0;
        this._noteInput.connect(this.drive);
        try {
            old.gain.setValueAtTime(old.gain.value, this.ctx.currentTime);
            old.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.015);
        } catch(e) {}
        setTimeout(() => { try { old.disconnect(); } catch(e) {} }, 100);
    }

    fadeOut() { this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5); }
    fadeIn() {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.30, this.ctx.currentTime + 0.5);
    }

    setOmTone() {
        // Al Cisneros' massive Orange/Matamp bass tone - rich overtones
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; curve[i] = Math.tanh(x * 5.0); }
        this.drive.curve = curve;
        const c2 = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; c2[i] = Math.tanh(x * 2.5); }
        this.drive2.curve = c2;
        this.bassBoost.gain.value = 12;
        this.subBoost.gain.value = 7;
        this.midCut.gain.value = -1;
        this.lowMidGrowl.gain.value = 4;
        this.cabLP.frequency.value = 3500;
        this.masterGain.gain.value = 0.36;
    }

    setSleepTone() {
        // Fuzz bass matching Sleep's crushing guitar wall
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; curve[i] = Math.tanh(x * 6.0); }
        this.drive.curve = curve;
        const c2 = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; c2[i] = Math.tanh(x * 3.0); }
        this.drive2.curve = c2;
        this.bassBoost.gain.value = 10;
        this.subBoost.gain.value = 6;
        this.midCut.gain.value = -5;
        this.lowMidGrowl.gain.value = 2;
        this.cabLP.frequency.value = 2500;
        this.masterGain.gain.value = 0.34;
    }

    setDoomTone() {
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; curve[i] = Math.tanh(x * 3.5); }
        this.drive.curve = curve;
        const c2 = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; c2[i] = Math.tanh(x * 2.0); }
        this.drive2.curve = c2;
        this.bassBoost.gain.value = 9;
        this.subBoost.gain.value = 5;
        this.midCut.gain.value = -3;
        this.lowMidGrowl.gain.value = 3;
        this.cabLP.frequency.value = 3200;
        this.masterGain.gain.value = 0.30;
    }

    setFuzzTone() {
        // Massive fuzz bass - woolly Muff-style overdrive
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i*2)/n - 1;
            curve[i] = Math.tanh(x * 7.0) * 0.85 + Math.sin(x * Math.PI) * 0.15;
        }
        this.drive.curve = curve;
        const c2 = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; c2[i] = Math.tanh(x * 3.5); }
        this.drive2.curve = c2;
        this.bassBoost.gain.value = 11;
        this.subBoost.gain.value = 7;
        this.midCut.gain.value = -2;
        this.lowMidGrowl.gain.value = 4;
        this.cabLP.frequency.value = 2800;
        this.masterGain.gain.value = 0.32;
    }

    set70sTone() {
        // 70s bass — warm and round with more body
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; curve[i] = Math.tanh(x * 2.8); }
        this.drive.curve = curve;
        const c2 = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i*2)/n - 1; c2[i] = Math.tanh(x * 1.5); }
        this.drive2.curve = c2;
        this.bassBoost.gain.value = 7;
        this.subBoost.gain.value = 4;
        this.midCut.gain.value = -1;
        this.lowMidGrowl.gain.value = 3;
        this.cabLP.frequency.value = 3500;
        this.masterGain.gain.value = 0.30;
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

    killAllNotes() {
        const old = this.padInput;
        this.padInput = this.ctx.createGain();
        this.padInput.gain.value = 1.0;
        this.padInput.connect(this.phaserStages[0]);
        try {
            old.gain.setValueAtTime(old.gain.value, this.ctx.currentTime);
            old.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.015);
        } catch(e) {}
        setTimeout(() => { try { old.disconnect(); } catch(e) {} }, 100);
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
// ===== HAMMOND ORGAN (70s Tonewheel + Leslie) =======
// =====================================================

class HammondOrgan {
    constructor(ctx, dest) {
        this.ctx = ctx;

        // Leslie speaker tremolo (amplitude modulation from rotating horn)
        this.tremoloLFO = ctx.createOscillator();
        this.tremoloLFO.type = 'sine';
        this.tremoloLFO.frequency.value = 0.8;
        this.tremoloLFO.start();
        this.tremoloGain = ctx.createGain();
        this.tremoloGain.gain.value = 0.15;
        this.tremoloLFO.connect(this.tremoloGain);

        // Leslie vibrato (pitch modulation from rotating horn)
        this.vibratoLFO = ctx.createOscillator();
        this.vibratoLFO.type = 'sine';
        this.vibratoLFO.frequency.value = 0.8;
        this.vibratoLFO.start();

        // Leslie Doppler delay
        this.leslieDelay = ctx.createDelay(0.02);
        this.leslieDelay.delayTime.value = 0.003;
        this.leslieDelayLFO = ctx.createOscillator();
        this.leslieDelayLFO.type = 'sine';
        this.leslieDelayLFO.frequency.value = 0.8;
        this.leslieDelayLFO.start();
        this.leslieDelayDepth = ctx.createGain();
        this.leslieDelayDepth.gain.value = 0.002;
        this.leslieDelayLFO.connect(this.leslieDelayDepth);
        this.leslieDelayDepth.connect(this.leslieDelay.delayTime);

        // Overdrive (cranked preamp for dirty organ)
        this.overdrive = ctx.createWaveShaper();
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = Math.tanh(x * 1.5);
        }
        this.overdrive.curve = curve;
        this.overdrive.oversample = '2x';

        // Tone shaping
        this.bassEQ = ctx.createBiquadFilter();
        this.bassEQ.type = 'lowshelf';
        this.bassEQ.frequency.value = 200;
        this.bassEQ.gain.value = 2;

        this.trebleEQ = ctx.createBiquadFilter();
        this.trebleEQ.type = 'highshelf';
        this.trebleEQ.frequency.value = 3000;
        this.trebleEQ.gain.value = -3;

        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.0;

        // Signal chain: input → overdrive → EQ → leslie delay → masterGain
        this.inputGain = ctx.createGain();
        this.inputGain.gain.value = 0.7;

        this.inputGain.connect(this.overdrive);
        this.overdrive.connect(this.bassEQ);
        this.bassEQ.connect(this.trebleEQ);
        this.trebleEQ.connect(this.leslieDelay);
        this.leslieDelay.connect(this.masterGain);

        // Tremolo modulates master volume
        this.tremoloGain.connect(this.masterGain.gain);

        this.masterGain.connect(dest);
    }

    // Hammond drawbar harmonic ratios:
    // 16'   5-1/3'  8'    4'    2-2/3'  2'    1-3/5'  1-1/3'  1'
    // 0.5   1.5     1.0   2.0   3.0     4.0   5.0     6.0     8.0
    _drawbarRatios() {
        return [0.5, 1.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0];
    }

    _getDrawbars(preset) {
        const presets = {
            default: [8, 8, 8, 0, 0, 0, 0, 0, 0],   // Gospel: warm fundamental
            full:    [8, 8, 8, 8, 8, 8, 8, 8, 8],   // All drawbars full: massive
            jazz:    [8, 3, 8, 0, 0, 0, 0, 0, 0],   // Jazz/soul: hollow
            rock:    [8, 8, 8, 6, 4, 6, 0, 0, 0],   // Rock organ: biting
            doom:    [8, 8, 8, 8, 0, 4, 0, 8, 0],   // Doom: deep + shrill
        };
        return presets[preset] || presets.default;
    }

    playChord(freqs, startTime, duration, drawbarPreset = 'default') {
        if (!freqs || freqs.length === 0) return;
        const bars = this._getDrawbars(drawbarPreset);
        const ratios = this._drawbarRatios();

        freqs.forEach(freq => {
            const noteGain = this.ctx.createGain();
            const attack = 0.02;
            const release = 0.08;
            noteGain.gain.setValueAtTime(0.0001, startTime);
            noteGain.gain.linearRampToValueAtTime(0.08, startTime + attack);
            noteGain.gain.setValueAtTime(0.07, startTime + Math.max(attack, duration - release));
            noteGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

            // Key click (percussion transient)
            const clickDur = 0.012;
            const clickBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * clickDur), this.ctx.sampleRate);
            const cd = clickBuf.getChannelData(0);
            for (let i = 0; i < cd.length; i++) {
                cd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (cd.length * 0.06));
            }
            const clickSrc = this.ctx.createBufferSource();
            clickSrc.buffer = clickBuf;
            const clickGain = this.ctx.createGain();
            clickGain.gain.value = 0.06;
            const clickFilter = this.ctx.createBiquadFilter();
            clickFilter.type = 'bandpass';
            clickFilter.frequency.value = freq * 4;
            clickFilter.Q.value = 3;
            clickSrc.connect(clickFilter);
            clickFilter.connect(clickGain);
            clickGain.connect(noteGain);
            clickSrc.start(startTime);

            // Tonewheel harmonics based on drawbar settings
            const voices = [];
            ratios.forEach((ratio, idx) => {
                const level = bars[idx] / 8.0;
                if (level < 0.01) return;

                const osc = this.ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = freq * ratio;

                // Leslie pitch wobble
                const vibG = this.ctx.createGain();
                vibG.gain.value = freq * ratio * 0.003;
                this.vibratoLFO.connect(vibG);
                vibG.connect(osc.frequency);

                const oscGain = this.ctx.createGain();
                oscGain.gain.value = level * 0.04;

                osc.connect(oscGain);
                oscGain.connect(noteGain);
                osc.start(startTime);
                osc.stop(startTime + duration + 0.1);
                voices.push({ osc, vibG });
            });

            noteGain.connect(this.inputGain);

            setTimeout(() => {
                voices.forEach(({ osc, vibG }) => {
                    try { osc.disconnect(); vibG.disconnect(); } catch(e){}
                });
                try { noteGain.disconnect(); clickSrc.disconnect(); } catch(e){}
            }, (startTime + duration - this.ctx.currentTime) * 1000 + 500);
        });
    }

    killAllNotes() {
        const old = this.inputGain;
        this.inputGain = this.ctx.createGain();
        this.inputGain.gain.value = 0.7;
        this.inputGain.connect(this.overdrive);
        try {
            old.gain.setValueAtTime(old.gain.value, this.ctx.currentTime);
            old.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.015);
        } catch(e) {}
        setTimeout(() => { try { old.disconnect(); } catch(e) {} }, 100);
    }

    setLeslieSpeed(speed) {
        const now = this.ctx.currentTime;
        let freq;
        if (speed === 'fast') freq = 6.8;
        else if (speed === 'slow') freq = 0.8;
        else freq = 0.0;

        // Leslie ramp-up/down characteristic (mechanical inertia)
        const rampTime = speed === 'fast' ? 1.5 : 2.5;
        [this.tremoloLFO, this.vibratoLFO, this.leslieDelayLFO].forEach(lfo => {
            lfo.frequency.setValueAtTime(lfo.frequency.value, now);
            lfo.frequency.linearRampToValueAtTime(freq, now + rampTime);
        });
    }

    setDirtyTone() {
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = Math.tanh(x * 4.0);
        }
        this.overdrive.curve = curve;
    }

    setCleanTone() {
        const n = 44100, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = Math.tanh(x * 1.2);
        }
        this.overdrive.curve = curve;
    }

    fadeIn(time = 1.5) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.20, this.ctx.currentTime + time);
    }

    fadeOut(time = 1.5) {
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
        this._dest = dest;

        this.roomVerb = ctx.createConvolver();
        const roomLen = ctx.sampleRate * 1.5;
        const roomBuf = ctx.createBuffer(2, roomLen, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = roomBuf.getChannelData(ch);
            for (let i = 0; i < roomLen; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (roomLen * 0.22)) * 0.6;
            }
        }
        this.roomVerb.buffer = roomBuf;

        this.roomWet = ctx.createGain();
        this.roomWet.gain.value = 0.14;
        this.roomVerb.connect(this.roomWet);
        this.roomWet.connect(dest);

        // Parallel drum compression for punch
        this.parallelComp = ctx.createDynamicsCompressor();
        this.parallelComp.threshold.value = -24;
        this.parallelComp.knee.value = 4;
        this.parallelComp.ratio.value = 10;
        this.parallelComp.attack.value = 0.001;
        this.parallelComp.release.value = 0.06;
        this.parallelWet = ctx.createGain();
        this.parallelWet.gain.value = 0.12;
        this.parallelComp.connect(this.parallelWet);
        this.parallelWet.connect(dest);

        this.dryGain = ctx.createGain();
        this.dryGain.gain.value = 0.38;
        this.dryGain.connect(dest);
        this.dryGain.connect(this.roomVerb);
        this.dryGain.connect(this.parallelComp);

        this.kickVal = 0;
        this.snareVal = 0;
    }

    kick(time, vel = 1.0) {
        const body = this.ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(120 + (Math.random() - 0.5) * 4, time);
        body.frequency.exponentialRampToValueAtTime(30, time + 0.4);

        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(60, time);
        sub.frequency.exponentialRampToValueAtTime(18, time + 0.5);

        const bodyG = this.ctx.createGain();
        bodyG.gain.setValueAtTime(0.72 * vel, time);
        bodyG.gain.exponentialRampToValueAtTime(0.001, time + 0.55);

        const subG = this.ctx.createGain();
        subG.gain.setValueAtTime(0.55 * vel, time);
        subG.gain.exponentialRampToValueAtTime(0.001, time + 0.65);

        // Chest punch — mid-frequency burst for that chest-hitting feel
        const punch = this.ctx.createOscillator();
        punch.type = 'sine';
        punch.frequency.setValueAtTime(160, time);
        punch.frequency.exponentialRampToValueAtTime(80, time + 0.06);
        const punchG = this.ctx.createGain();
        punchG.gain.setValueAtTime(0.35 * vel, time);
        punchG.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        // Beater attack transient — harder
        const beater = this.ctx.createOscillator();
        beater.type = 'triangle';
        beater.frequency.setValueAtTime(1000, time);
        beater.frequency.exponentialRampToValueAtTime(200, time + 0.012);
        const beaterG = this.ctx.createGain();
        beaterG.gain.setValueAtTime(0.35 * vel, time);
        beaterG.gain.exponentialRampToValueAtTime(0.001, time + 0.018);

        // Click transient — sharper
        const clickDur = 0.01;
        const clickBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * clickDur), this.ctx.sampleRate);
        const cd = clickBuf.getChannelData(0);
        for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (cd.length * 0.12));
        const clickSrc = this.ctx.createBufferSource();
        clickSrc.buffer = clickBuf;
        const clickG = this.ctx.createGain();
        clickG.gain.value = 0.40 * vel;
        const clickF = this.ctx.createBiquadFilter();
        clickF.type = 'highpass';
        clickF.frequency.value = 2500;

        body.connect(bodyG); bodyG.connect(this.dryGain);
        sub.connect(subG); subG.connect(this.dryGain);
        punch.connect(punchG); punchG.connect(this.dryGain);
        beater.connect(beaterG); beaterG.connect(this.dryGain);
        clickSrc.connect(clickF); clickF.connect(clickG); clickG.connect(this.dryGain);

        body.start(time); body.stop(time + 0.65);
        sub.start(time); sub.stop(time + 0.75);
        punch.start(time); punch.stop(time + 0.1);
        beater.start(time); beater.stop(time + 0.03);
        clickSrc.start(time);

        const d = Math.max(0, (time - this.ctx.currentTime) * 1000);
        setTimeout(() => this.kickVal = vel, d);
        setTimeout(() => this.kickVal = 0, d + 150);
        setTimeout(() => {
            [body, sub, punch, beater].forEach(o => { try { o.disconnect(); } catch(e){} });
            try { bodyG.disconnect(); subG.disconnect(); punchG.disconnect(); beaterG.disconnect(); clickSrc.disconnect(); } catch(e){}
        }, (time - this.ctx.currentTime) * 1000 + 900);
    }

    snare(time, vel = 1.0) {
        const body = this.ctx.createOscillator();
        body.type = 'triangle';
        body.frequency.setValueAtTime(220 + (Math.random() - 0.5) * 10, time);
        body.frequency.exponentialRampToValueAtTime(120, time + 0.08);

        const bodyG = this.ctx.createGain();
        bodyG.gain.setValueAtTime(0.45 * vel, time);
        bodyG.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        // Snare crack — short bright transient for snap
        const crackDur = 0.015;
        const crackBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * crackDur), this.ctx.sampleRate);
        const crd = crackBuf.getChannelData(0);
        for (let i = 0; i < crd.length; i++) crd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (crd.length * 0.06));
        const crackSrc = this.ctx.createBufferSource();
        crackSrc.buffer = crackBuf;
        const crackG = this.ctx.createGain(); crackG.gain.value = 0.30 * vel;
        const crackHP = this.ctx.createBiquadFilter();
        crackHP.type = 'highpass'; crackHP.frequency.value = 3500;
        crackSrc.connect(crackHP); crackHP.connect(crackG); crackG.connect(this.dryGain);

        // Noise buzz — louder
        const nDur = 0.28;
        const nBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * nDur), this.ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * 0.28));
        const nSrc = this.ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const nG = this.ctx.createGain(); nG.gain.value = 0.35 * vel;
        const nHP = this.ctx.createBiquadFilter();
        nHP.type = 'highpass'; nHP.frequency.value = 1800;
        const nBP = this.ctx.createBiquadFilter();
        nBP.type = 'bandpass'; nBP.frequency.value = 3500; nBP.Q.value = 1.2;

        // Snare wire resonance — much louder for realistic sizzle
        const wireDur = 0.40;
        const wireBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * wireDur), this.ctx.sampleRate);
        const wd = wireBuf.getChannelData(0);
        for (let i = 0; i < wd.length; i++) wd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (wd.length * 0.18));
        const wireSrc = this.ctx.createBufferSource();
        wireSrc.buffer = wireBuf;
        const wireG = this.ctx.createGain(); wireG.gain.value = 0.20 * vel;
        const wireHP = this.ctx.createBiquadFilter();
        wireHP.type = 'highpass'; wireHP.frequency.value = 4500;
        const wireBP = this.ctx.createBiquadFilter();
        wireBP.type = 'bandpass'; wireBP.frequency.value = 7000; wireBP.Q.value = 1.5;

        body.connect(bodyG); bodyG.connect(this.dryGain);
        nSrc.connect(nHP); nHP.connect(nBP); nBP.connect(nG); nG.connect(this.dryGain);
        wireSrc.connect(wireHP); wireHP.connect(wireBP); wireBP.connect(wireG); wireG.connect(this.dryGain);

        body.start(time); body.stop(time + 0.3);
        crackSrc.start(time);
        nSrc.start(time);
        wireSrc.start(time);

        const d = Math.max(0, (time - this.ctx.currentTime) * 1000);
        setTimeout(() => this.snareVal = vel, d);
        setTimeout(() => this.snareVal = 0, d + 100);
        setTimeout(() => {
            try { body.disconnect(); bodyG.disconnect(); crackSrc.disconnect(); crackG.disconnect(); nSrc.disconnect(); nG.disconnect(); wireSrc.disconnect(); wireG.disconnect(); } catch(e){}
        }, (time - this.ctx.currentTime) * 1000 + 600);
    }

    hihat(time, open = false, vel = 1.0) {
        const dur = open ? 0.3 : 0.06;
        const nBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        const decay = open ? 0.5 : 0.08;
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * decay));
        const nSrc = this.ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const g = this.ctx.createGain(); g.gain.value = (open ? 0.18 : 0.15) * vel;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 7500;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = 2;

        nSrc.connect(hp); hp.connect(bp); bp.connect(g); g.connect(this.dryGain);

        // Metallic partials for realistic cymbal tone — brighter
        const metalDur = open ? 0.25 : 0.04;
        [205, 340, 672, 1340].forEach(freq => {
            const osc = this.ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.02);
            const og = this.ctx.createGain();
            og.gain.setValueAtTime(0.025 * vel, time);
            og.gain.exponentialRampToValueAtTime(0.001, time + metalDur);
            osc.connect(og); og.connect(this.dryGain);
            osc.start(time); osc.stop(time + metalDur + 0.01);
        });

        nSrc.start(time);

        setTimeout(() => { try { nSrc.disconnect(); g.disconnect(); } catch(e){} },
            (time - this.ctx.currentTime) * 1000 + 500);
    }

    ride(time, bell = false, vel = 1.0) {
        const dur = 0.8;
        const nBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * 0.6));
        const nSrc = this.ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const g = this.ctx.createGain(); g.gain.value = 0.1 * vel;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 5000;
        const pk = this.ctx.createBiquadFilter();
        pk.type = 'peaking'; pk.frequency.value = 8000; pk.Q.value = 3; pk.gain.value = 4;

        nSrc.connect(hp); hp.connect(pk); pk.connect(g); g.connect(this.dryGain);

        // Metallic ring partials
        [340, 710, 1420, 2850].forEach(freq => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.015);
            const og = this.ctx.createGain();
            og.gain.setValueAtTime(0.01 * vel, time);
            og.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
            osc.connect(og); og.connect(this.dryGain);
            osc.start(time); osc.stop(time + 0.55);
        });

        if (bell) {
            const bellOsc = this.ctx.createOscillator();
            bellOsc.type = 'sine';
            bellOsc.frequency.value = 4200;
            const bellG = this.ctx.createGain();
            bellG.gain.setValueAtTime(0.04 * vel, time);
            bellG.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
            bellOsc.connect(bellG); bellG.connect(this.dryGain);
            bellOsc.start(time); bellOsc.stop(time + 0.6);
        }

        nSrc.start(time);
        setTimeout(() => { try { nSrc.disconnect(); g.disconnect(); } catch(e){} },
            (time - this.ctx.currentTime) * 1000 + 1000);
    }

    tom(time, pitch = 'mid', vel = 1.0) {
        const freqs = { high: 200, mid: 140, low: 85 };
        const f = freqs[pitch] || 140;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * (1 + (Math.random() - 0.5) * 0.03), time);
        osc.frequency.exponentialRampToValueAtTime(f * 0.45, time + 0.35);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.60 * vel, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.40);
        // Skin overtone — beefier
        const ot = this.ctx.createOscillator();
        ot.type = 'sine';
        ot.frequency.setValueAtTime(f * 1.6, time);
        ot.frequency.exponentialRampToValueAtTime(f * 0.8, time + 0.15);
        const otg = this.ctx.createGain();
        otg.gain.setValueAtTime(0.22 * vel, time);
        otg.gain.exponentialRampToValueAtTime(0.001, time + 0.20);

        osc.connect(g); g.connect(this.dryGain);
        ot.connect(otg); otg.connect(this.dryGain);
        osc.start(time); osc.stop(time + 0.4);
        ot.start(time); ot.stop(time + 0.2);
        setTimeout(() => { try { osc.disconnect(); g.disconnect(); ot.disconnect(); otg.disconnect(); } catch(e){} },
            (time - this.ctx.currentTime) * 1000 + 500);
    }

    crash(time, vel = 1.0) {
        const dur = 1.5;
        const nBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nd.length * 0.5));
        const nSrc = this.ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const g = this.ctx.createGain(); g.gain.value = 0.2 * vel;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 4000;

        nSrc.connect(hp); hp.connect(g); g.connect(this.dryGain);

        // Metallic ring for crash cymbal
        [370, 740, 1100, 2200].forEach(freq => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.03);
            const og = this.ctx.createGain();
            og.gain.setValueAtTime(0.02 * vel, time);
            og.gain.exponentialRampToValueAtTime(0.001, time + 1.0);
            osc.connect(og); og.connect(this.dryGain);
            osc.start(time); osc.stop(time + 1.1);
        });

        nSrc.start(time);
        setTimeout(() => { try { nSrc.disconnect(); g.disconnect(); } catch(e){} },
            (time - this.ctx.currentTime) * 1000 + 2000);
    }

    setSpaceRoom() {
        this.roomWet.gain.value = 0.24;
        this.dryGain.gain.value = 0.34;
        this.parallelWet.gain.value = 0.10;
    }

    setDoomRoom() {
        this.roomWet.gain.value = 0.14;
        this.dryGain.gain.value = 0.38;
        this.parallelWet.gain.value = 0.14;
    }

    killAllNotes() {
        const old = this.dryGain;
        this.dryGain = this.ctx.createGain();
        this.dryGain.gain.value = 0.38;
        this.dryGain.connect(this._dest);
        this.dryGain.connect(this.roomVerb);
        this.dryGain.connect(this.parallelComp);
        try {
            old.gain.setValueAtTime(old.gain.value, this.ctx.currentTime);
            old.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.015);
        } catch(e) {}
        setTimeout(() => { try { old.disconnect(); } catch(e) {} }, 100);
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
                drums: "K--hS--hK-KhS--h|K--hS--hK-KhSOhH",
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
                drums: "K-hKh-S-K-hKh-Sh|K-hKh-S-K-hKThTL",
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
                drums: "K-H-S-H-KhH-S-Hh|K-H-S-H-KhH-SOH-",
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
                drums: "K-R-S-R-KhR-S-Rr|K-R-S-R-KhR-SORB",
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
                drums: "K-RBS-RBKhRrS-RB|KkRBS-RBKhRrSOH-",
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
                drums: "K-h-S-H-KhHkS-Hh|K-hkS-H-KhH-SOHT",
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
                drums: "K---h---S---h---|K---h---S---ThTL",
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
                drums: "K-R-S-RrKhRBS-Rr|KkRBS-R-KhR-SOH-",
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
                drums: "K-hKS-H-KkhKS-Hh|K-hKS-HkKkhKSOHT",
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
                drums: "K--hS-shK-KhS--h|K-khS-shK-KhS-TL",
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
                drums: "K-H-S-HhKhHkS-Hh|K-HkS-HhKhH-SOH-",
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
                drums: "K-RBS-RBKkRBS-RB|KkRBS-RBKkRBSOH-",
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
                drums: "K--kh--sS---h---|K-k-h--sS---h-TL",
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
                drums: "K-KhS-shK-KhS-sh|K-KhS-shKkKhShTL",
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
                drums: "K--hS-shK-KhS-kh|K-khS-shK--hShTL",
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
                drums: "K-H-S-HhK-HkSOH-|KkH-S-HhK-HkSOH-",
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
                drums: "K--kh--sS--sh---|K-k-h--sS---h-TL",
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
                drums: "K-R-r-RrK-R-r-Rr|KkR-r-R-K-R-r-RB",
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
                drums: "K-RrR-RBKkRrs-RB|K-RrR-RBKkRrSORB",
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
                drums: "K-R-S-RrKhRkS-RB|KkR-S-R-KhR-SORB",
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
                drums: "K-R-S-RrKhR-SOH-|KkR-S-RBKhR-SORB",
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
                drums: "K---r--sR---r---|K-k-r--sR---r-RB",
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
                drums: "K--kh--sS--sh---|K-k-h--sS---ThTL",
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
                drums: "K-KhS-shKkKhS-sh|K-KhS-shKkKhShTL",
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
                drums: "K--kh--sS---h---|K-k-h-------ThTL",
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
                drums: "K--hS-shK-KhS-kh|K-khS-shK-KhSOhH",
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
                drums: "K-hKh-SkKkhKh-Sh|KkhKh-S-KkhKThTL",
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
                drums: "K--kh--sS---h---|K-k-h--sh---ShTL",
                padChord: null,
                arp: null,
            },
        ]
    },
    {
        name: "IRON WORSHIP",
        style: "70s",
        sections: [
            {
                name: "RITE OF THE RIFF",
                genre: 0.0, bpm: 54, repeats: 3, visualMode: 0,
                guitar: [
                    { f: N.E1, dur: 4 },
                    { f: N.R, dur: 1 },
                    { f: N.E1, dur: 2, pm: true },
                    { f: N.Bb1, dur: 1, slide: true },
                    { f: N.A1, dur: 2 },
                    { f: N.G1, dur: 1 },
                    { f: N.E1, dur: 1 },
                    { f: N.E1, dur: 3, pm: true },
                    { f: N.R, dur: 1 },
                ],
                bass: [
                    { f: N.E1, dur: 4 }, { f: N.R, dur: 1 },
                    { f: N.E1, dur: 2 }, { f: N.Bb1, dur: 1 },
                    { f: N.A1, dur: 2 }, { f: N.G1, dur: 1 }, { f: N.E1, dur: 1 },
                    { f: N.E1, dur: 3 }, { f: N.R, dur: 1 },
                ],
                drums: "K--kh--sS--sh---|K-k-h--sS---ThTL",
                padChord: null, arp: null, organ: null,
            },
            {
                name: "HAMMER OF THE RIFF",
                genre: 0.0, bpm: 68, repeats: 4, visualMode: 1,
                guitar: [
                    { f: N.E1, dur: 2 },
                    { f: N.G1, dur: 1 },
                    { f: N.A1, dur: 1 },
                    { f: N.Bb1, dur: 3 },
                    { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 2 },
                    { f: N.E1, dur: 2 },
                    { f: N.F1, dur: 2 },
                    { f: N.E1, dur: 2 },
                ],
                bass: [
                    { f: N.E1, dur: 2 }, { f: N.G1, dur: 1 }, { f: N.A1, dur: 1 },
                    { f: N.Bb1, dur: 3 }, { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 2 }, { f: N.E1, dur: 2 },
                    { f: N.F1, dur: 2 }, { f: N.E1, dur: 2 },
                ],
                drums: "K-KhS-shKkKhS-sh|KkKhS-shKkKhSOhH",
                padChord: null, arp: null,
                organ: { chord: [N.E3, N.G3, N.Bb3], drawbars: 'full' },
            },
            {
                name: "WICKED PHASE",
                genre: 0.15, bpm: 72, repeats: 3, visualMode: 1, wahGuitar: true,
                guitar: [
                    { f: N.E2, dur: 1 }, { f: N.G2, dur: 1 },
                    { f: N.A2, dur: 2 },
                    { f: N.E2, dur: 1 }, { f: N.Bb2, dur: 1 },
                    { f: N.A2, dur: 1 }, { f: N.G2, dur: 1 },
                    { f: N.E2, dur: 2 },
                    { f: N.D2, dur: 1 }, { f: N.E2, dur: 1 },
                    { f: N.G2, dur: 2 },
                    { f: N.A2, dur: 1 }, { f: N.E2, dur: 1 },
                ],
                bass: [
                    { f: N.E1, dur: 4 }, { f: N.A1, dur: 4 },
                    { f: N.E1, dur: 2 }, { f: N.D1, dur: 2 },
                    { f: N.G1, dur: 2 }, { f: N.E1, dur: 2 },
                ],
                drums: "K-H-S-HhKhHkS-Hh|KkH-S-HhKhH-SOH-",
                padChord: null, arp: null,
                organ: { chord: [N.E3, N.A3, N.B3], drawbars: 'jazz' },
            },
            {
                name: "CATHEDRAL OF SOUND",
                genre: 0.45, bpm: 76, repeats: 3, visualMode: 2,
                guitar: [
                    { f: N.E2, dur: 3 }, { f: N.G2, dur: 1 },
                    { f: N.A2, dur: 2 }, { f: N.B2, dur: 2 },
                    { f: N.D3, dur: 3 }, { f: N.B2, dur: 1 },
                    { f: N.A2, dur: 2 }, { f: N.G2, dur: 1 }, { f: N.E2, dur: 1 },
                ],
                bass: [
                    { f: N.E1, dur: 4 }, { f: N.A1, dur: 4 },
                    { f: N.D2, dur: 4 }, { f: N.A1, dur: 2 }, { f: N.E1, dur: 2 },
                ],
                drums: "K-R-S-RrKhRkS-Rr|KkR-S-RrKhR-SORB",
                padChord: [N.E3, N.G3, N.B3],
                arp: null,
                organ: { chord: [N.E3, N.G3, N.B3, N.D4], drawbars: 'full', leslie: 'fast' },
            },
            {
                name: "DESCENT INTO FUZZ",
                genre: 0.0, bpm: 60, repeats: 4, visualMode: 0, style: 'fuzz',
                guitar: [
                    { f: N.E1, dur: 3 },
                    { f: N.R, dur: 1 },
                    { f: N.E1, dur: 2, pm: true },
                    { f: N.F1, dur: 1, slide: true },
                    { f: N.E1, dur: 1 },
                    { f: N.G1, dur: 2 },
                    { f: N.Bb1, dur: 2 },
                    { f: N.A1, dur: 2 },
                    { f: N.E1, dur: 2 },
                ],
                bass: [
                    { f: N.E1, dur: 4 }, { f: N.R, dur: 1 },
                    { f: N.E1, dur: 2 }, { f: N.F1, dur: 1 },
                    { f: N.G1, dur: 2 }, { f: N.Bb1, dur: 2 },
                    { f: N.A1, dur: 2 }, { f: N.E1, dur: 2 },
                ],
                drums: "K--hS-shKkKhS-kh|K-khS-shKkKhSOhH",
                padChord: null, arp: null,
                organ: { chord: [N.E3, N.Bb3, N.D4], drawbars: 'doom', leslie: 'fast' },
            },
            {
                name: "THE FINAL WORSHIP",
                genre: 0.0, bpm: 50, repeats: 2, visualMode: 0,
                guitar: [
                    { f: N.E1, dur: 8 },
                    { f: N.R, dur: 2 },
                    { f: N.Bb1, dur: 3 },
                    { f: N.A1, dur: 1 },
                    { f: N.G1, dur: 2 },
                    { f: N.E1, dur: 8 },
                    { f: N.R, dur: 4 },
                ],
                bass: [
                    { f: N.E1, dur: 8 },
                    { f: N.Bb1, dur: 4 },
                    { f: N.A1, dur: 2 }, { f: N.G1, dur: 2 },
                    { f: N.E1, dur: 8 }, { f: N.R, dur: 4 },
                ],
                drums: "K--kh--sS--sh---|K-k-h--sS---ThTL",
                padChord: null, arp: null,
                organ: { chord: [N.E2, N.B2, N.E3], drawbars: 'default', leslie: 'slow' },
            },
        ]
    },
];


// =====================================================
// ===== SONG SEQUENCER ===============================
// =====================================================

class SongSequencer {
    constructor(guitar, bass, drums, spaceSynth, organ) {
        this.guitar = guitar;
        this.bass = bass;
        this.drums = drums;
        this.spaceSynth = spaceSynth;
        this.organ = organ;
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
        this._generation = 0;
        this._pendingTransitionTimeouts = [];
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
        // Cancel all pending transition timeouts to prevent stale applySection calls
        this._generation++;
        this._pendingTransitionTimeouts.forEach(id => clearTimeout(id));
        this._pendingTransitionTimeouts = [];

        // Kill all currently playing/scheduled notes to prevent song overlap
        this.guitar.killAllNotes();
        this.bass.killAllNotes();
        this.spaceSynth.killAllNotes();
        if (this.organ) this.organ.killAllNotes();
        this.drums.killAllNotes();

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
        } else if (song.style === '70s') {
            this.guitar.set70sTone();
            this.bass.set70sTone();
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
            this.guitar.tsBass.gain.value = 6 - g * 5;
            this.guitar.tsMid.gain.value = -1 + g * 3;
            this.guitar.delay.delayTime.value = 0.42 + g * 0.15;
            this.guitar.delayFB.gain.value = 0.18 + g * 0.2;
            this.guitar.delayWet.gain.value = 0.06 + g * 0.14;
            this.drums.roomWet.gain.value = 0.16 + g * 0.2;
        }

        // Space synth fading
        if (g > 0.25) {
            this.spaceSynth.fadeIn(3.0);
        } else {
            this.spaceSynth.fadeOut(3.0);
        }

        // Hammond organ control
        if (this.organ) {
            if (section.organ) {
                this.organ.fadeIn(2.0);
                if (section.organ.leslie === 'fast') this.organ.setLeslieSpeed('fast');
                else if (section.organ.leslie === 'slow') this.organ.setLeslieSpeed('slow');
                else this.organ.setLeslieSpeed('slow');
                if (section.style === 'fuzz' || song.style === 'fuzz') this.organ.setDirtyTone();
                else this.organ.setCleanTone();
            } else {
                this.organ.fadeOut(2.0);
            }
        }

        // Wah-wah guitar control
        if (section.wahGuitar) {
            this.guitar.enableWah(section.wahRate || 2.0);
        } else {
            this.guitar.disableWah();
        }

        // Visual mode
        currentMode = section.visualMode;

        this.showSection(song.name, section.name, g, section.style || song.style);
    }

    showSection(songName, sectionName, genre, style) {
        let icon, label;
        if (style === 'fuzz') { icon = '\u26A1'; label = 'FUZZ DOOM'; }
        else if (style === '70s' || songName === 'IRON WORSHIP') { icon = '\u2720'; label = '70s DOOM'; }
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

        // Schedule drums on beat-locked 16th-note grid with humanization
        const patternDur = Math.max(guitarDur, bassDur);
        const drumStr = section.drums.replace(/\|/g, '');
        const stepDur = beatDur / 4; // Each character = one 16th note
        const totalSteps = Math.round(patternDur / stepDur);
        const drumLen = drumStr.length;

        // Compute bass note onset times for kick accent alignment
        const bassOnsets = [];
        let bassT = 0;
        section.bass.forEach(note => {
            if (note.f !== 0) bassOnsets.push(bassT);
            bassT += note.dur * beatDur;
        });

        for (let i = 0; i < totalSteps; i++) {
            const ch = drumStr[i % drumLen];
            if (ch === '-') continue;
            const isGhost = ch !== ch.toUpperCase();
            const upper = ch.toUpperCase();
            // Velocity: ghost notes soft, normal with natural variation — wider dynamics
            let vel = isGhost
                ? 0.25 + Math.random() * 0.15
                : 0.80 + Math.random() * 0.20;
            // Micro-timing humanization (less jitter on kick/snare for tightness)
            const isKS = upper === 'K' || upper === 'S';
            const jitter = isKS
                ? (Math.random() - 0.5) * 0.004
                : (Math.random() - 0.5) * 0.012;
            const stepTime = t + i * stepDur + jitter;
            // Accent kick when landing with bass note onset
            if (upper === 'K') {
                const nearBass = bassOnsets.some(bt => Math.abs(i * stepDur - bt) < stepDur * 1.5);
                if (nearBass) vel = Math.min(vel * 1.15, 1.0);
                this.drums.kick(stepTime, vel);
            } else if (upper === 'S') {
                this.drums.snare(stepTime, vel);
            } else if (upper === 'H') {
                this.drums.hihat(stepTime, false, vel);
            } else if (upper === 'O') {
                this.drums.hihat(stepTime, true, vel);
            } else if (upper === 'R') {
                this.drums.ride(stepTime, false, vel);
            } else if (upper === 'B') {
                this.drums.ride(stepTime, true, vel);
            } else if (upper === 'T') {
                this.drums.tom(stepTime, 'high', vel);
            } else if (upper === 'M') {
                this.drums.tom(stepTime, 'mid', vel);
            } else if (upper === 'L') {
                this.drums.tom(stepTime, 'low', vel);
            } else if (upper === 'C') {
                this.drums.crash(stepTime, vel);
            }
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

        // Schedule organ chords
        if (this.organ && section.organ && section.organ.chord) {
            this.organ.playChord(
                section.organ.chord,
                t,
                patternDur,
                section.organ.drawbars || 'default'
            );
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
            const gen = this._generation;
            const tid = setTimeout(() => {
                // Remove this timeout from the tracking array
                const idx = this._pendingTransitionTimeouts.indexOf(tid);
                if (idx !== -1) this._pendingTransitionTimeouts.splice(idx, 1);
                if (this._generation === gen) this.applySection();
            }, transitionDelay);
            this._pendingTransitionTimeouts.push(tid);
        }
    }
}


// ===== INSTANCES =====
let guitar, bass, drums, spaceSynth, organ, sequencer, mainBus;
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
            mainBus.gain.value = 0.60;

            // Master compressor/limiter — tighter for more punch
            const masterComp = audioContext.createDynamicsCompressor();
            masterComp.threshold.value = -8;
            masterComp.knee.value = 3;
            masterComp.ratio.value = 12;
            masterComp.attack.value = 0.001;
            masterComp.release.value = 0.10;

            mainBus.connect(masterComp);
            masterComp.connect(audioContext.destination);
            masterComp.connect(audioAnalyser);

            guitar = new RealisticGuitar(audioContext, mainBus);
            bass = new BassGuitar(audioContext, mainBus);
            drums = new DoomDrums(audioContext, mainBus);
            spaceSynth = new SpaceSynth(audioContext, mainBus);
            organ = new HammondOrgan(audioContext, mainBus);

            sequencer = new SongSequencer(guitar, bass, drums, spaceSynth, organ);
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
            if (organ) organ.fadeOut();
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
