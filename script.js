const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
}

// Vertex shader program: simple pass-through
const vsSource = `
    attribute vec4 aVertexPosition;
    varying vec2 vUv;
    void main(void) {
        gl_Position = aVertexPosition;
        vUv = aVertexPosition.xy * 0.5 + 0.5;
    }
`;

// Fragment shader program: The Psychedelic Core with Feedback
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
    
    // The previous frame!
    uniform sampler2D u_prevFrame;

    varying vec2 vUv; // Use varying for seamless coords

    // Rotation matrix
    mat2 rot(float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Palette function for trippy colors
    vec3 palette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.263, 0.416, 0.557);

        return a + b * cos(6.28318 * (c * t + d));
    }

    // Random function for stars
    float random (vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
        vec2 uv0 = uv;
        vec3 finalColor = vec3(0.0);
        
        vec2 m = u_mouse * 2.0 - 1.0;
        
        // This 'zoom' factor makes it infinite
        float speed = 0.2;
        if(u_hyper > 0.5) speed = 2.0;
        
        float time = u_time * speed;
        
        // Add subtle constant movement if audio is off, big burst if audio is loud
        float audio = u_audio * 0.1;

        if (u_mode > 2.5) {
            // Mode 3: Space Void Travel
            for (float i = 1.0; i < 6.0; i++) {
                float depth = fract(i * 0.2 + time * 0.1 + m.y * 0.5);
                float scale = mix(20.0, 0.5, depth);
                float fade = smoothstep(0.0, 0.3, depth) * smoothstep(1.0, 0.8, depth);
                
                vec2 starUV = uv * scale + i * 453.2;
                vec2 id = floor(starUV);
                vec2 gv = fract(starUV) - 0.5;
                
                float r = random(id);
                if (r > 0.95) { 
                    float starSize = sin(time*5.0 + r*10.0) * 0.1 + audio;
                    float star = 0.05 / length(gv);
                    star *= starSize * fade;
                    finalColor += palette(r + i*0.2 + time*0.1) * star;
                }
                
                // Planets & Asteroids
                if (r > 0.985) {
                    float type = fract(r * 123.45); // Sub-random for variety
                    
                    if (type > 0.5) { 
                        // PLANETS
                        float size = 0.2 + fract(r*10.0)*0.2;
                        float planetDist = length(gv) - size;
                        float planet = 0.015 / abs(planetDist);
                        
                        // Rings (for some planets)
                        if (type > 0.85) {
                             float ringDist = abs(length(gv*vec2(1.0, 2.0)) - (size + 0.2));
                             planet += 0.01 / abs(ringDist); 
                        }

                        // Atmosphere Glow
                        planet += smoothstep(size, size+0.1, length(gv)) * 0.1;

                        // Diverse Planet Colors (Blue, Red, Purple, Green)
                        vec3 pCol = vec3(0.0);
                        if(type > 0.9) pCol = vec3(0.2, 0.5, 1.0); // Ice Giant
                        else if(type > 0.8) pCol = vec3(1.0, 0.6, 0.2); // Gas Giant
                        else if(type > 0.7) pCol = vec3(0.9, 0.2, 0.2); // Mars-like
                        else pCol = vec3(0.4, 0.8, 0.4); // Life?

                        // Shadowing to give 3D spherical look
                        float shadow = smoothstep(-size, size, gv.x + gv.y);
                        
                        finalColor += pCol * planet * fade * (1.0 + audio) * shadow;

                    } else {
                        // ASTEROIDS (Irregular shapes)
                        // Deform the circle with sin waves on coordinate
                        float angle = atan(gv.y, gv.x);
                        float radius = length(gv);
                        float def = sin(angle*5.0 + time) * 0.05;
                        float astDist = radius - (0.15 + def);
                        
                        float ast = 0.02 / abs(astDist);
                        vec3 aCol = vec3(0.6, 0.5, 0.4); // Rocky color
                        finalColor += aCol * ast * fade * (0.8 + audio * 2.0);
                    }
                }
            }
        } else {
            for (float i = 0.0; i < 4.0; i++) {
                // Space folding variants
                if(u_mode < 0.5) { 
                    // Mode 0: Default Smooth Cosmic
                    uv = fract(uv * 1.5) - 0.5;
                    uv *= rot(time * 0.2 + i * 0.5 + audio);
                } else if(u_mode < 1.5) {
                    // Mode 1: Sharp Crystal Tech
                    uv = fract(uv * 1.2) - 0.5;
                    uv = abs(uv); // Mirror symmetry
                    uv *= rot(time * 0.4 + i);
                } else {
                    // Mode 2: Liquid Alien
                    uv = fract(uv * (1.5 + sin(time)*0.2)) - 0.5;
                    uv *= rot(time * 0.1);
                    uv += sin(uv.yx * 4.0 + time) * 0.1; // Wavy distortion
                }
    
                float d = length(uv) * exp(-length(uv0));
    
                // Color: Hyper mode inverts colors wildly
                vec3 col = palette(length(uv0) + i*.4 + time*0.4 + m.x * 2.0 + audio);
                if(u_hyper > 0.5) col = 1.0 - col; // Invert colors in hyper mode
    
                // Distance field calculation
                if(u_mode < 0.5) {
                    d = sin(d * (8.0 + m.y * 10.0 + audio * 10.0) + time)/8.;
                } else if (u_mode < 1.5) {
                    // Sharper cuts for Mode 1
                    d = sin(d * 12.0 + time)/8.;
                    d = smoothstep(0.0, 0.1, d); 
                } else {
                    // Soft liquid for Mode 2
                    d = sin(d * 6.0 + time + m.y*5.0)/6.;
                }
                
                d = abs(d);
    
                // Audio makes the glow explode
                // Hyper mode makes lines super thin and bright
                float glowPower = (u_hyper > 0.5) ? 1.5 : 1.2;
                d = pow(0.01 / d, glowPower);
    
                finalColor += col * d;
            }
        }

        if (u_webcamEnabled > 0.5) {
            vec2 webcamUV = uv0 * 0.5 + 0.5; // Map back to 0-1
            // Distort webcam UV with fractal math
            webcamUV += finalColor.xy * 0.1 * (1.0 + audio * 5.0);
            
            vec3 webcamColor = texture2D(u_webcam, webcamUV).rgb;
            
            // Mix fractal glow ON TOP of webcam
            finalColor = mix(webcamColor, finalColor, 0.5); 
        }

        // FEEDBACK LOOP (The Time Tunnel)
        // Read previous frame, zoom it slightly towards center
        vec2 feedbackUV = vUv; 
        
        // Add subtle zoom/twist to feedback
        feedbackUV -= 0.5;
        feedbackUV *= 0.99; // Shrink towards center
        float angle = 0.005 * sin(time);
        float s = sin(angle);
        float c = cos(angle);
        feedbackUV = vec2(feedbackUV.x * c - feedbackUV.y * s, feedbackUV.x * s + feedbackUV.y * c);
        feedbackUV += 0.5;

        vec3 prevColor = texture2D(u_prevFrame, feedbackUV).rgb;

        // Feedback Decay - trails shouldn't last forever
        // If Hyper mode, decay faster (less blur)
        float decay = (u_hyper > 0.5) ? 0.8 : 0.96; 
        
        // Blend new frame with old frame
        finalColor = mix(finalColor, prevColor, decay);

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

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
    },
};

