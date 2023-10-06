// specify camera/eye coordinate system parameters
var eyePos = [0.0, 1.0, 3.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];
var lightColor = [0.5,0.5,0.5];
var lightPos = [0, 5, 2];
var ambIntensity = 0.6;
var diffIntensity = 0.1;
var specIntensity = 1.0;
var shininess = 25;
// Shader Programs
var flat_shader;
var vert_shader;
var frag_shader;

// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

var eyeDeg = 0;
var eyeDegStep = -0.15;

var prevMouseX = 0.0;
var prevMouseY = 0.0;
var dist_o = vec3.length(eyePos);
var mouseSensi = 1;

var mode;
var gl;
var animation;
var canvas;
var aPositionLocation;
var aNormalLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;
var matrixStack = [];
var cubeMapPath = "./texture_and_other_files/Nvidia_cubemap/";

// Vertex shader code
const frag_vsc = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoords;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 vNormal;
out vec3 vPos;
out vec2 fragTexCoord;

out vec3 wPos;
out vec3 wNormal;

out vec3 aPos;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);

  fragTexCoord = aTexCoords;
  vPos = (uVMatrix*uMMatrix*vec4(aPosition,1.0)).xyz;
  wPos = (uMMatrix*vec4(aPosition,1.0)).xyz;
  vNormal = vec3(transpose(inverse(uVMatrix*uMMatrix))*vec4(aNormal,1.0));
  wNormal = vec3(transpose(inverse(uMMatrix))*vec4(aNormal,1.0));

  aPos = aPosition;

  gl_PointSize=2.0;
}`;

// Fragment shader code
const frag_fsc = `#version 300 es
precision highp float;
in vec3 vPos;
in vec3 vNormal;
in vec2 fragTexCoord;

in vec3 wPos;
in vec3 wNormal;

in vec3 aPos;

uniform float uAmbIntensity;
uniform vec3 uLightPos;
uniform vec3 uEyePos;
uniform vec3 objColor;
uniform float uDiffuseIntensity;
uniform float uSpecIntensity;
uniform float uShininess;
uniform vec3 uLightCol;
uniform bool textLoad;
uniform bool envLoad;
uniform bool shadeLoad;
uniform sampler2D imageTexture;
uniform samplerCube cubeTexture;
uniform samplerCube cubeMap;
uniform int textSwitch;

out vec4 fragColor;

void main() {

  vec3 Fcolor;
  vec3 normal = normalize(vNormal);

  vec3 L = normalize(uLightPos - vPos);
  vec3 R = normalize(-reflect(L,normal));
  vec3 V = normalize(-vPos);

  if (textLoad){
    if (textSwitch == 0){
      Fcolor = vec3(texture(imageTexture, fragTexCoord));
    }else if (textSwitch == 1){
      Fcolor = vec3(texture(cubeTexture, normalize(aPos)));
    } else if (textSwitch == 2){
      fragColor = texture(cubeTexture, normalize(aPos));
      return;
    }
  }else{
    Fcolor = objColor;
  }

  if (envLoad){
    if(textSwitch == 3){
      Fcolor += vec3(texture(cubeMap, normalize(refract(wPos-uEyePos,normalize(wNormal),0.82))));
    }else{
      Fcolor += vec3(texture(cubeMap, normalize(reflect(wPos-uEyePos,normalize(wNormal)))));
    }
  }

  if (shadeLoad){
    //Diffuse
    float dotNL = max(0.0, dot(normal, L));
    vec3 Idiff =  uDiffuseIntensity * uLightCol * dotNL;

    //Specular
    vec3 Ispec = uSpecIntensity * pow(max(0.0, dot(R,V)),uShininess) * uLightCol;

    vec3 vcolor = Idiff + Ispec + uAmbIntensity * Fcolor;
    fragColor = vec4(vcolor,1.0);
  }else{
    fragColor = vec4(Fcolor,1.0);
  }


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
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    window.addEventListener('resize',resizeCanvas,false);
    function resizeCanvas() {
      canvas.width = Math.min(window.innerWidth/1.5,550);
      canvas.height = canvas.width;
      gl.viewportWidth = canvas.width; // the width of the canvas
      gl.viewportHeight = canvas.height; // the height
      drawScene();
    }
    mode = gl.TRIANGLES;
    // gl.enable(gl.SCISSOR_TEST);
    gl.enable(gl.DEPTH_TEST);
    resizeCanvas();
  } catch (e) {}
  if (!gl) {
    console.log("WebGL initialization failed");
  }
}

