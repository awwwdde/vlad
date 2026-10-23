// Two GPU passes: a small volumetric cloud buffer and a full-size ASCII
// resolve. Ray marching happens per character, not per screen pixel.
const VERTEX = `#version 300 es
in vec2 position;
out vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`

const CLOUDS = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform float time;
uniform float mobile;
float hash(vec3 p) {
  p=fract(p*.1031); p+=dot(p,p.yzx+33.33);
  return fract((p.x+p.y)*p.z);
}
float noise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
    mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
    mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) {
  return noise(p)*.57+noise(p*2.03+13.1)*.28+noise(p*4.11+29.7)*.15;
}
float puff(vec3 p,vec3 c,vec3 r) { return 1.-length((p-c)/r); }
float join(float a,float b) {
  float h=max(.16-abs(a-b),0.)/.16;
  return max(a,b)+h*h*.04;
}
float density(vec3 p) {
  float distant=smoothstep(.72,.84,p.y);
  p.x-=sin(time*.032)*mix(.095,.024,distant);
  p.y-=sin(time*.018)*mix(.012,.003,distant);
  vec3 flow=vec3(time*.026,-time*.009,time*.034);
  vec3 w=p+(vec3(noise(p*6.+flow),noise(p*6.+flow+17.),noise(p*6.+flow+41.))-.5)*.065;
  vec3 q=w; q.y=q.y*mix(1.,2.3,mobile)-mobile*.12;
  // Large lobes compose each bank; noise only erodes their surfaces.
  float h=puff(q,vec3(-.05,.18,.03),vec3(.19,.26,.20));
  h=join(h,puff(q,vec3(.10,.19,.03),vec3(.15,.19,.18)));
  h=join(h,puff(q,vec3(.21,.16,.02),vec3(.115,.14,.15)));
  h=join(h,puff(q,vec3(.29,.24,.01),vec3(.115,.14,.15)));
  h=join(h,puff(q,vec3(.14,.25,.01),vec3(.15,.18,.17)));
  h=join(h,puff(q,vec3(.25,.18,-.03),vec3(.11,.13,.13)));
  h=join(h,puff(q,vec3(.18,.32,.03),vec3(.16,.15,.17)));
  h=join(h,puff(q,vec3(.02,.38,.04),vec3(.17,.18,.18)));
  h=join(h,puff(q,vec3(.12,.47,.06),vec3(.12,.10,.13)));
  h=join(h,puff(q,vec3(.24,.52,.07),vec3(.11,.065,.10)));
  h=join(h,puff(q,vec3(.34,.55,.08),vec3(.08,.038,.07)));
  h=join(h,puff(q,vec3(1.04,.35,.04),vec3(.20,.23,.19)));
  h=join(h,puff(q,vec3(.98,.25,.03),vec3(.12,.12,.14)));
  h=join(h,puff(q,vec3(.89,.31,.02),vec3(.12,.12,.15)));
  h=join(h,puff(q,vec3(.86,.40,.05),vec3(.13,.11,.15)));
  h=join(h,puff(q,vec3(.96,.49,.06),vec3(.17,.12,.16)));
  h=join(h,puff(q,vec3(.84,.28,-.01),vec3(.065,.065,.085)));
  h=join(h,puff(q,vec3(.93,.22,-.02),vec3(.065,.07,.08)));
  h=join(h,puff(q,vec3(.38,.16,.02),vec3(.08,.07,.10)));
  h=join(h,puff(q,vec3(.43,.21,.03),vec3(.065,.065,.085)));
  // Foreground billows protrude from the large banks at different depths.
  h=join(h,puff(q,vec3(.13,.16,-.11),vec3(.078,.085,.10)));
  h=join(h,puff(q,vec3(.22,.23,-.12),vec3(.085,.09,.10)));
  h=join(h,puff(q,vec3(.30,.25,-.08),vec3(.07,.08,.10)));
  h=join(h,puff(q,vec3(.085,.30,-.12),vec3(.085,.095,.10)));
  h=join(h,puff(q,vec3(.18,.37,-.10),vec3(.08,.07,.10)));
  h=join(h,puff(q,vec3(.02,.38,-.10),vec3(.085,.08,.10)));
  h=join(h,puff(q,vec3(.96,.28,-.11),vec3(.075,.08,.10)));
  h=join(h,puff(q,vec3(.88,.35,-.11),vec3(.08,.075,.10)));
  h=join(h,puff(q,vec3(1.01,.40,-.11),vec3(.09,.09,.10)));
  h=join(h,puff(q,vec3(.94,.48,-.10),vec3(.09,.065,.10)));
  float billow=fbm(w*vec3(19.,22.,19.)+flow);
  float detail=fbm(w*vec3(63.,75.,60.)+flow);
  float nearD=max(0.,h+(billow-.52)*.52+(detail-.5)*.18-.04);
  float horizon=puff(w,vec3(.05,.955,.08),vec3(.34,.026,.09));
  horizon=join(horizon,puff(w,vec3(.54,.90,.08),vec3(.17,.035,.09)));
  horizon=join(horizon,puff(w,vec3(.89,.97,.09),vec3(.29,.03,.08)));
  horizon=join(horizon,puff(w,vec3(.50,.855,.09),vec3(.12,.019,.08)));
  horizon=join(horizon,puff(w,vec3(1.02,.83,.09),vec3(.16,.022,.08)));
  float thin=max(0.,horizon*.34+(fbm(w*vec3(32.,110.,25.)+flow*.3)-.5)*.28-.07);
  // Keep navigation calm with a soft boundary, never a rectangular patch.
  float nav=(1.-smoothstep(.055,.14,p.y))*smoothstep(.28,.43,p.x)*(1.-smoothstep(.75,.89,p.x));
  return max(nearD,thin)*(1.-nav*.97);
}
void main() {
  vec2 screen=vec2(uv.x,1.-uv.y);
  vec3 sun=normalize(vec3(-.52,-.70,-.49));
  vec4 result=vec4(0.);
  float direct=1.;
  for(int i=0;i<28;i++) {
    vec3 p=vec3(screen,-.30+float(i)*.023);
    float d=density(p);
    if(d>.002) {
      if(i%3==0 || result.a<.01) {
        // Integrate optical thickness towards the sun for self-shadowing.
        float optical=0.;
        for(int j=1;j<=4;j++) optical+=density(p+sun*(float(j)*.035))*.95;
        float facing=clamp(.45+(d-density(p+sun*.025))*6.,0.,1.);
        direct=exp(-optical*2.2)*(.50+.50*facing);
      }
      vec3 shadow=vec3(.26,.37,.43);
      vec3 mid=vec3(.82,.61,.37);
      vec3 cream=vec3(1.,.88,.65);
      vec3 light=mix(shadow,mid,smoothstep(.08,.55,direct));
      light=mix(light,cream,smoothstep(.35,.85,direct));
      float a=1.-exp(-d*.88);
      result.rgb+=(1.-result.a)*a*light;
      result.a+=(1.-result.a)*a;
      if(result.a>.985) break;
    }
  }
  color=vec4(result.rgb/max(result.a,.001),result.a);
}
`
const ASCII = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D clouds;
uniform sampler2D nextClouds;
uniform float cloudBlend;
uniform sampler2D glyphs;
uniform vec2 resolution;
uniform vec2 cell;
uniform float time;
uniform float toneOnly;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 skyAt(vec2 p) {
  float y=1.-p.y;
  vec3 sky=mix(vec3(.19,.30,.37),vec3(.46,.55,.57),pow(y,1.8));
  return sky+exp(-length((p-vec2(.62,.30))*vec2(1.2,.9))*3.)*.025;
}
void main() {
  float y=1.-uv.y;
  float depth=mix(1.,.28,smoothstep(.72,.85,y));
  vec2 wind=vec2(time*2.4*depth,sin(time*.06)*3.*depth);
  vec2 local=(uv*resolution+wind)/cell;
  vec2 id=floor(local);
  vec2 centre=((id+.5)*cell-wind)/resolution;
  vec4 cloud=mix(texture(clouds,centre),texture(nextClouds,centre),cloudBlend);
  vec4 continuous=mix(texture(clouds,uv),texture(nextClouds,uv),cloudBlend);
  vec3 sky=skyAt(uv);
  float coverage=smoothstep(.025,.72,cloud.a);
  float luminance=dot(cloud.rgb,vec3(.30,.59,.11));
  float tone=clamp((luminance-.29)/.52,0.,1.);
  // Stable quantisation dither, not random symbols: tone and thickness
  // determine the glyph on the light-to-dense atlas ramp.
  float rank=clamp(tone*.77+coverage*.23+(hash(id)-.5)*.075,0.,1.);
  float character=floor(rank*7.99);
  vec2 glyphUv=vec2((character+fract(local.x))/8.,fract(local.y));
  float ink=texture(glyphs,glyphUv).a;
  // This bed is sampled per pixel, so it cannot form square cell plates.
  float body=smoothstep(.025,.88,continuous.a);
  vec3 vapor=mix(sky,continuous.rgb,body*.58);
  vec3 litInk=mix(cloud.rgb*.87,min(vec3(1.),cloud.rgb*1.13+.025),tone);
  vec3 ascii=mix(vapor,litInk,ink*coverage*.94);
  vec3 tonal=mix(sky,continuous.rgb,body);
  color=vec4(mix(ascii,tonal,toneOnly),1.);
}
`