// Buffers
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [
    -1.0,  1.0,
     1.0,  1.0,
    -1.0, -1.0,
     1.0, -1.0,
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

// --- FRAMEBUFFERS FOR FEEDBACK LOOP ---
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

// Create two sets of buffers to ping-pong between
let textureA = createTexture(canvasWidth, canvasHeight);
let textureB = createTexture(canvasWidth, canvasHeight);
let fboA = createFramebuffer(textureA);
let fboB = createFramebuffer(textureB);

// Check if resize needed
function resizeFramebuffers() {
   if (canvasWidth != gl.canvas.width || canvasHeight != gl.canvas.height) {
       canvasWidth = gl.canvas.width;
       canvasHeight = gl.canvas.height;
       
       textureA = createTexture(canvasWidth, canvasHeight);
       textureB = createTexture(canvasWidth, canvasHeight);
       fboA = createFramebuffer(textureA);
       fboB = createFramebuffer(textureB);
   }
}


// Audio Context Setup
let audioContext;
let audioAnalyser;
let audioDataArray;
let hasAudioStarted = false;
let webcamStream = null;
let webcamVideo = document.createElement('video');
webcamVideo.autoplay = true;
webcamVideo.muted = true;
webcamVideo.loop = true;
let hasWebcamStarted = false;

// Create webcam texture
const webcamTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, webcamTexture);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // Flip the texture to match WebGL coords
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);