function changeMode(i) {
  switch (i) {
    case 1:
      mode = gl.POINTS;
      break;
    case 2:
      mode = gl.LINE_LOOP;
      break;
    case 3:
      mode = gl.TRIANGLES
      break;
    default:
      mode = gl.TRIANGLES
  }
}
// New sphere initialization function
function initSphere(nslices, nstacks, radius) {
  spVerts = [];
  spIndicies = [];
  spNormals = [];
  spTexCoords = [];
  for (var i = 0; i <= nslices; i++) {
    var angle = (i * Math.PI) / nslices;
    var comp1 = Math.sin(angle);
    var comp2 = Math.cos(angle);

    for (var j = 0; j <= nstacks; j++) {
      var phi = (j * 2 * Math.PI) / nstacks;
      var comp3 = Math.sin(phi);
      var comp4 = Math.cos(phi);

      var xcood = comp4 * comp1;
      var ycoord = comp2;
      var zcoord = comp3 * comp1;
      var utex = 1 - j / nstacks;
      var vtex = 1 - i / nslices;

      spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
      spNormals.push(xcood, ycoord, zcoord);
      spTexCoords.push(utex, vtex);
    }
  }

  // now compute the indices here
  for (var i = 0; i < nslices; i++) {
    for (var j = 0; j < nstacks; j++) {
      var id1 = i * (nstacks + 1) + j;
      var id2 = id1 + nstacks + 1;

      spIndicies.push(id1, id2, id1 + 1);
      spIndicies.push(id2, id2 + 1, id1 + 1);
    }
  }
}

function initSphereBuffer() {
  var nslices = 50;
  var nstacks = 50;
  var radius = 0.5;

  initSphere(nslices, nstacks, radius);

  // buffer for vertices
  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = spVerts.length / 3;

  // buffer for indices
  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = spIndicies.length;

  // buffer for normals
  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = spNormals.length / 3;

  // buffer for texture coordinates
  spTexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spTexCoords), gl.STATIC_DRAW);
  spTexBuf.itemSize = 2;
  spTexBuf.numItems = spTexCoords.length / 2;
}

function drawSphere(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    spBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  if(aNormalLocation != -1)
  gl.vertexAttribPointer(
    aNormalLocation,
    spNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    spTexBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // Draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

  gl.uniform3fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.drawElements(mode, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}
// Cube generation function with normals
function initCubeBuffer() {
  var vertices = [
    // Front face
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Back face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    // Top face
    -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Bottom face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    // Right face
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
    // Left face
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  ];
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  buf.itemSize = 3;
  buf.numItems = vertices.length / 3;

  var normals = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // Back face
    0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
    // Top face
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // Bottom face
    0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
    // Right face
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    // Left face
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];
  cubeNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  cubeNormalBuf.itemSize = 3;
  cubeNormalBuf.numItems = normals.length / 3;

  var texCoords = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Back face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Top face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Bottom face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Right face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Left face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
  ];
  cubeTexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  cubeTexBuf.itemSize = 2;
  cubeTexBuf.numItems = texCoords.length / 2;

  var indices = [
    0,
    1,
    2,
    0,
    2,
    3, // Front face
    4,
    5,
    6,
    4,
    6,
    7, // Back face
    8,
    9,
    10,
    8,
    10,
    11, // Top face
    12,
    13,
    14,
    12,
    14,
    15, // Bottom face
    16,
    17,
    18,
    16,
    18,
    19, // Right face
    20,
    21,
    22,
    20,
    22,
    23, // Left face
  ];
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  indexBuf.itemSize = 1;
  indexBuf.numItems = indices.length;
}

