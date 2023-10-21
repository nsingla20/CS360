// specify camera/eye coordinate system parameters

// Shader Programs
var flat_shader;
var vert_shader;
var frag_shader;

var gl;
var animation;
var canvas;

var contrast = 0;
var brightness = 1;

const def = new Float32Array([
  0, 0, 0,
  0, 1, 0,
  0, 0, 0
]);
const smoothMat = new Float32Array([
  0.11111, 0.11111, 0.11111,
  0.11111, 0.11111, 0.11111,
  0.11111, 0.11111, 0.11111
]);
const sharpMat = new Float32Array([
  0, -1, 0,
  -1, 5, -1,
  0, -1, 0
]);
const lapMat = new Float32Array([
  0, -1, 0,
  -1, 4, -1,
  0, -1, 0
]);



// Vertex shader code
const frag_vsc = `#version 300 es
in vec2 aPosition;

out vec2 tex;

void main() {

  gl_Position = vec4(aPosition,0.0,1.0);

  tex=(aPosition+1.0)/2.0;
}`;

// Fragment shader code
const frag_fsc = `#version 300 es
precision highp float;

in vec2 tex;

uniform int imgMode;
uniform int imgModea;
uniform int procBack;

uniform float contrast;
uniform float brightness;

uniform sampler2D background;
uniform sampler2D foreground;
uniform mat3 kernel;
uniform vec2 texSize;

out vec4 fragColor;

vec4 get_tex(sampler2D t, vec2 loc) {
  vec4 col = texture(t,loc);
  col.rgb = 0.5 + (contrast + 1.0) * (col.rgb - 0.5);
  col.rgb = brightness * col.rgb;
  return col;
}

void main() {
  vec4 col = vec4(0.0,0.0,0.0,1.0);

  vec2 pixSize = 1.0 / texSize;

  if (procBack == 3) {
    vec3 up = get_tex(background, tex + vec2(0.0,1.0)*pixSize).rgb;
    vec3 down = get_tex(background, tex + vec2(0.0,-1.0)*pixSize).rgb;
    vec3 right = get_tex(background, tex + vec2(1.0,0.0)*pixSize).rgb;
    vec3 left = get_tex(background, tex + vec2(-1.0,0.0)*pixSize).rgb;
    vec3 dy = (up-down)*0.5;
    vec3 dx = (right-left)*0.5;
    col = vec4(sqrt(dx*dx+ dy*dy),1.0);
  }else{
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            vec2 offset = vec2(float(i), float(j)) * pixSize;
            col.rgb += get_tex(background, tex + offset).rgb * kernel[i+1][j+1];
        }
    }
  }



  if (imgMode==2){
    vec4 fore = get_tex(foreground,tex);
    col = col*(1.0-fore.a) + fore*fore.a;
  }

  if (imgModea == 3){
    float gray = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
    col = vec4(vec3(gray),1.0);
  }else if (imgModea == 4){
    vec4 sep;
    sep.r = 0.393*col.r + 0.769*col.g + 0.189*col.b;
    sep.g = 0.349*col.r + 0.686*col.g + 0.168*col.b;
    sep.b = 0.272*col.r + 0.534*col.g + 0.131*col.b;
    col.rbg = sep.rbg;
  }



  fragColor = vec4(col.rgb,1.0);
}`;


function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

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

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true}); // the graphics webgl2 context
    window.addEventListener('resize',resizeCanvas,false);
    function resizeCanvas() {
      canvas.width = Math.min(window.innerWidth/1.5,300);
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
}

function setup_shader(shaderProgram){

  gl.useProgram(shaderProgram);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

  uImgModeLocation = gl.getUniformLocation(shaderProgram, "imgMode");
  uImgModeaLocation = gl.getUniformLocation(shaderProgram, "imgModea");
  uProcBackLocation = gl.getUniformLocation(shaderProgram, "procBack");

  //texture location in shader
  uBackgroundLocation = gl.getUniformLocation(shaderProgram, "background");
  gl.uniform1i(uBackgroundLocation, 1);
  uForegroundLocation = gl.getUniformLocation(shaderProgram, "foreground");
  gl.uniform1i(uForegroundLocation, 2);

  uKernelLocation = gl.getUniformLocation(shaderProgram, 'kernel');
  uTexSizeLocation = gl.getUniformLocation(shaderProgram, 'texSize');

  uContrastLocation = gl.getUniformLocation(shaderProgram, "contrast");
  uBrightnessLocation = gl.getUniformLocation(shaderProgram, "brightness");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);

  gl.uniformMatrix3fv(uKernelLocation, false, def);
  gl.uniform1f(uContrastLocation, contrast);
  gl.uniform1f(uBrightnessLocation, brightness);

}

function loadImg(input, texUnit) {

  file = input.files[0];

  if(file){
    const reader = new FileReader();
    reader.onload = function(e){
      var tex = gl.createTexture();
      tex.image = new Image();
      tex.image.src = e.target.result;
      tex.image.onload = function () {
        gl.activeTexture(texUnit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // use it to flip Y if needed
        gl.texImage2D(
          gl.TEXTURE_2D, // 2D texture
          0, // mipmap level
          gl.RGBA, // internal format
          gl.RGBA,
          gl.UNSIGNED_BYTE, // type of data
          tex.image // array or <img>
        );


        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform2fv(uTexSizeLocation, new Float32Array([tex.image.width,tex.image.height]))
      };
    };
    reader.readAsDataURL(file);
  }


}

function initQuadBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([
    -1.0, -1.0,
    1.0, -1.0,
    -1.0, 1.0,
    1.0, 1.0,
  ]);
  PosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, PosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  PosBuf.itemSize = 2;
  PosBuf.numItems = 4;

}

function drawQuad() {

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, PosBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    PosBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, PosBuf.numItems);
}


var animate = function () {

  drawQuad();

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

function imgModeCh(val) {
  gl.uniform1i(uImgModeLocation, val);
}
function imgModeaCh(val) {
  gl.uniform1i(uImgModeaLocation, val);
}
function procBack(val) {
  gl.uniform1i(uProcBackLocation, val);
  switch(val){
    case 1:
      gl.uniformMatrix3fv(uKernelLocation, false, smoothMat);
      break;
    case 2:
      gl.uniformMatrix3fv(uKernelLocation, false, sharpMat);
      break;
    case 3:
      gl.uniformMatrix3fv(uKernelLocation, false, def);
      break;
    case 4:
      gl.uniformMatrix3fv(uKernelLocation, false, lapMat);
      break;
  }
}


function webGLStart() {
  canvas = document.getElementById("texture");

  // initialize WebGL
  initGL(canvas);

  initQuadBuffer();

  // initialize shader program
  frag_shader = initShaders(frag_vsc, frag_fsc);

  setup_shader(frag_shader);

  drawScene();
}

var slider = document.getElementById("ContrastSlider");
slider.oninput = function() {
  contrast = this.value;
  gl.uniform1f(uContrastLocation, contrast);
}
var slider = document.getElementById("BrightnessSlider");
slider.oninput = function() {
  brightness = this.value;
  gl.uniform1f(uBrightnessLocation, brightness);
}
function getShot(){
  const image = new Image();
  image.src = canvas.toDataURL('image/png');

  // Create an anchor element to trigger the download
  const a = document.createElement('a');
  a.href = image.src;
  a.download = 'screenshot.png';

  // Trigger a click event to download the image
  a.click();
}
const saveBlob = (function() {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';
  return function saveData(blob, fileName) {
     const url = window.URL.createObjectURL(blob);
     a.href = url;
     a.download = fileName;
     a.click();
  };
}());
