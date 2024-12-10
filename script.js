/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

let children = []; //detected object's bounding box
let objectMap = new Map(); //for detected objects, their bounding boxes and frame counters
let activeImages = new Map(); //tracks active images by object ID
let mode = 'replace'; //image placement mode

const detectionThrottle = 350; //time between predictions (for better clicking)
const persistenceFrames = 8; //frames to persist after undetected objects
let lastDetectionTime = 0;

//enable camera and get video feed with object detection------------------------------------------------------
const interfaceSection = document.getElementById('interface');
//const modeToggleButton = document.getElementById('modeToggleButton');
let model = undefined; //detection model

cocoSsd.load().then(function (loadedModel) { //wait until model is loaded in
  model = loadedModel;
  interfaceSection.classList.remove("invisible");
});

const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const popupMenu = document.createElement('div'); //Popup menu for images selection

function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if (hasGetUserMedia()) {
  const enableWebcamButton = document.getElementById('webcamButton');
  enableWebcamButton.addEventListener('click', enableCam);
} else {
  console.warn('getUserMedia() is not supported by your browser');
}

function enableCam(event) {
  if (!model) {
    console.log('Wait! Model not loaded yet.');
    return;
  }
  event.target.classList.add('removed');
  modeToggleButton.style.display = "block";
  const constraints = {
    video: true,
  };
  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener('loadeddata', predictWebcam);
  });
}

//image addition with a popup menu and modes (replace and collage)---------------------------------------------------
popupMenu.id = 'popupMenu';
popupMenu.style.display = 'none';
document.body.appendChild(popupMenu);

//add image options
const imageOptions = [];

for(let i = 1; i <= 11; i++) { //change to add images dynamically (to be improved)
  if (i < 10) {
    imageOptions.push("Images/image000" + i + ".png");
  } else if (i < 100) {
    imageOptions.push("Images/image00" + i + ".png");
  } else {
    imageOptions.push("Images/image0" + i + ".png");
  }
}

imageOptions.forEach((imageSrc) => {
  const imgOption = document.createElement('img');
  imgOption.src = imageSrc;
  imgOption.style.width = '10vw';
  imgOption.style.height = 'auto';
  imgOption.style.padding = '2vw';
  //imgOption.style.backgroundColor = 'rgb(117, 117, 117)';
  imgOption.style.cursor = 'pointer';
  popupMenu.appendChild(imgOption);

  imgOption.addEventListener('click', function () { //select image
    placeImage(popupMenu.dataset.id, imageSrc);
    popupMenu.style.display = 'none';
  });
});

//toggle between image modes
modeToggleButton.addEventListener('click', () => {
  modeToggleButton.textContent = `Switch to ${mode} mode`;
  mode = mode === 'replace' ? 'collage' : 'replace';
  console.log(mode);
});

document.body.appendChild(modeToggleButton);

//draw the highlight and the images in the correct position---------------------------------------------------------------------
function predictWebcam() {
  const now = Date.now();
  if (now - lastDetectionTime < detectionThrottle) {
    window.requestAnimationFrame(predictWebcam);
    return;
  }
  lastDetectionTime = now;

  model.detect(video).then(function (predictions) {
    // Refresh highlights
    for (let i = 0; i < children.length; i++) {
      liveView.removeChild(children[i]);
    }
    children.splice(0);

    const newObjectMap = new Map();
    const videoBounds = video.getBoundingClientRect(); //get video dimensions
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    const scaleX = videoBounds.width / originalWidth; // horizontal scaling
    const scaleY = videoBounds.height / originalHeight; //vertical scaling

    for (let n = 0; n < predictions.length; n++) {
      if (predictions[n].score > 0.50) {
        const bbox = predictions[n].bbox;
        const id = getObjectId(bbox); //get unique ID

        const scaledBBox = [
          bbox[0] * scaleX,
          bbox[1] * scaleY,
          bbox[2] * scaleX,
          bbox[3] * scaleY
        ]; //scale the highligth box to the video dimensions

        newObjectMap.set(id, { bbox, frames: persistenceFrames }); //update frame count
        //newObjectMap.set(id, { bbox: scaledBBox, frames: persistenceFrames });
        const p = document.createElement('p');
        p.innerText = predictions[n].class + ' - with ' +
          Math.round(predictions[n].score * 100) + '% confidence.';
        //p.style = `left: ${bbox[0]}px; top: ${bbox[1]}px; width: ${bbox[2] - 30}px;`;
        p.style = `left: ${scaledBBox[0]}px; top: ${scaledBBox[1]}px; width: ${scaledBBox[2] - 30}px;`;

        const highlighter = document.createElement('div');
        highlighter.setAttribute('class', 'highlighter');
        //highlighter.style = `left: ${bbox[0]}px; top: ${bbox[1]}px; width: ${bbox[2]}px; height: ${bbox[3]}px;`;
        highlighter.style = `left: ${scaledBBox[0]}px; top: ${scaledBBox[1]}px; width: ${scaledBBox[2]}px; height: ${scaledBBox[3]}px;`;
        highlighter.dataset.id = id;

        //update image position (if it exists)
        if (activeImages.has(id)) {
          const img = activeImages.get(id);
          img.style.left = `${scaledBBox[0]}px`;
          img.style.top = `${scaledBBox[1]}px`;
          /*img.style.left = `${bbox[0]}px`;
          img.style.top = `${bbox[1]}px`;*/
          /*img.style.width = `${scaledBBox[2]}px`;
          img.style.height = `${scaledBBox[3]}px`;*/
          if (scaledBBox[2] <= scaledBBox[3]) {
            img.style.width = `auto`;
            img.style.height = `${scaledBBox[3]}px`;
          } else {
            img.style.width = `${scaledBBox[2]}px`;
            img.style.height = `auto`;
          }
        }

        highlighter.addEventListener('click', function () {

          //Popup menu position
          let popupLeft = event.clientX;
          let popupTop = event.clientY;

          //check if popup is inside the window and adjust postion
          popupMenu.style.display = "block"; //temporary display to get dimensions
          const popupWidth = popupMenu.offsetWidth;
          const popupHeight = popupMenu.offsetHeight;
          popupMenu.style.display = "none";

          if (popupLeft + popupWidth > window.innerWidth) {
            popupLeft = window.innerWidth - popupWidth - 10;
          }
          if (popupTop + popupHeight > window.innerHeight) {
            popupTop = window.innerHeight - popupHeight - 10;
          }

          popupMenu.style.left = `${popupLeft}px`;
          popupMenu.style.top = `${popupTop}px`;
          popupMenu.style.display = "block";
          popupMenu.dataset.id = id;
        });

        liveView.appendChild(highlighter);
        liveView.appendChild(p);
        children.push(highlighter);
        children.push(p);
      }
    }

    //update objectMap with new detections and decrease frame counters for undetected objects
    for (const [id, data] of objectMap.entries()) {
      if (newObjectMap.has(id)) {
        newObjectMap.get(id).frames = persistenceFrames; //Reset frame count for detected objects
      } else {
        //frame countdown for undetected objects
        data.frames -= 1;
        if (data.frames > 0) {
          newObjectMap.set(id, data);
        } else {
          //remove image if the object is no longer there for an amount of time
          if (activeImages.has(id)) {
            const img = activeImages.get(id);
            liveView.removeChild(img);
            activeImages.delete(id);
          }
        }
      }
    }

    objectMap = newObjectMap; //replace old mapping
    window.requestAnimationFrame(predictWebcam);
  });
}