function drawCube(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(
    aPositionLocation,
    buf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  if(aNormalLocation != -1)
  gl.vertexAttribPointer(
    aNormalLocation,
    cubeNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    cubeTexBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

  gl.uniform3fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);


  gl.drawElements(mode, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  //gl.drawArrays(gl.LINE_STRIP, 0, buf.numItems); // show lines
  //gl.drawArrays(gl.POINTS, 0, buf.numItems); // show points
}

function initTeaPot(file_json) {
  // XMLHttpRequest objects are used to interact with servers
  // It can be used to retrieve any type of data, not just XML.
  var request = new XMLHttpRequest();
  request.open("GET", file_json, false);
  // MIME: Multipurpose Internet Mail Extensions
  // It lets users exchange different kinds of data files
  request.overrideMimeType("application/json");
  request.onreadystatechange = function () {
    //request.readyState == 4 means operation is done
    if (request.readyState == 4) {
      processTeaPot(JSON.parse(request.responseText));
    }
  };
  request.send();
}

function processTeaPot(teaPotData) {

  teaPotVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, teaPotVertexPositionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(teaPotData.vertexPositions),
    gl.STATIC_DRAW
  );
  teaPotVertexPositionBuffer.itemSize = 3;
  teaPotVertexPositionBuffer.numItems = teaPotData.vertexPositions.length / 3;

  teaPotVertexNormalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, teaPotVertexNormalsBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(teaPotData.vertexNormals),
    gl.STATIC_DRAW
  );
  teaPotVertexNormalsBuffer.itemSize = 3;
  teaPotVertexNormalsBuffer.numItems = teaPotData.vertexNormals.length / 3;

  teaPotVertexTextureCoordsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, teaPotVertexTextureCoordsBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(teaPotData.vertexTextureCoords),
    gl.STATIC_DRAW
  );
  teaPotVertexTextureCoordsBuffer.itemSize = 2;
  teaPotVertexTextureCoordsBuffer.numItems = teaPotData.vertexTextureCoords.length / 2;

  teaPotVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teaPotVertexIndexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(teaPotData.indices),
    gl.STATIC_DRAW
  );
  teaPotVertexIndexBuffer.itemSize = 1;
  teaPotVertexIndexBuffer.numItems = teaPotData.indices.length;
}

function drawTeaPot(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, teaPotVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    teaPotVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, teaPotVertexNormalsBuffer);
  if(aNormalLocation != -1)
  gl.vertexAttribPointer(
    aNormalLocation,
    teaPotVertexNormalsBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, teaPotVertexTextureCoordsBuffer);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    teaPotVertexTextureCoordsBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teaPotVertexIndexBuffer);

  gl.uniform3fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.drawElements(
    mode,
    teaPotVertexIndexBuffer.numItems,
    gl.UNSIGNED_INT,
    0
  );
}

function setup_shader(shaderProgram){

  gl.useProgram(shaderProgram);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
  uEyePosLocation = gl.getUniformLocation(shaderProgram, "uEyePos");
  uLightPosLocation = gl.getUniformLocation(shaderProgram, "uLightPos");
  uLightColLocation = gl.getUniformLocation(shaderProgram, "uLightCol");
  uAmbIntensityLocation = gl.getUniformLocation(shaderProgram, "uAmbIntensity");
  uDiffuseIntensityLocation = gl.getUniformLocation(shaderProgram, "uDiffuseIntensity");
  uSpecIntensityLocation = gl.getUniformLocation(shaderProgram, "uSpecIntensity");
  uShininessLocation = gl.getUniformLocation(shaderProgram, "uShininess");

  uTextLoad = gl.getUniformLocation(shaderProgram, "textLoad");
  uEnvLoad = gl.getUniformLocation(shaderProgram, "envLoad");
  uShadeLoad = gl.getUniformLocation(shaderProgram, "shadeLoad");
  uTextSwitch = gl.getUniformLocation(shaderProgram, "textSwitch");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");
  //texture location in shader
  uCubeTextureLocation = gl.getUniformLocation(shaderProgram, "cubeTexture");
  gl.uniform1i(uCubeTextureLocation, 1);
  uCubeMapTextureLocation = gl.getUniformLocation(shaderProgram, "cubeMapTexture");
  gl.uniform1i(uCubeMapTextureLocation, 0);
  uImgTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  gl.uniform1i(uImgTextureLocation, 2);

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  if(aNormalLocation != -1)
  gl.enableVertexAttribArray(aNormalLocation);
  if(aTexCoordLocation != -1)
  gl.enableVertexAttribArray(aTexCoordLocation);

  gl.uniform3fv(uLightPosLocation, lightPos);
  gl.uniform3fv(uEyePosLocation, eyePos);
  gl.uniform3fv(uLightColLocation, lightColor);
  gl.uniform1f(uAmbIntensityLocation, ambIntensity);
  gl.uniform1f(uDiffuseIntensityLocation, diffIntensity);
  gl.uniform1f(uSpecIntensityLocation, specIntensity);
  gl.uniform1f(uShininessLocation, shininess);


}

function initCubeAllMap(posxyz) {
  return initCubeMap(posxyz,posxyz,posxyz,posxyz,posxyz,posxyz);
}