function initAudio() {
    if (hasAudioStarted) return;
    
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 256; // Smaller FFT size = faster reaction
        
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(function(stream) {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(audioAnalyser);
            // Don't connect to destination to avoid feedback loop!
            // audioAnalyser.connect(audioContext.destination);
            
            const bufferLength = audioAnalyser.frequencyBinCount;
            audioDataArray = new Uint8Array(bufferLength);
            hasAudioStarted = true;
            document.body.classList.add('active'); // Hide the text
            console.log("Mic enabled!");
        })
        .catch(function(err) {
            console.error('Error accessing microphone:', err);
            alert("Microphone access denied or error. Visuals will just be silent.");
        });
    } catch (e) {
        console.error("Web Audio API not supported", e);
    }
}

function initWebcam() {
    navigator.mediaDevices.getUserMedia({video: true})
        .then(stream => {
            webcamVideo.srcObject = stream;
            webcamVideo.play();
            hasWebcamStarted = true; // Flag for shader
            isWebcam = 1.0; // Flag for logic
            console.log("Webcam ON");
        })
        .catch(err => {
            console.error(err);
            alert("Webcam error! Check permissions.");
        });
}

// Start audio on first user gesture
document.body.addEventListener('click', () => {
    initAudio();
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}, { once: true });

// Also allow keypress (like spacebar) to start it
document.body.addEventListener('keydown', (e) => {
    initAudio();
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    // Double click for fullscreen handled by browser usually, let's implement 'F' key
    if(e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
}, { once: false });
 // changed once:true to once:false for fullscreen toggle, added logic to only run audio init once internally

// Input state
let mouseX = 0.5;
let mouseY = 0.5;
let currentMode = 0.0;
let isHyper = 0.0;
let isWebcam = 0.0;
let isAutoPilot = 0.0;
let autoPilotTimer = 0.0;
const autoPilotChangeTime = 7.0; // Change every 7 seconds

// Mode switching helper
function switchMode() {
    currentMode = (currentMode + 1.0) % 4.0;
}

document.addEventListener('keydown', (e) => {
    // Mode Switching
    if(e.key === '1') currentMode = 0.0;
    if(e.key === '2') currentMode = 1.0;
    if(e.key === '3') currentMode = 2.0;
    if(e.key === '4') currentMode = 3.0;

    // Webcam Toggle (W)
    if(e.key === 'w' || e.key === 'W') {
        if(!hasWebcamStarted) {
            initWebcam();
            hasWebcamStarted = true;
            isWebcam = 1.0;
        } else {
             isWebcam = (isWebcam > 0.5) ? 0.0 : 1.0;
        }
    }

    // AutoPilot Toggle (A)
    if(e.key === 'a' || e.key === 'A') {
        isAutoPilot = (isAutoPilot > 0.5) ? 0.0 : 1.0;
    }
});

document.addEventListener('mousedown', () => isHyper = 1.0);
document.addEventListener('mouseup', () => isHyper = 0.0);
document.addEventListener('touchstart', () => isHyper = 1.0);
document.addEventListener('touchend', () => isHyper = 0.0);

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = 1.0 - (e.clientY / window.innerHeight); // Flip Y to match shader coords
});

// Touch support
document.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0) {
        mouseX = e.touches[0].clientX / window.innerWidth;
        mouseY = 1.0 - (e.touches[0].clientY / window.innerHeight);
    }
}, {passive: false});

