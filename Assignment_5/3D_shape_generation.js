// specify camera/eye coordinate system parameters

var lightColor = [0.8,0.8,0.8];
var lightPos = [0, 5, 5];
var camPos = [0,0,3.2];
var ambIntensity = 1;
var SpecIntensity = 3.0;
var DiffuseIntensity = 0.7;
var bounces = 1;
var allow_ref = false;
var shadow = 0;

// Shader Programs

var frag_shader;

var gl;
var animation;
var canvas;

var spheres = [
	{
		center: [ -1.2, 0.3, 1.7 ],
		radius: 0.7,
		mtl: {
			k_d: DiffuseIntensity,
			k_s: SpecIntensity,
			n: 15,
      color: [0,1,0]
		},
	},
	{
		center: [ 0, 1, -1 ],
		radius: 2,
		mtl: {
			k_d: DiffuseIntensity,
			k_s: SpecIntensity,
			n: 5,
      color: [1,0,0]
		}
	},
  {
		center: [ 1.2, 0.3, 1.7 ],
		radius: 0.7,
		mtl: {
			k_d: DiffuseIntensity,
			k_s: SpecIntensity,
			n: 100,
      color: [0,0,1]
		}
	},
  {
		center: [ 0, -11, 0 ],
		radius: 10,
		mtl: {
			k_d: DiffuseIntensity,
			k_s: 0.0,
			n: 5,
      color: [0.5,0.5,0.5]
		}
	},
];

fs_header = `#version 300 es
#define NUM_SPHERES ` + spheres.length + `
`;
vs_header = `#version 300 es
`;

// Vertex shader code
const frag_vsc = `
in vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition,0.0,1.0);
}
`;

// Fragment shader code
const frag_fsc = `
precision highp float;

struct Ray {
	vec3 origin;
	vec3 direction;
};

struct Material {
	float  k_d;	// diffuse coefficient
	float  k_s;	// specular coefficient
	float n;	// specular exponent
  vec3 color;
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct HitInfo {
	float    t;
	vec3     normal;
  vec3 pos;
  int sph;
  Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];

uniform float uAmbIntensity;
uniform vec3 uLightPos;
uniform vec3 uCamPos;
uniform vec3 objColor;
uniform vec3 uLightCol;

uniform int bounceLimit;

uniform float cnvWid;
uniform float cnvHei;

uniform bool shadow;

out vec4 fragColor;

HitInfo IntersectRay(Ray ray, Sphere sphere) {
  bool foundHit = false;
  HitInfo hit;
  vec3 oc = ray.origin - sphere.center;
  float a = dot(ray.direction, ray.direction);
  float b = 2.0 * dot(oc, ray.direction);
  float c = dot(oc, oc) - (sphere.radius * sphere.radius);

  float discriminant = b * b - 4.0 * a * c;

  if (discriminant > 0.0) {
    foundHit = true;
    float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
    float t2 = (-b + sqrt(discriminant)) / (2.0 * a);
    float t = (t1 < t2) ? t1 : t2;
    if(t>0.0)
    {
      foundHit = true;
      hit.t = t;
      hit.normal = normalize(ray.origin + t*(ray.direction) - sphere.center);
      hit.mtl = sphere.mtl;
      hit.pos = ray.origin + t*(ray.direction);
    }
  }

  if(!foundHit){
    hit.t = 0.0;
  }

  return hit;
}

vec3 phong(Material mtl,
            vec3 incident, vec3 normal,
            vec3 viewDir)
{
  float DiffuseIntensity = mtl.k_d;
  float SpecIntensity = mtl.k_s;
  float Shininess = mtl.n;
  vec3 objcolor = mtl.color;

  vec3 reflected = normalize(reflect(incident, normal));

  //Diffuse
  float dotNL = max(0.0, dot(normal, -incident));
  vec3 Idiff =  DiffuseIntensity * uLightCol * dotNL;

  //Specular
  vec3 Ispec = SpecIntensity * pow(max(0.0, dot(reflected,viewDir)),Shininess) * uLightCol;

  vec3 vcolor = Idiff + Ispec + uAmbIntensity * objcolor;

  return vcolor;
}

bool check_sh(vec3 pos, int sph){
  Ray rt;
  rt.origin = uLightPos;
  rt.direction = normalize(pos-rt.origin);
  float t_org = length(pos-rt.origin);
  for ( int i=0; i<NUM_SPHERES; ++i ) {
    if(i == sph)continue;
    HitInfo temp = IntersectRay(rt, spheres[i]);
    if(temp.t > 0.0 && t_org - temp.t > 1.0 ){
      return true;
    }
  }
  return false;
}

vec3 go_bouncy(Ray incoming){

  vec3 fCol = vec3(0.0,0.0,0.0);

  for ( int i=0; i<bounceLimit; ++i ) {
    HitInfo hit;
    hit.t = 0.0;

    for ( int i=0; i<NUM_SPHERES; ++i ) {
      HitInfo temp = IntersectRay(incoming, spheres[i]);
      if(hit.t == 0.0 || (temp.t >0.0 && temp.t < hit.t)){
        hit = temp;
        hit.sph = i;
      }
    }

    if (hit.t == 0.0){
      break;
    }

    vec3 inci = normalize(hit.pos-uLightPos);
    fCol += 0.5*phong(hit.mtl, inci, hit.normal, -incoming.direction);
    fCol/=1.5;

    if(i==0 && shadow && check_sh(hit.pos, hit.sph)){
      fCol *= 0.2;
    }

    incoming.direction = normalize(reflect(incoming.direction, hit.normal));
    incoming.origin = hit.pos;
	}

  return fCol;

}

void main() {
  Ray ray;
  // create the ray for current frag
  ray.origin = uCamPos;

  // direction is through each screen fragment in negative z direction
  vec2 screenPos = gl_FragCoord.xy/vec2(cnvWid, cnvHei);
  ray.direction = normalize(vec3(screenPos * 2.0 - 1.0, -1.0));

  vec3 fCol = go_bouncy(ray);

  fragColor = vec4(fCol, 1.0);

}
`;

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}