function initCubeMap(posx, negx, posy, negy, posz, negz) {
  const faceImages = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: posx
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: negx
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: posy
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: negy
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: posz
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: negz
    }
  ];
  var cubemapTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);

  faceImages.forEach((face) => {
    const { target, url } = face;

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 512;
    const height = 512;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    gl.texImage2D(target, level, internalFormat,
                  width, height, 0, format, type, null);

    const image = new Image();
    image.src = url;
    image.addEventListener("load", function () {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
      gl.texImage2D(target, level, internalFormat, format, type, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    });
  });

  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(
    gl.TEXTURE_CUBE_MAP,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.REPEAT); // set the texture to repreat for values of (s,t) outside of [0,1]
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return cubemapTexture;
}

function initSpMap(img){
  var tex = gl.createTexture();
  tex.image = new Image();
  tex.image.src = img;
  tex.image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // use it to flip Y if needed
    gl.texImage2D(
      gl.TEXTURE_2D, // 2D texture
      0, // mipmap level
      gl.RGB, // internal format
      gl.RGB, // format
      gl.UNSIGNED_BYTE, // type of data
      tex.image // array or <img>
    );

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );
  };
  return tex;
}

function drw3() {

  gl.uniform1i(uTextLoad, 0);

  spCol = [0/255,89/255,126/255];
  cbCol = [161/255,160/255,114/255];

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 1.1, 0.0]);
  mMatrix = mat4.scale(mMatrix, [3.0, 0.1, 1.0]);
  drawCube([161/255,59/255,19/255]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -1.1, 0.0]);
  mMatrix = mat4.scale(mMatrix, [3.0, 0.1, 1.0]);
  drawCube([161/255,59/255,19/255]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [-1.0, 0.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.0, 0.1, 3.0]);
  drawCube([155/255,156/255,0/255]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [1.0, 0.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.0, 0.1, 3.0]);
  drawCube([48/255,160/255,130/255]);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [1.0, 0.55, 0.0]);
  drawSphere([0.5,0.5,0.5]);
  mMatrix = mat4.translate(mMatrix, [0.0, -1.1, 0.0]);
  drawSphere([32/255,104/255,119/255]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [-1.0, 0.55, 0.0]);
  drawSphere([105/255,0/255,103/255]);
  mMatrix = mat4.translate(mMatrix, [0.0, -1.1, 0.0]);
  drawSphere([95/255,101/255,197/255]);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, 1.65, 0.0]);
  drawSphere([118/255,118/255,146/255]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -1.65, 0.0]);
  drawSphere([0/255,160/255,31/255]);
  mMatrix = popMatrix(matrixStack);
}

function makeTable(){
  gl.uniform1i(uEnvLoad, 1);
  gl.uniform1i(uTextLoad, 1);
  gl.uniform1i(uShadeLoad, 1);
  gl.uniform1i(uTextSwitch, 0);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, tableTexture);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -1, 0.0]);
  mMatrix = mat4.scale(mMatrix, [8, 0.2, 7]);
  drawSphere([0,0,0]);
  mMatrix = popMatrix(matrixStack);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tableLegTexture);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.25, 4, 0.25]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.75, 0.0]);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [9.5, 0.0, 6.0]);
  drawCube([0,0,0]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [9.5, 0.0, -6.0]);
  drawCube([0,0,0]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [-9.5, 0.0, 6.0]);
  drawCube([0,0,0]);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [-9.5, 0.0, -6.0]);
  drawCube([0,0,0]);
  mMatrix = popMatrix(matrixStack);
  mMatrix = popMatrix(matrixStack);
}

function makeRubik(){
  gl.uniform1i(uEnvLoad, 0);
  gl.uniform1i(uTextLoad, 1);
  gl.uniform1i(uShadeLoad, 0);
  gl.uniform1i(uTextSwitch, 1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, rubikTexture);
  drawCube([0,0,0]);
}

function makeTeaPot(){
  gl.uniform1i(uEnvLoad, 1);
  gl.uniform1i(uTextLoad, 0);
  gl.uniform1i(uShadeLoad, 0);
  gl.uniform1i(uTextSwitch, 1);
  drawTeaPot([0,0,0]);
}

function makeSp(color){
  gl.uniform1i(uEnvLoad, 1);
  gl.uniform1i(uTextLoad, 0);
  gl.uniform1i(uShadeLoad, 1);
  gl.uniform1i(uTextSwitch, 2);
  drawSphere(color);
}