function render(now) {
    now *= 0.001; // convert to seconds
    
    // AutoPilot Logic - Changes mode periodically
    if (isAutoPilot > 0.5) {
        if (now - autoPilotTimer > autoPilotChangeTime) {
            currentMode = (currentMode + 1.0) % 3.0; // Fixed switch logic
            autoPilotTimer = now;
        }
    }

    // Get Audio Data
    let audioValue = 0;
    if (audioAnalyser && hasAudioStarted) {
        audioAnalyser.getByteFrequencyData(audioDataArray);
        
        let sum = 0;
        // Focus on bass frequencies (lower bins)
        for(let i = 0; i < audioDataArray.length/4; i++) {
            sum += audioDataArray[i];
        }
        // Normalize 0..1
        audioValue = sum / (audioDataArray.length/4 * 255);
        
        // Power curve to isolate beats
        audioValue = Math.pow(audioValue, 2.0) * 2.0; 
    }


    resizeCanvasToDisplaySize(gl.canvas);
    resizeFramebuffers(); // Ensure feedback loop is correct size

    // PING PONG LOGIC
    // We draw into FBO A, reading from Texture B
    // Then next frame we draw into FBO B, reading from Texture A
    
    // Bind Framebuffer (Draw to texture, not screen)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(programInfo.program);

    // Bind Webcam (Texture 0)
    if (hasWebcamStarted && isWebcam > 0.5) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, webcamTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, webcamVideo);
        gl.uniform1i(programInfo.uniformLocations.webcam, 0);
        gl.uniform1f(programInfo.uniformLocations.webcamEnabled, 1.0);
    } else {
        gl.uniform1f(programInfo.uniformLocations.webcamEnabled, 0.0);
    }
    
    // Bind Previous Frame (Texture 1)
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

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // STEP 2: Draw the result to the screen!
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Null = Screen
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    // Simple pass-through shader usually used here, 
    // but we can just blit the texture we just made
    // However, since we are already running a heavy shader, 
    // the easiest way is to just swap the pointers for the next frame
    
    // Actually, to see it on screen we need to draw textureA to screen
    // But since our main shader does the feedback mixing, 
    // we can't just draw textureA.
    // Wait, the main shader IS drawing into textureA right now.
    // So textureA contains the mixed result.
    // We need to copy textureA to Screen.
    // A simple way is to use `gl.blitFramebuffer` in WebGL2, but we are using WebGL1.
    // So usually we render a simple quad with textureA mapped to it.
    
    // Let's create a simple "Draw Texture to Screen" routine inside this loop
    // But since we don't want to create another shader program right now, 
    // we can cheat:
    // We can just rely on the fact that we can't easily display it without a second pass.
    
    // Better strategy for cleaner code:
    // 1. Draw Scene + Feedback -> FBO A
    // 2. Draw FBO A -> Screen
    
    // ... Or simpler:
    // Just swap the variables for the next loop
    let tempTex = textureA;
    textureA = textureB;
    textureB = tempTex;
    
    let tempFbo = fboA;
    fboA = fboB;
    fboB = tempFbo;
    
    // Now draw textureB (which was just written to as textureA) to the screen
    // We need a simple shader for this... or we can use the main loop to draw to screen
    // but that would run the fractal math twice.
    
    // Let's settle for a "Double Draw" for now to keep code simple:
    // 1. Draw to FBO (for feedback history)
    // 2. Draw to Screen (for eyes)
    
    // Actually, drawing to screen doesn't save it for next frame.
    // We MUST draw to FBO.
    // So we need a "Display" shader.
    
    // Since I cannot easily add a second program without refactoring everything...
    // I will rewrite this part to use the same logic but render to screen on the SECOND pass?
    // No that's heavy.
    
    // OK, let's add the simple display program quickly.
    drawTextureToScreen(textureB); 

    requestAnimationFrame(render);
}

// Display Shader Program
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
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width  !== displayWidth ||
        canvas.height !== displayHeight) {
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
    }
}

requestAnimationFrame(render);
