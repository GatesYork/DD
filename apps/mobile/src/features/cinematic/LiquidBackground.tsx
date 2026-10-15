import { useEffect, useRef } from 'react';

const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
// Domain-warped fractal noise bends the color bands into continuous marble veins.
const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform vec2 pointer;
uniform vec3 deep, blue, green, highlight;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.;float a=.5;mat2 r=mat2(.8,-.6,.6,.8);for(int i=0;i<3;i++){v+=a*noise(p);p=r*p*2.03+3.7;a*=.5;}return v;}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.)*1.75;
 p+=pointer*.11;
 float t=time*.085;
 vec2 q=vec2(fbm(p+vec2(t*.3,-t*.2)),fbm(p+vec2(4.8,-3.1)+t*.22));
 vec2 w=vec2(fbm(p+2.4*q+vec2(2.7,t*.35)),fbm(p+2.1*q+vec2(-1.4,-t*.25)));
 float flow=fbm(p+2.8*w+vec2(t*.18,0.));
 float bend=p.x*.58+p.y*.8+2.5*flow+q.x*.5;
 float band=.5+.5*sin(bend*4.2-t*.55);
 vec3 color=mix(deep,blue,smoothstep(.12,.85,flow));
 color=mix(color,green,smoothstep(.22,.88,band)*.87);
 float vein=pow(.5+.5*sin(bend*12.+flow*3.),24.);
 float silk=pow(.5+.5*sin(bend*5.6+q.y*1.5),5.);
 color+=highlight*vein*.12;
 color=mix(color,highlight,silk*.19);
 color*=.83+.17*(1.-smoothstep(.1,.95,length(uv-.5)));
 gl_FragColor=vec4(color,1.);
}`;
function rgb(hex: string) { return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255); }

export function LiquidBackground({ palette, reduced }: { palette: readonly string[]; reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.dataset.renderer = 'initializing';
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) { canvas.dataset.renderer = 'fallback'; return; }
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let frame = 0;
    let disposed = false;
    try {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type); if (!shader) throw new Error('Shader unavailable');
        shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader unsupported');
        return shader;
      };
      program = gl.createProgram(); if (!program) throw new Error('Program unavailable');
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program unsupported');
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const location = gl.getAttribLocation(program,'position'); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      const uniforms = Object.fromEntries(['resolution','time','pointer','deep','blue','green','highlight'].map(name => [name,gl.getUniformLocation(program!,name)]));
      let colors = paletteRef.current.map(rgb);
      let targetPointer = [0,0], currentPointer = [0,0];
      let elapsed = 8, previous = 0, lastStaticFrame = '';
      const resize = () => {
        // Cap backing pixels to keep the continuous effect light on mobile GPUs.
        const scale = Math.min(.75, 1000 / innerWidth);
        canvas.width = Math.max(1,Math.round(innerWidth*scale)); canvas.height = Math.max(1,Math.round(innerHeight*scale));
        gl.viewport(0,0,canvas.width,canvas.height);
      };
      const move = (event: PointerEvent) => { if (event.pointerType === 'mouse') targetPointer = [event.clientX/innerWidth-.5,.5-event.clientY/innerHeight]; };
      const draw = (now: number) => {
        if (disposed) return;
        frame = requestAnimationFrame(draw);
        if (document.hidden || now-previous<32) return;
        const delta = Math.min((now-previous)/1000,.06); previous=now;
        const signature = paletteRef.current.join() + canvas.width + ':' + canvas.height;
        if (reduced && signature === lastStaticFrame) return;
        lastStaticFrame = signature;
        if (!reduced) elapsed+=delta;
        colors=colors.map((color,i)=>color.map((v,j)=>v+(rgb(paletteRef.current[i])[j]-v)*(reduced?1:.045)));
        currentPointer=currentPointer.map((v,i)=>reduced?0:v+(targetPointer[i]-v)*.025);
        gl.uniform2f(uniforms.resolution,canvas.width,canvas.height); gl.uniform1f(uniforms.time,reduced?8:elapsed);
        gl.uniform2f(uniforms.pointer,currentPointer[0],currentPointer[1]);
        ['deep','blue','green','highlight'].forEach((key,i)=>gl.uniform3fv(uniforms[key],colors[i]));
        gl.drawArrays(gl.TRIANGLES,0,6);
        canvas.dataset.renderer='webgl';
      };
      resize(); frame=requestAnimationFrame(draw);
      window.addEventListener('resize',resize); window.addEventListener('pointermove',move,{passive:true});
      const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); canvas.dataset.renderer='fallback'; };
      canvas.addEventListener('webglcontextlost',lost);
      return () => {
        disposed=true;cancelAnimationFrame(frame);window.removeEventListener('resize',resize);window.removeEventListener('pointermove',move);canvas.removeEventListener('webglcontextlost',lost);
        if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); shaders.forEach(s=>gl.deleteShader(s));
      };
    } catch {
      canvas.dataset.renderer='fallback';
      if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); shaders.forEach(s=>gl.deleteShader(s));
    }
  }, [reduced]);
  return <div className="liquid-background" aria-hidden="true"><canvas ref={canvasRef} data-testid="liquid-canvas"/><div className="liquid-shade"/><div className="liquid-grain"/></div>;
}