function initShaders(vsc, fsc) {
  shaderProgram = gl.createProgram();

  vsc = vs_header + vsc;
  fsc = fs_header + fsc;

  var vertexShader = vertexShaderSetup(vsc);
  var fragmentShader = fragmentShaderSetup(fsc);

  // attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  // check for compilation and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
  uLightPosLocation = gl.getUniformLocation(shaderProgram, "uLightPos");
  uCamPosLocation = gl.getUniformLocation(shaderProgram, "uCamPos");
  uLightColLocation = gl.getUniformLocation(shaderProgram, "uLightCol");
  uAmbIntensityLocation = gl.getUniformLocation(shaderProgram, "uAmbIntensity");
  uBounceLimitLocation = gl.getUniformLocation(shaderProgram, "bounceLimit");
  uCnvWidLocation = gl.getUniformLocation(shaderProgram, "cnvWid");
  uCnvHeiLocation = gl.getUniformLocation(shaderProgram, "cnvHei");
  uShadowLocation = gl.getUniformLocation(shaderProgram, "shadow");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);

  return shaderProgram;
}


function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true}); // the graphics webgl2 context
    window.addEventListener('resize',resizeCanvas,false);
    function resizeCanvas() {
      canvas.width = Math.min(window.innerWidth/1.5,500);
      canvas.height = canvas.width;
      gl.viewportWidth = canvas.width; // the width of the canvas
      gl.viewportHeight = canvas.height; // the height
      drawScene();
    }

    resizeCanvas();
  } catch (e) {}
  if (!gl) {
    console.log("WebGL initialization failed");
  }
  mode = gl.TRIANGLES;
}

function initSquareBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([1,1,-1,1,-1,-1,1,-1]);
  sqVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqVertexPositionBuffer.itemSize = 2;
  sqVertexPositionBuffer.numItems = 4;

  // buffer for point indices
  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqVertexIndexBuffer.itemsize = 1;
  sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color) {

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    sqVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

  gl.uniform3fv(uColorLocation, color);

  // now draw the square
  gl.drawElements(
    mode,
    sqVertexIndexBuffer.numItems,
    gl.UNSIGNED_SHORT,
    0
  );
}

function init_spheres(){
  gl.useProgram(frag_shader);
  function setMaterial( v, mtl )
  {
    gl.uniform1f( gl.getUniformLocation( frag_shader, v+'.k_d' ), mtl.k_d );
    gl.uniform1f( gl.getUniformLocation( frag_shader, v+'.k_s' ), mtl.k_s );
    gl.uniform1f ( gl.getUniformLocation( frag_shader, v+'.n'   ), mtl.n   );
    gl.uniform3fv( gl.getUniformLocation( frag_shader, v+'.color' ), mtl.color );
  }
  for ( var i=0; i<spheres.length; ++i ) {
    gl.uniform3fv( gl.getUniformLocation( frag_shader, 'spheres['+i+'].center' ), spheres[i].center );
    gl.uniform1f ( gl.getUniformLocation( frag_shader, 'spheres['+i+'].radius' ), spheres[i].radius );
    setMaterial( 'spheres['+i+'].mtl', spheres[i].mtl );
  }
}

function setup_shader(shaderProgram){

  gl.useProgram(shaderProgram);

  gl.uniform3fv(uLightPosLocation, lightPos);
  gl.uniform3fv(uCamPosLocation, camPos);
  gl.uniform3fv(uLightColLocation, lightColor);
  gl.uniform1f(uAmbIntensityLocation, ambIntensity);
  gl.uniform1i(uBounceLimitLocation, bounces);
  gl.uniform1i(uShadowLocation, shadow);
  gl.uniform1f(uCnvWidLocation, canvas.width);
  gl.uniform1f(uCnvHeiLocation, canvas.height);

}

var animate = function () {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  setup_shader(frag_shader);

  drawSquare([0.0, 0.0, 0.0]);

  animation = window.requestAnimationFrame(animate);
}

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  // stop the current loop of animation
  if (animation) {
    window.cancelAnimationFrame(animation);
  }

  animate();
}

function webGLStart() {
  canvas = document.getElementById("3D_shape_generation");

  // initialize WebGL
  initGL(canvas);

  // initialize shader program
  frag_shader = initShaders(frag_vsc, frag_fsc);

  //initialize buffers for the square
  init_spheres();
  initSquareBuffer();

  drawScene();
}

var lslider = document.getElementById("LightPosSlider");
lslider.oninput = function() {
  lightPos[0] = this.value;
}
var bslider = document.getElementById("BounceLimit");
bslider.oninput = function() {
  if(allow_ref)bounces = this.value;
  else this.value = bounces;
}
bslider.style.display = "none";

function set_mode(x){
  switch(x){
    case 1:
      shadow = 0;
      bounces = 1;
      allow_ref = false;
      break;
    case 2:
      shadow = 1;
      bounces = 1;
      allow_ref = false;
      break;
    case 3:
      shadow = 0;
      bounces = 2;
      allow_ref = true;
      break;
    case 4:
      shadow = 1;
      bounces = 2;
      allow_ref = true;
      break;
  }
  bslider.value = bounces;
  if(!allow_ref)bslider.style.display = "none";
  else bslider.style.display = "inline";
}
