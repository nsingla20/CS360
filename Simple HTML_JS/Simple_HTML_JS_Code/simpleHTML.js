////////////////////////////////////////////////
//  A simple WebGL program that opens a canvas.
//

var gl;
var canvas;

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the webgl2 graphics context
    gl.viewportWidth = canvas.width; // the width
    gl.viewportHeight = canvas.height; // the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

////////////////////////////////////////////////////////////////////////
// The main drawing routine, but does nothing except clearing the canvas
//
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("simpleHTML");
  initGL(canvas);
  drawScene();
}