function makeSlab(color){
  gl.uniform1i(uEnvLoad, 1);
  gl.uniform1i(uTextLoad, 0);
  gl.uniform1i(uShadeLoad, 0);
  gl.uniform1i(uTextSwitch, 3);
  drawCube(color);
}

function makeScene(){
  makeTable();

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);
  mMatrix = mat4.translate(mMatrix, [3, -1, 4]);
  mMatrix = mat4.rotate(mMatrix, degToRad(30), [0, 1, 0]);
  makeRubik();
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.13, 0.13, 0.13]);
  makeTeaPot();
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, -0.5, 2]);
  makeSp([0,0.5,0]);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 0.8]);
  mMatrix = mat4.translate(mMatrix, [2, -0.6/0.8, 1]);
  makeSp([0.3,0,0.3]);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, -1, 0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 1.3, 0.6]);
  mMatrix = mat4.translate(mMatrix, [-4, 0.5, 2.5]);
  makeSlab([0,0,0]);
  mMatrix = popMatrix(matrixStack);

}

function draw_frag() {
  shaderProgram = frag_shader;
  setup_shader(frag_shader);


  gl.clearColor(218/255,242/255,216/255, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  drawBack();

  pushMatrix(matrixStack,mMatrix);


  mMatrix = mat4.scale(mMatrix, [0.4, 0.4, 0.4]);

  // Now draw the cube
  makeScene();
  // drw3();
  mMatrix = popMatrix(matrixStack);

}

var animate = function () {
  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);

  draw_frag();

  moveCam(eyeDegStep,0,0);

  eyeDeg += eyeDegStep;

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


function onMouseDown(event) {
  document.addEventListener("mousemove", onMouseMove, false);
  document.addEventListener("mouseup", onMouseUp, false);
  document.addEventListener("mouseout", onMouseOut, false);

  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    prevMouseX = event.clientX;
    prevMouseY = canvas.height - event.clientY;
    eyeDegStep = 0;
  }
}

function moveCam(angleeX, angleeY, dist) {
  var camPos = vec3.create(eyePos);
  vec3.negate(camPos);
  var xdir = vec3.create([0,0,0]);
  vec3.cross(camPos,viewUp,xdir);
  vec3.normalize(xdir);

  var m = mat4.create();
  mat4.identity(m);

  // Move in x
  mat4.rotate(m, degToRad(angleeX), viewUp);
  mat4.rotate(m, degToRad(angleeY), xdir);

  mat4.multiplyVec3(m, eyePos);

  if (dist != 0) {
    vec3.normalize(eyePos);
    vec3.scale(eyePos, dist);
  }


}

function onMouseMove(event) {
  // make mouse interaction only within canvas
  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX = mouseX - prevMouseX;
    prevMouseX = mouseX;

    var mouseY = canvas.height - event.clientY;
    var diffY = mouseY - prevMouseY;
    prevMouseY = mouseY;

    moveCam(-diffX, diffY, dist_o);
    drawScene();
  }
}

function onMouseUp(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

function webGLStart() {
  canvas = document.getElementById("texture");
  document.addEventListener("mousedown", onMouseDown, false);

  // initialize WebGL
  initGL(canvas);

  // initialize shader program
  frag_shader = initShaders(frag_vsc, frag_fsc);

  //initialize buffers for the square
  initCubeBuffer();
  initSphereBuffer();
  initTeaPot("./texture_and_other_files/teapot.json");

  cubeMapTexture = initCubeMap(cubeMapPath.concat("posx.jpg"),
              cubeMapPath.concat("negx.jpg"),
              cubeMapPath.concat("posy.jpg"),
              cubeMapPath.concat("negy.jpg"),
              cubeMapPath.concat("posz.jpg"),
              cubeMapPath.concat("negz.jpg")
            );

  tableTexture = initSpMap("./texture_and_other_files/wood_texture.jpg");
  tableLegTexture = initCubeAllMap("./texture_and_other_files/wood_texture.jpg");

  rubikTexture = initCubeAllMap("./texture_and_other_files/rcube.png");

  drawScene();
}

function drawBack() {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
  gl.uniform1i(uEnvLoad, 1);
  gl.uniform1i(uTextLoad, 1);
  gl.uniform1i(uTextSwitch, 2);

  pushMatrix(matrixStack,mMatrix);


  mMatrix = mat4.scale(mMatrix, [1000, 1000, 1000]);
  drawCube([0,0,0]);
  mMatrix = popMatrix(matrixStack);
}



var slider = document.getElementById("LightPosSlider");
slider.oninput = function() {
  lightPos[0] = this.value;
}