//place an image
function placeImage(id, imageSrc) {
  if (mode === "replace" && activeImages.has(id)) {
    //removes the previous image with the new one (if there are any)
    const oldImg = activeImages.get(id);
    liveView.removeChild(oldImg);
    activeImages.delete(id);
  }

  const img = document.createElement("img");
  const bbox = objectMap.get(id).bbox;

  // Scale the image to fit the widest part of the bounding box
  const bboxWidth = bbox[2];
  const bboxHeight = bbox[3];
  const isWide = bboxWidth > bboxHeight;

  img.src = imageSrc;
  img.style.position = "absolute";
  /*img.style.left = `${bbox[0]}px`;
  img.style.top = `${bbox[1]}px`;
  img.style.width = `${bbox[2]}px`;
  img.style.height = `${bbox[3]}px`;*/

  //set width and height based on aspect ratio
  if (isWide) {
    img.style.width = `${bboxWidth}px`;
    img.style.height = "auto";
  } else {
    img.style.height = `${bboxHeight}px`;
    img.style.width = "auto";
  }

  img.style.left = `${bbox[0] + (bboxWidth - img.offsetWidth)/2}px`; //center (in theory)
  img.style.top = `${bbox[1] + bboxHeight - img.offsetHeight}px`; //align to bottom (in theory)

  img.id = `img-${id}`;
  liveView.appendChild(img);
  activeImages.set(id, img);
}

//hide popup menu if click outside
document.addEventListener('click', (event) => {
  if (!popupMenu.contains(event.target) && event.target.className !== 'highlighter') {
    popupMenu.style.display = 'none';
  }
});

//check for new detected objects and give them IDs
function getObjectId(currentBBox) {
  for (const [id, data] of objectMap.entries()) {
    if (computeIoU(data.bbox, currentBBox) > 0.5) {
      return id; //return existing ID if IoU is high
    }
  }
  const newId = `${Date.now()}-${Math.random()}`; //generate new ID (no doubles)
  return newId;
}

function computeIoU(bbox1, bbox2) { //Intersection over Union for object detection continuity
  const x1 = Math.max(bbox1[0], bbox2[0]);
  const y1 = Math.max(bbox1[1], bbox2[1]);

  const x2 = Math.min(bbox1[0] + bbox1[2], bbox2[0] + bbox2[2]);
  const y2 = Math.min(bbox1[1] + bbox1[3], bbox2[1] + bbox2[3]);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);

  const area1 = bbox1[2] * bbox1[3];
  const area2 = bbox2[2] * bbox2[3];

  const union = area1 + area2 - intersection;
  return intersection / union;
}

//get prominent video color for background------------------------------------------------------------------------
const colorCanvas = document.createElement('canvas');
const colorContext = colorCanvas.getContext('2d');

//update background color based on video frame
function updateBackgroundColor() {
  if (!video.videoWidth || !video.videoHeight) return;

  let r = 0, g = 0, b = 0, pixelCount = 0;
  colorCanvas.width = video.videoWidth;
  colorCanvas.height = video.videoHeight;

  colorContext.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

  const frameData = colorContext.getImageData(0, 0, video.videoWidth, video.videoHeight).data; //get pixel colors

  for (let i = 0; i < frameData.length; i += 4) {
    r += frameData[i];     // Red
    g += frameData[i + 1]; // Green
    b += frameData[i + 2]; // Blue
    pixelCount++;
  }

  //average RGB values
  r = Math.round(r / pixelCount);
  g = Math.round(g / pixelCount);
  b = Math.round(b / pixelCount);

  document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
}

//update the background color after the video is loaded
video.addEventListener('loadeddata', () => {
  setInterval(updateBackgroundColor, 500);
});