// Post stack: bloom → tilt-shift (miniature depth of field) → grade (warmth,
// vignette, grain) → output. Tilt-shift is what makes clay read as a physical
// miniature, and it is the signature of the Opus 5.5 code-rendered films.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const TiltShift = (horizontal) => ({
  uniforms: {
    tDiffuse: { value: null },
    focus: { value: 0.5 },      // screen y (0 bottom .. 1 top) that is sharp
    band: { value: 0.18 },      // half-height of the sharp band
    amount: { value: 3.0 },     // max blur radius in px at 1080p
    res: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float focus, band, amount; uniform vec2 res; varying vec2 vUv;
    void main(){
      float d = max(0., abs(vUv.y - focus) - band);
      float r = clamp(d * 4.0, 0., 1.) * amount;
      vec2 dir = ${horizontal ? "vec2(1.,0.)" : "vec2(0.,1.)"} / res * (res.y/1080.);
      vec4 c = vec4(0.); float w = 0.;
      for (int i=-6;i<=6;i++){ float fi=float(i); float k=exp(-fi*fi/18.); c += texture2D(tDiffuse, vUv + dir*fi*r*0.5)*k; w+=k; }
      gl_FragColor = c / w;
    }`,
});

const Grade = {
  uniforms: {
    tDiffuse: { value: null }, time: { value: 0 },
    vignette: { value: 0.35 }, grain: { value: 0.035 },
    warmth: { value: 0.04 }, fade: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, vignette, grain, warmth, fade; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb *= vec3(1.+warmth, 1., 1.-warmth);
      vec2 q = vUv - .5; float v = 1. - dot(q,q) * vignette * 2.2;
      c.rgb *= clamp(v, 0., 1.);
      c.rgb += (h(vUv*1000. + time) - .5) * grain;
      c.rgb *= 1. - fade;
      gl_FragColor = c;
    }`,
};

export function makePost(renderer, scene, camera, W, H) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setSize(W, H);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.55, 0.6, 0.82);
  const tsH = new ShaderPass(TiltShift(true)), tsV = new ShaderPass(TiltShift(false));
  for (const p of [tsH, tsV]) p.uniforms.res.value.set(W, H);
  const grade = new ShaderPass(Grade);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(tsH);
  composer.addPass(tsV);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return {
    composer, bloom, grade,
    set({ focus, band, amount, bloom: b, threshold, vignette, grain, warmth, fade } = {}) {
      for (const p of [tsH, tsV]) {
        if (focus !== undefined) p.uniforms.focus.value = focus;
        if (band !== undefined) p.uniforms.band.value = band;
        if (amount !== undefined) p.uniforms.amount.value = amount;
      }
      if (b !== undefined) bloom.strength = b;
      if (threshold !== undefined) bloom.threshold = threshold;
      if (vignette !== undefined) grade.uniforms.vignette.value = vignette;
      if (grain !== undefined) grade.uniforms.grain.value = grain;
      if (warmth !== undefined) grade.uniforms.warmth.value = warmth;
      if (fade !== undefined) grade.uniforms.fade.value = fade;
    },
    render(t) { grade.uniforms.time.value = t; renderPass.camera = camera; composer.render(); },
    setCamera(c) { camera = c; renderPass.camera = c; },
  };
}
