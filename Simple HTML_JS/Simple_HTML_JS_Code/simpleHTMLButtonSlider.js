////////////////////////////////////////////////
//  A simple WebGL program that opens a canvas.
// We will go over parts of this code in class in an upcoming lecture.

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
// A simple draw function that just sets the screen color to gray
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("simpleHTMLButtonSlider");

  // register the event listener
  slider = document.getElementById("sliderId");
  slider.addEventListener("input", sliderChanged);

  initGL(canvas);
  drawScene();
}

// slider callback function
var slider;
function sliderChanged() {
  var value = parseFloat(slider.value);
  console.log("Current slider value is", value);
}

// button callback function
function sampleButton(param) {
  console.log("Button Pressed and parameter valueis ", param);
}
