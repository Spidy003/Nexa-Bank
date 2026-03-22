import * as THREE from 'three'

export const HeadShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color('#00ffff') }, // Electric Cyan
    uColor2: { value: new THREE.Color('#00ffbb') }, // Neon Teal
    uColor3: { value: new THREE.Color('#5500ff') }, // Vivid Blue
    uColor4: { value: new THREE.Color('#ff00aa') }, // Hot Pink
    uIntensity: { value: 1.5 },
    uMouthWave: { value: 0.0 }, // Control for localized talking effect
    uListenEffect: { value: 0.0 }, // Control for listening effect
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform float uMouthWave;

    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      
      vec3 pos = position;
      
      // Localized mouth wave at the bottom (-Y)
      // float mouthArea = smoothstep(-0.1, -0.6, pos.y);
      // pos += normal * sin(uTime * 15.0) * uMouthWave * mouthArea * 0.08;
      
      // General subtle wobble
      pos.x += sin(pos.y * 5.0 + uTime) * 0.01;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    uniform float uIntensity;
    uniform float uListenEffect;
    uniform float uMouthWave;

    void main() {
      // More vibrant gradient logic
      float t = uTime * 0.5;
      float mixFactor1 = sin(vPosition.y * 2.5 + t) * 0.5 + 0.5;
      float mixFactor2 = cos(vPosition.x * 2.5 - t * 0.7) * 0.5 + 0.5;
      
      vec3 colorA = mix(uColor1, uColor2, mixFactor1);
      vec3 colorB = mix(uColor3, uColor4, mixFactor2);
      vec3 finalColor = mix(colorA, colorB, sin(t * 0.5) * 0.5 + 0.5);
      
      // Fresnel-like glow
      float fresnel = pow(1.0 - dot(vec3(0,0,1), vNormal), 2.0);
      
      // Listening effect: a stable glowing band/halo
      float listenBand = exp(-pow(vPosition.y - sin(uTime * 2.0) * 0.1, 2.0) * 20.0) * uListenEffect;
      finalColor += vec3(1.0, 1.0, 1.0) * listenBand * 2.0; // White Aura

      // Listening effect: a stable glowing band/halo
      float listenBand = exp(-pow(vPosition.y - sin(uTime * 2.0) * 0.1, 2.0) * 20.0) * uListenEffect;
      finalColor += vec3(1.0, 1.0, 1.0) * listenBand * 2.0; // White Aura

      // Soft glow falloff
      float glow = pow(1.0 - length(vPosition), 1.5);
      
      gl_FragColor = vec4(finalColor * uIntensity, (glow + fresnel * 0.5));
    }
  `,
  transparent: true,
  side: THREE.DoubleSide
}
