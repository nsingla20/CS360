////////////////////////////////////////////////////////////////////////
// A simple WebGL program to draw simple 2D shapes with animation.
//

var gl;
var animation;
var sunAngle = 0;
var boatdis = 0;
var boatsp = 0.001;
var fanAngle = 0;
var numTrinC = 50;
var matrixStack = [];

// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;

var mode;

const vertexShaderCode = `#version 300 es
uniform mat4 uMMatrix;
in vec2 aPosition;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 2.5;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
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
    alert(gl.getShaderInfoLog(shader));
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
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders() {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

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

  //finally use the program.
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context


    window.addEventListener('resize',resizeCanvas,false);

    function resizeCanvas() {
      canvas.width = Math.min(window.innerWidth/1.4,800);
      canvas.height = canvas.width;
      gl.viewportWidth = canvas.width; // the width of the canvas
      gl.viewportHeight = canvas.height; // the height
      drawScene();
    }
    resizeCanvas();
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
  mode = gl.TRIANGLES;
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

function initSquareBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([
    1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0,
  ]);
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

function drawSquare(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

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

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  gl.drawElements(
    mode,
    sqVertexIndexBuffer.numItems,
    gl.UNSIGNED_SHORT,
    0
  );
}

function initTriangleBuffer() {
  // buffer for point locations
  const triangleVertices = new Float32Array([0.0, 1.0, -1.0, -1.0, 1.0, -1.0]);
  triangleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  triangleBuf.itemSize = 2;
  triangleBuf.numItems = 3;

  // buffer for point indices
  const triangleIndices = new Uint16Array([2, 1, 0]);
  triangleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
  triangleIndexBuf.itemsize = 1;
  triangleIndexBuf.numItems = 3;
}

function drawTriangle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    triangleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  gl.drawElements(
    mode,
    triangleIndexBuf.numItems,
    gl.UNSIGNED_SHORT,
    0
  );
}

function initCircleBuffer() {


  // buffer for point locations
  circleVertices = new Float32Array(2*(numTrinC+1));
  circleVertices[0] = 0;
  circleVertices[1] = 0;
  // const circleVertices = new Float32Array([0.0 , 0.0 ,
  //   0.0 , 1.0 ,
  //   0.06279051952931337 , 0.9980267284282716 ,
  //   0.12533323356430426 , 0.9921147013144779 ,
  //   0.18738131458572463 , 0.9822872507286887 ,
  //   0.2486898871648548 , 0.9685831611286311 ,
  //   0.3090169943749474 , 0.9510565162951535 ,
  //   0.368124552684678 , 0.9297764858882513 ,
  //   0.4257792915650727 , 0.9048270524660195 ,
  //   0.4817536741017153 , 0.8763066800438636 ,
  //   0.5358267949789967 , 0.8443279255020151 ,
  //   0.5877852522924731 , 0.8090169943749475 ,
  //   0.6374239897486897 , 0.7705132427757891 ,
  //   0.6845471059286887 , 0.7289686274214116 ,
  //   0.7289686274214116 , 0.6845471059286886 ,
  //   0.7705132427757893 , 0.6374239897486896 ,
  //   0.8090169943749475 , 0.587785252292473 ,
  //   0.8443279255020151 , 0.5358267949789965 ,
  //   0.8763066800438637 , 0.48175367410171516 ,
  //   0.9048270524660196 , 0.42577929156507266 ,
  //   0.9297764858882515 , 0.36812455268467786 ,
  //   0.9510565162951535 , 0.30901699437494745 ,
  //   0.9685831611286311 , 0.24868988716485474 ,
  //   0.9822872507286887 , 0.18738131458572452 ,
  //   0.9921147013144779 , 0.12533323356430426 ,
  //   0.9980267284282716 , 0.0627905195293133 ,
  //   1.0 , 0.0 ,
  //   0.9980267284282716 , -0.0627905195293134 ,
  //   0.9921147013144778 , -0.12533323356430437 ,
  //   0.9822872507286886 , -0.18738131458572482 ,
  //   0.9685831611286311 , -0.24868988716485485 ,
  //   0.9510565162951535 , -0.30901699437494756 ,
  //   0.9297764858882513 , -0.368124552684678 ,
  //   0.9048270524660195 , -0.4257792915650727 ,
  //   0.8763066800438635 , -0.48175367410171543 ,
  //   0.844327925502015 , -0.5358267949789969 ,
  //   0.8090169943749475 , -0.587785252292473 ,
  //   0.7705132427757893 , -0.6374239897486897 ,
  //   0.7289686274214114 , -0.6845471059286887 ,
  //   0.6845471059286885 , -0.7289686274214117 ,
  //   0.6374239897486895 , -0.7705132427757894 ,
  //   0.5877852522924732 , -0.8090169943749473 ,
  //   0.5358267949789967 , -0.8443279255020151 ,
  //   0.4817536741017152 , -0.8763066800438636 ,
  //   0.4257792915650725 , -0.9048270524660196 ,
  //   0.36812455268467775 , -0.9297764858882515 ,
  //   0.3090169943749471 , -0.9510565162951536 ,
  //   0.24868988716485482 , -0.9685831611286311 ,
  //   0.18738131458572457 , -0.9822872507286887 ,
  //   0.1253332335643041 , -0.9921147013144779 ,
  //   0.06279051952931314 , -0.9980267284282716 ,
  //   0.0 , -1.0 ,
  //   -0.06279051952931335 , -0.9980267284282716 ,
  //   -0.12533323356430429 , -0.9921147013144779 ,
  //   -0.18738131458572477 , -0.9822872507286886 ,
  //   -0.24868988716485502 , -0.9685831611286311 ,
  //   -0.30901699437494773 , -0.9510565162951535 ,
  //   -0.3681245526846783 , -0.9297764858882512 ,
  //   -0.42577929156507266 , -0.9048270524660195 ,
  //   -0.4817536741017154 , -0.8763066800438635 ,
  //   -0.5358267949789968 , -0.844327925502015 ,
  //   -0.5877852522924734 , -0.8090169943749472 ,
  //   -0.63742398974869 , -0.770513242775789 ,
  //   -0.6845471059286887 , -0.7289686274214116 ,
  //   -0.7289686274214116 , -0.6845471059286886 ,
  //   -0.7705132427757894 , -0.6374239897486895 ,
  //   -0.8090169943749473 , -0.5877852522924732 ,
  //   -0.8443279255020153 , -0.5358267949789963 ,
  //   -0.8763066800438636 , -0.48175367410171527 ,
  //   -0.9048270524660198 , -0.42577929156507216 ,
  //   -0.9297764858882515 , -0.3681245526846778 ,
  //   -0.9510565162951535 , -0.30901699437494756 ,
  //   -0.9685831611286312 , -0.24868988716485443 ,
  //   -0.9822872507286887 , -0.18738131458572463 ,
  //   -0.9921147013144779 , -0.12533323356430373 ,
  //   -0.9980267284282716 , -0.06279051952931321 ,
  //   -1.0 , 0.0 ,
  //   -0.9980267284282716 , 0.06279051952931372 ,
  //   -0.9921147013144779 , 0.12533323356430423 ,
  //   -0.9822872507286886 , 0.18738131458572513 ,
  //   -0.9685831611286311 , 0.24868988716485493 ,
  //   -0.9510565162951536 , 0.30901699437494723 ,
  //   -0.9297764858882512 , 0.36812455268467825 ,
  //   -0.9048270524660196 , 0.4257792915650726 ,
  //   -0.8763066800438634 , 0.4817536741017157 ,
  //   -0.844327925502015 , 0.5358267949789968 ,
  //   -0.809016994374947 , 0.5877852522924737 ,
  //   -0.770513242775789 , 0.63742398974869 ,
  //   -0.7289686274214116 , 0.6845471059286886 ,
  //   -0.6845471059286883 , 0.7289686274214119 ,
  //   -0.6374239897486896 , 0.7705132427757894 ,
  //   -0.5877852522924726 , 0.8090169943749478 ,
  //   -0.5358267949789963 , 0.8443279255020153 ,
  //   -0.4817536741017153 , 0.8763066800438636 ,
  //   -0.4257792915650722 , 0.9048270524660197 ,
  //   -0.36812455268467786 , 0.9297764858882515 ,
  //   -0.3090169943749468 , 0.9510565162951538 ,
  //   -0.2486898871648545 , 0.9685831611286312 ,
  //   -0.18738131458572468 , 0.9822872507286887 ,
  //   -0.1253332335643038 , 0.9921147013144779 ,
  //   -0.06279051952931326 , 0.9980267284282716 ]);
  // buffer for point indices
  circleIndices = new Uint16Array(3*numTrinC);
  for(let i=0;i<numTrinC;i++){
    let theta = (i/numTrinC)*2*Math.PI;
    let x = Math.sin(theta);
    let y = Math.cos(theta);
    circleVertices[2*(i+1)] = x;
    circleVertices[2*(i+1)+1] = y;
    circleIndices[3*i] = 0;
    circleIndices[3*i+1] = i+1;
    if(i==numTrinC-1)
      circleIndices[3*i+2] = 1;
    else
      circleIndices[3*i+2] = i+2;
  }
  circleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);
  circleBuf.itemSize = 2;
  circleBuf.numItems = numTrinC+1;

  // const circleIndices = new Uint16Array([0 , 1 , 2 ,
  //   0 , 2 , 3 ,
  //   0 , 3 , 4 ,
  //   0 , 4 , 5 ,
  //   0 , 5 , 6 ,
  //   0 , 6 , 7 ,
  //   0 , 7 , 8 ,
  //   0 , 8 , 9 ,
  //   0 , 9 , 10 ,
  //   0 , 10 , 11 ,
  //   0 , 11 , 12 ,
  //   0 , 12 , 13 ,
  //   0 , 13 , 14 ,
  //   0 , 14 , 15 ,
  //   0 , 15 , 16 ,
  //   0 , 16 , 17 ,
  //   0 , 17 , 18 ,
  //   0 , 18 , 19 ,
  //   0 , 19 , 20 ,
  //   0 , 20 , 21 ,
  //   0 , 21 , 22 ,
  //   0 , 22 , 23 ,
  //   0 , 23 , 24 ,
  //   0 , 24 , 25 ,
  //   0 , 25 , 26 ,
  //   0 , 26 , 27 ,
  //   0 , 27 , 28 ,
  //   0 , 28 , 29 ,
  //   0 , 29 , 30 ,
  //   0 , 30 , 31 ,
  //   0 , 31 , 32 ,
  //   0 , 32 , 33 ,
  //   0 , 33 , 34 ,
  //   0 , 34 , 35 ,
  //   0 , 35 , 36 ,
  //   0 , 36 , 37 ,
  //   0 , 37 , 38 ,
  //   0 , 38 , 39 ,
  //   0 , 39 , 40 ,
  //   0 , 40 , 41 ,
  //   0 , 41 , 42 ,
  //   0 , 42 , 43 ,
  //   0 , 43 , 44 ,
  //   0 , 44 , 45 ,
  //   0 , 45 , 46 ,
  //   0 , 46 , 47 ,
  //   0 , 47 , 48 ,
  //   0 , 48 , 49 ,
  //   0 , 49 , 50 ,
  //   0 , 50 , 51 ,
  //   0 , 51 , 52 ,
  //   0 , 52 , 53 ,
  //   0 , 53 , 54 ,
  //   0 , 54 , 55 ,
  //   0 , 55 , 56 ,
  //   0 , 56 , 57 ,
  //   0 , 57 , 58 ,
  //   0 , 58 , 59 ,
  //   0 , 59 , 60 ,
  //   0 , 60 , 61 ,
  //   0 , 61 , 62 ,
  //   0 , 62 , 63 ,
  //   0 , 63 , 64 ,
  //   0 , 64 , 65 ,
  //   0 , 65 , 66 ,
  //   0 , 66 , 67 ,
  //   0 , 67 , 68 ,
  //   0 , 68 , 69 ,
  //   0 , 69 , 70 ,
  //   0 , 70 , 71 ,
  //   0 , 71 , 72 ,
  //   0 , 72 , 73 ,
  //   0 , 73 , 74 ,
  //   0 , 74 , 75 ,
  //   0 , 75 , 76 ,
  //   0 , 76 , 77 ,
  //   0 , 77 , 78 ,
  //   0 , 78 , 79 ,
  //   0 , 79 , 80 ,
  //   0 , 80 , 81 ,
  //   0 , 81 , 82 ,
  //   0 , 82 , 83 ,
  //   0 , 83 , 84 ,
  //   0 , 84 , 85 ,
  //   0 , 85 , 86 ,
  //   0 , 86 , 87 ,
  //   0 , 87 , 88 ,
  //   0 , 88 , 89 ,
  //   0 , 89 , 90 ,
  //   0 , 90 , 91 ,
  //   0 , 91 , 92 ,
  //   0 , 92 , 93 ,
  //   0 , 93 , 94 ,
  //   0 , 94 , 95 ,
  //   0 , 95 , 96 ,
  //   0 , 96 , 97 ,
  //   0 , 97 , 98 ,
  //   0 , 98 , 99 ,
  //   0 , 99 , 100 ,
  //   0 , 100 , 1]);
  circleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, circleIndices, gl.STATIC_DRAW);
  circleIndexBuf.itemsize = 3;
  circleIndexBuf.numItems = 3*numTrinC;
}
function drawCircle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    circleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  gl.drawElements(
    mode,
    circleIndexBuf.numItems,
    gl.UNSIGNED_SHORT,
    0
  );
}
////////////////////////////////////////////////////////////////////////
var animate = function () {
  gl.clearColor(1, 1, 1, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // initialize the model matrix to identity matrix
  color = [0.8, 0, 0, 1];
  mat4.identity(mMatrix);
  drawSky(mMatrix);

  //Sun
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.7, 0.8, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 1.0]);
  drawSun(mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Cloud
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.7, 0.55, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 1.0]);
  drawCloud(mMatrix);
  mMatrix = popMatrix(matrixStack);


  // Birds
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 1.0]);
  mMatrix = mat4.translate(mMatrix, [2.0, 7.5, 0.0]);
  drawBird(mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 1.0]);
  mMatrix = mat4.translate(mMatrix, [3.0, 2.0, 0.0]);
  drawBird(mMatrix);
  mMatrix = mat4.translate(mMatrix, [-8.0, -1.0, 0.0]);
  drawBird(mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.6, 1.0]);
  mMatrix = mat4.translate(mMatrix, [5.0, 2.0, 0.0]);
  drawBird(mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.6, 1.0]);
  mMatrix = mat4.translate(mMatrix, [5.0, 2.0, 0.0]);
  drawBird(mMatrix);
  mMatrix = popMatrix(matrixStack);

  // Mountains
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.8, 0.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.7, 0.6, 1.0]);
  drawMount(mMatrix,10);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.8, 0.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.3, 0.6, 1.0]);
  drawMount(mMatrix,0);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.1, 0.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.3, 1.0, 1.0]);
  drawMount(mMatrix,10);
  mMatrix = popMatrix(matrixStack);

  drawGround(mMatrix);

  //Trees
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.8, 1.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [1.0, -0.02, 0.0]);
  drawTree(mMatrix);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.9, 1.15, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0.55, -0.02, 0.0]);
  drawTree(mMatrix);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.7, 0.85, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0.35, -0.02, 0.0]);
  drawTree(mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Path
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [2.0, 1.0, 1.0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(40), [0.0, 0.0, 1.0]);
  mMatrix = mat4.translate(mMatrix, [-0.25, -1.1, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.0, 1.2, 1.0]);
  drawTriangle([120/255, 177/255, 72/255, 1.0],mMatrix);
  mMatrix = popMatrix(matrixStack);

  //River
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.13, 0.0]);
  drawRiver(mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Fans
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 1.0]);
  mMatrix = mat4.translate(mMatrix, [0.8, -0.54, 0.0]);
  drawFan(mMatrix);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 1.0]);
  mMatrix = mat4.translate(mMatrix, [-0.8, -0.54, 0.0]);
  drawFan(mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Bushes
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.3, -0.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.7, 0.7, 1.0]);
  drawBush(mMatrix);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.9, -0.5, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.6, 1.0]);
  drawBush(mMatrix);
  mMatrix = popMatrix(matrixStack);
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [1.0, -0.4, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.85, 0.85, 1.0]);
  drawBush(mMatrix);
  mMatrix = popMatrix(matrixStack);

  //House
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.0]);
  mMatrix = mat4.translate(mMatrix, [-1.3, -1.15, 0.0]);
  drawHouse(mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Car
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.0]);
  mMatrix = mat4.translate(mMatrix, [-1.1, -1.6, 0.0]);
  drawCar(mMatrix);
  mMatrix = popMatrix(matrixStack);

  //Bush
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.1, -1.0, 0.0]);
  mMatrix = mat4.scale(mMatrix, [1.2, 1.0, 1.0]);
  drawBush(mMatrix);
  mMatrix = popMatrix(matrixStack);

  animation = window.requestAnimationFrame(animate);
};
function drawSky(mtx) {
  color = [128/255, 202/255, 250/255, 1];
  mtx = mat4.create(mtx);
  pushMatrix(matrixStack, mtx);

  mtx = mat4.scale(mtx, [1.0, 0.5, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 1.0, 0.0]);
  drawSquare(color, mtx);

  mtx = popMatrix(matrixStack);
}
function drawGround(mtx) {
  color = [104/255, 226/255, 138/255,1.0];
  mtx = mat4.create(mtx);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [1.0, 0.5, 1.0]);
  mtx = mat4.translate(mtx, [0.0, -1.0, 0.0]);
  drawSquare(color, mtx);

  mtx = popMatrix(matrixStack);
}
function drawBird(mtx) {
  color = [0.0,0.0,0.0,1.0];
  mtx = mat4.create(mtx);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.1, 0.1, 1.0]);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [0.0, -0.8, 0.0]);
  drawCircle(color, mtx);

  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);

  mtx = mat4.rotate(mtx, degToRad(10), [0.0, 0.0, 1.0]);
  mtx = mat4.scale(mtx, [6.0, 0.7, 1.0]);
  mtx = mat4.translate(mtx, [1.0, 1.0, 0.0]);
  drawTriangle(color,mtx);

  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);

  mtx = mat4.rotate(mtx, degToRad(-10), [0.0, 0.0, 1.0]);
  mtx = mat4.scale(mtx, [6.0, 0.7, 1.0]);
  mtx = mat4.translate(mtx, [-1.0, 1.0, 0.0]);
  drawTriangle(color,mtx);

  mtx = popMatrix(matrixStack);

  mtx = popMatrix(matrixStack);

}
function drawMount(mtx, angle) {
  color = [123/255, 94/255, 70/255, 1.0];
  mtx = mat4.create(mtx);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.6, 0.6, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 0.5, 0.0]);

  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [1.0, 0.4, 1.0]);
  mtx = mat4.translate(mtx, [0.0, -1.0, 0.0]);
  drawTriangle(color,mtx);

  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);

  mtx = mat4.rotate(mtx, degToRad(angle), [0.0, 0.0, 1.0]);
  mtx = mat4.scale(mtx, [1.0, 0.4, 1.0]);
  mtx = mat4.translate(mtx, [0.0, -1.0, 0.0]);
  color = [145/255, 121/255, 87/255, 1];
  drawTriangle(color,mtx);


  mtx = popMatrix(matrixStack);

  mtx = popMatrix(matrixStack);
}
function drawRiver(mtx) {
  color = [42/255, 100/255, 246/255, 1];
  mtx = mat4.create(mtx);

  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [1.0, 0.1, 1.0]);
  drawSquare(color, mtx);
  mtx = popMatrix(matrixStack);

  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.2, 0.002, 1.0]);

  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [-3.5, 0.0, 0.0]);
  drawSquare([0.7,0.7,0.7,1], mtx);
  mtx = popMatrix(matrixStack);

  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [0.0, 20.0, 0.0]);
  drawSquare([0.7,0.7,0.7,1], mtx);
  mtx = popMatrix(matrixStack);

  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [3.5, -20.0, 0.0]);
  drawSquare([0.7,0.7,0.7,1], mtx);
  mtx = popMatrix(matrixStack);

  mtx = popMatrix(matrixStack);

  //Boat
  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [boatdis, 0.03, 0.0]);
  mtx = mat4.scale(mtx, [0.3, 0.3, 1.0]);
  drawBoat(mtx);
  mtx = popMatrix(matrixStack);

  boatdis += boatsp;
  if (Math.abs(boatdis) > 0.7) {
    boatsp *= -1;
  }

}
function drawTree(mtx) {
  mtx = mat4.create(mtx);

  //stem
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.025, 0.2, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 1.0, 0.0]);
  drawSquare([121/255, 79/255, 78/255, 1.0], mtx);
  mtx = popMatrix(matrixStack);

  //leaves
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.2, 0.15, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 2.7, 0.0]);
  drawTriangle([67/255, 151/255, 85/255, 1.0], mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.22, 0.15, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 3.0, 0.0]);
  drawTriangle([105/255, 177/255, 90/255, 1.0], mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.23, 0.15, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 3.3, 0.0]);
  drawTriangle([128/255, 202/255, 95/255, 1.0], mtx);
  mtx = popMatrix(matrixStack);

  // mtx = popMatrix(matrixStack);
  // pushMatrix(matrixStack, mtx);

  // mtx = mat4.rotate(mtx, degToRad(10), [0.0, 0.0, 1.0]);
  // mtx = mat4.scale(mtx, [6.0, 0.7, 1.0]);
  // mtx = mat4.translate(mtx, [1.0, 1.0, 0.0]);
  // drawTriangle(color,mtx);

  // mtx = popMatrix(matrixStack);
  // pushMatrix(matrixStack, mtx);

  // mtx = mat4.rotate(mtx, degToRad(-10), [0.0, 0.0, 1.0]);
  // mtx = mat4.scale(mtx, [6.0, 0.7, 1.0]);
  // mtx = mat4.translate(mtx, [-1.0, 1.0, 0.0]);
  // drawTriangle(color,mtx);

  // mtx = popMatrix(matrixStack);

  // mtx = popMatrix(matrixStack);
}
function drawBush(mtx) {
  mtx = mat4.create(mtx);

  cLeft = [80/255, 176/255, 51/255,1];
  cCen = [67/255, 151/255, 42/255,1];
  cRight = [42/255, 100/255, 25/255,1];

  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.1, 0.08, 1.0]);
  mtx = mat4.translate(mtx, [-1.5, -0.3, 0.0]);
  drawCircle(cLeft,mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.1, 0.08, 1.0]);
  mtx = mat4.translate(mtx, [1.5, -0.4, 0.0]);
  drawCircle(cRight,mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.15, 0.1, 1.0]);
  drawCircle(cCen,mtx);
  mtx = popMatrix(matrixStack);

}
function drawCar(mtx) {
  mtx = mat4.create(mtx);

  let cTop = [191/255, 107/255, 83/255,1];
  let cMid = [55/255, 126/255, 222/255,1];
  let cTr = [128/255, 128/255, 128/255,1];


  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [0.0, -0.15, 0.0]);
  mtx = mat4.scale(mtx, [0.08, 0.08, 1.0]);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [2.5, 0.0, 0.0]);
  drawCircle([0,0,0,1], mtx);
  mtx = mat4.scale(mtx, [0.8, 0.8, 1.0]);
  drawCircle(cTr, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [-2.5, 0.0, 0.0]);
  drawCircle([0,0,0,1], mtx);
  mtx = mat4.scale(mtx, [0.8, 0.8, 1.0]);
  drawCircle(cTr, mtx);
  mtx = popMatrix(matrixStack);
  mtx = popMatrix(matrixStack);

  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.4, 0.1, 1.0]);
  drawSquare(cMid, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.1, 0.1, 1.0]);
  mtx = mat4.translate(mtx, [4.0, 0.0, 0.0]);
  drawTriangle(cMid, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.1, 0.1, 1.0]);
  mtx = mat4.translate(mtx, [-4.0, 0.0, 0.0]);
  drawTriangle(cMid, mtx);
  mtx = popMatrix(matrixStack);

  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [0.0, 0.2, 0.0]);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.2, 0.1, 1.0]);
  drawSquare(cTop, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.1, 0.1, 1.0]);
  mtx = mat4.translate(mtx, [2.0, 0.0, 0.0]);
  drawTriangle(cTop, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.1, 0.1, 1.0]);
  mtx = mat4.translate(mtx, [-2.0, 0.0, 0.0]);
  drawTriangle(cTop, mtx);
  mtx = popMatrix(matrixStack);
  mtx = popMatrix(matrixStack);
}
function drawSun(mtx) {
  mtx = mat4.create(mtx);

  color = [251/255, 230/255, 77/255,1];

  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.2, 0.2, 1.0]);
  drawCircle(color,mtx);
  mtx = popMatrix(matrixStack);

  for (let i=0; i<4; i++){
    pushMatrix(matrixStack, mtx);
    mtx = mat4.rotate(mtx, degToRad(i*45 + sunAngle), [0.0, 0.0, 1.0]);
    mtx = mat4.scale(mtx, [0.005, 0.3, 1.0]);
    drawSquare(color,mtx);
    mtx = popMatrix(matrixStack);
  }
  sunAngle += 0.2;

}
function drawCloud(mtx) {
  mtx = mat4.create(mtx);
  color = [1,1,1,1];
  mtx = mat4.scale(mtx, [0.2, 0.1, 1.0]);

  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [-1.3, 0.5, 0.0]);
  mtx = mat4.scale(mtx, [1.2, 1.2, 1.0]);
  drawCircle(color, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  drawCircle(color, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [1.3, 0.0, 0.0]);
  mtx = mat4.scale(mtx, [0.8, 0.8, 1.0]);
  drawCircle(color, mtx);
  mtx = popMatrix(matrixStack);

}
function drawHouse(mtx) {
  mtx = mat4.create(mtx);

  cRoof = [236/255, 91/255, 41/255,1];
  cWall = [229/255, 229/255, 229/255,1];
  cWin = [221/255, 181/255, 61/255,1];

  //Roof
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.4, 0.2, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 3.0, 0.0]);
  drawSquare(cRoof, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.2, 0.2, 1.0]);
  mtx = mat4.translate(mtx, [2.0, 3.0, 0.0]);
  drawTriangle(cRoof, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.2, 0.2, 1.0]);
  mtx = mat4.translate(mtx, [-2.0, 3.0, 0.0]);
  drawTriangle(cRoof, mtx);
  mtx = popMatrix(matrixStack);

  //Wall
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.5, 0.2, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 1.0, 0.0]);
  drawSquare(cWall, mtx);
  mtx = popMatrix(matrixStack);

  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.07, 0.12, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 1.0, 0.0]);
  drawSquare(cWin, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.07, 0.07, 1.0]);
  mtx = mat4.translate(mtx, [-4.0, 3.4286, 0.0]);
  drawSquare(cWin, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.07, 0.07, 1.0]);
  mtx = mat4.translate(mtx, [4.0, 3.4286, 0.0]);
  drawSquare(cWin, mtx);
  mtx = popMatrix(matrixStack);


}
function drawBoat(mtx) {
  mtx = mat4.create(mtx);

  cBase = [204/255, 204/255, 204/255,1];
  cStem = [0,0,0,1];
  cFlag = [212/255, 88/255, 37/255,1];

  //Stems
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.02, 0.4, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 0.9, 0.0]);
  drawSquare(cStem, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.rotate(mtx, degToRad(-30), [0.0, 0.0, 1.0]);
  mtx = mat4.translate(mtx, [-0.35, 0.15, 0.0]);
  mtx = mat4.scale(mtx, [0.01, 0.44, 1.0]);
  drawSquare(cStem, mtx);
  mtx = popMatrix(matrixStack);

  //Flag
  pushMatrix(matrixStack, mtx);
  mtx = mat4.rotate(mtx, degToRad(-90), [0.0, 0.0, 1.0]);
  mtx = mat4.scale(mtx, [0.3, 0.3, 1.0]);
  mtx = mat4.translate(mtx, [-1.25, 1.0666, 0.0]);

  drawTriangle(cFlag, mtx);
  mtx = popMatrix(matrixStack);


  //Base
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.4, 0.1, 1.0]);
  mtx = mat4.translate(mtx, [0.0, -1.0, 0.0]);
  drawSquare(cBase, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.1, -0.1, 1.0]);
  mtx = mat4.translate(mtx, [4.0, 1.0, 0.0]);
  drawTriangle(cBase, mtx);
  mtx = popMatrix(matrixStack);
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.1, -0.1, 1.0]);
  mtx = mat4.translate(mtx, [-4.0, 1.0, 0.0]);
  drawTriangle(cBase, mtx);
  mtx = popMatrix(matrixStack);


}
function drawFan(mtx) {
  mtx = mat4.create(mtx);

  cStem = [51/255, 51/255, 51/255,1];
  cCen = [0,0,0,1];
  cFan = [179/255, 179/255, 57/255,1];

  //Stem
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.015, 0.3, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 1.0, 0.0]);
  drawSquare(cStem, mtx);
  mtx = popMatrix(matrixStack);

  //Fans
  pushMatrix(matrixStack, mtx);
  mtx = mat4.translate(mtx, [0.0, 0.6, 0.0]);
  for (let i=0; i<4; i++){
    pushMatrix(matrixStack, mtx);
    mtx = mat4.rotate(mtx, degToRad(i*90 + fanAngle), [0.0, 0.0, 1.0]);
    mtx = mat4.scale(mtx, [0.05, 0.14, 1.0]);
    mtx = mat4.translate(mtx, [0.0, -1.0, 0.0]);
    drawTriangle(cFan,mtx);
    mtx = popMatrix(matrixStack);
  }
  mtx = popMatrix(matrixStack);
  fanAngle -= 0.5;
  //Center
  pushMatrix(matrixStack, mtx);
  mtx = mat4.scale(mtx, [0.04, 0.04, 1.0]);
  mtx = mat4.translate(mtx, [0.0, 15, 0.0]);
  drawCircle(cCen, mtx);
  mtx = popMatrix(matrixStack);

}
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  // stop the current loop of animation
  if (animation) {
    window.cancelAnimationFrame(animation);
  }

  animate();
}

// This is the entry point from the html
function webGLStart() {
  var canvas = document.getElementById("2D_Scene_Rendering");
  initGL(canvas);
  shaderProgram = initShaders();

  //get locations of attributes declared in the vertex shader
  const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);

  uColorLoc = gl.getUniformLocation(shaderProgram, "color");

  initSquareBuffer();
  initTriangleBuffer();
  initCircleBuffer();

  drawScene();
}