export class SkyRenderer {
  private readonly gl: WebGL2RenderingContext
  private readonly canvas: HTMLCanvasElement
  private readonly cloudProgram: WebGLProgram
  private readonly asciiProgram: WebGLProgram
  private readonly vao: WebGLVertexArrayObject
  private readonly buffer: WebGLBuffer
  private cloudTexture: WebGLTexture
  private nextCloudTexture: WebGLTexture
  private readonly glyphTexture: WebGLTexture
  private readonly framebuffer: WebGLFramebuffer
  private width = 1
  private height = 1
  private fieldWidth = 1
  private fieldHeight = 1
  private cell = 7
  private ratio = 1
  private interval = 1000 / 60
  private fieldTime = -1
  private readonly fieldInterval = 1 / 12

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas
    this.gl = gl
    this.cloudProgram = this.program(CLOUDS)
    this.asciiProgram = this.program(ASCII)
    this.vao = gl.createVertexArray()!
    this.buffer = gl.createBuffer()!
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW)
    for (const p of [this.cloudProgram,this.asciiProgram]) {
      const position = gl.getAttribLocation(p,'position')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0)
    }
    this.cloudTexture = this.texture()
    this.nextCloudTexture = this.texture()
    this.framebuffer = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.cloudTexture,0)
    this.glyphTexture = this.texture()
    const atlas = document.createElement('canvas')
    atlas.width = 256
    atlas.height = 32
    const ctx = atlas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.font = '40px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    Array.from('.:coO0#@').forEach((char,i) => {
      ctx.save()
      ctx.translate(i*32+16,16)
      ctx.scale(1.14,.88)
      ctx.fillText(char,0,0)
      ctx.restore()
    })
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true)
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false)
    gl.bindFramebuffer(gl.FRAMEBUFFER,null)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)
  }

  get frameInterval() { return this.interval }

  private program(fragment: string): WebGLProgram {
    const gl = this.gl
    const shaders = [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,fragment]] as const
    const program = gl.createProgram()!
    for (const [type,source] of shaders) {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader,source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        gl.deleteProgram(program)
        throw new Error(`Sky shader: ${error}`)
      }
      gl.attachShader(program,shader)
      gl.deleteShader(shader)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error(`Sky program: ${error}`)
    }
    return program
  }

  private texture() {
    const gl = this.gl
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D,texture)
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)
    return texture
  }

  resize(width: number,height: number,ratio: number) {
    const gl = this.gl
    this.width = Math.max(1,Math.round(width))
    this.height = Math.max(1,Math.round(height))
    this.ratio = Math.min(ratio,1.25,1920/this.width)
    this.cell = this.width<700 ? 4.2 : Math.max(4.5,this.width/330)
    this.interval = 1000 / 60
    this.canvas.width = Math.round(this.width*this.ratio)
    this.canvas.height = Math.round(this.height*this.ratio)
    // Tonal volume is continuous; it needn't match the much finer glyph grid.
    const scale = Math.min(.65, Math.sqrt(32000 / ((this.width/this.cell)*(this.height/(this.cell*1.15)))))
    this.fieldWidth = Math.max(1,Math.ceil(this.width/this.cell*scale))
    this.fieldHeight = Math.max(1,Math.ceil(this.height/(this.cell*1.15)*scale))
    for (const texture of [this.cloudTexture,this.nextCloudTexture]) {
      gl.bindTexture(gl.TEXTURE_2D,texture)
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.fieldWidth,this.fieldHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null)
    }
    this.fieldTime = -1
    this.canvas.dataset.skyField = `${this.fieldWidth}x${this.fieldHeight}`
  }

  private drawClouds(texture: WebGLTexture, time: number) {
    const gl = this.gl
    gl.bindVertexArray(this.vao)
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0)
    gl.viewport(0,0,this.fieldWidth,this.fieldHeight)
    gl.useProgram(this.cloudProgram)
    gl.uniform1f(gl.getUniformLocation(this.cloudProgram,'time'),time)
    gl.uniform1f(gl.getUniformLocation(this.cloudProgram,'mobile'),this.width<700 ? 1 : 0)
    gl.drawArrays(gl.TRIANGLES,0,3)
  }

  draw(time: number, toneOnly = false) {
    const gl = this.gl
    gl.bindVertexArray(this.vao)
    const target = Math.floor(time/this.fieldInterval)*this.fieldInterval
    if (this.fieldTime < 0 || target < this.fieldTime || target - this.fieldTime > this.fieldInterval * 1.5) {
      this.drawClouds(this.cloudTexture,target)
      this.drawClouds(this.nextCloudTexture,target+this.fieldInterval)
      this.fieldTime = target
    } else if (target - this.fieldTime > this.fieldInterval * .5) {
      const previous = this.cloudTexture
      this.cloudTexture = this.nextCloudTexture
      this.nextCloudTexture = previous
      this.drawClouds(this.nextCloudTexture,target+this.fieldInterval)
      this.fieldTime = target
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER,null)
    gl.viewport(0,0,this.canvas.width,this.canvas.height)
    gl.useProgram(this.asciiProgram)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D,this.cloudTexture)
    gl.uniform1i(gl.getUniformLocation(this.asciiProgram,'clouds'),0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D,this.glyphTexture)
    gl.uniform1i(gl.getUniformLocation(this.asciiProgram,'glyphs'),1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D,this.nextCloudTexture)
    gl.uniform1i(gl.getUniformLocation(this.asciiProgram,'nextClouds'),2)
    gl.uniform1f(gl.getUniformLocation(this.asciiProgram,'cloudBlend'),Math.max(0,Math.min(1,(time-this.fieldTime)/this.fieldInterval)))
    gl.uniform2f(gl.getUniformLocation(this.asciiProgram,'resolution'),this.width,this.height)
    gl.uniform2f(gl.getUniformLocation(this.asciiProgram,'cell'),this.cell,this.cell*1.15)
    gl.uniform1f(gl.getUniformLocation(this.asciiProgram,'time'),time)
    gl.uniform1f(gl.getUniformLocation(this.asciiProgram,'toneOnly'),toneOnly ? 1 : 0)
    gl.drawArrays(gl.TRIANGLES,0,3)
  }

  dispose() {
    const gl = this.gl
    gl.deleteProgram(this.cloudProgram)
    gl.deleteProgram(this.asciiProgram)
    gl.deleteBuffer(this.buffer)
    gl.deleteVertexArray(this.vao)
    gl.deleteTexture(this.cloudTexture)
    gl.deleteTexture(this.nextCloudTexture)
    gl.deleteTexture(this.glyphTexture)
    gl.deleteFramebuffer(this.framebuffer)
  }
}
