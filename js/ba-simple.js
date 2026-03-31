// ba-simple.js - Simple, clear BA clock-in logic
let stream = null;
let photoData = null;

function showStep(step) {
  for (let i = 1; i <= 4; i++) {
    document.getElementById('step-' + i).classList.add('hidden');
  }
  document.getElementById('step-' + step).classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
  // Step 1: Location
  document.getElementById('btn-location').onclick = function() {
    const status = document.getElementById('location-status');
    status.textContent = 'Getting your location...';
    if (!navigator.geolocation) {
      status.textContent = 'Geolocation is not supported by your browser.';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        status.textContent = 'Location confirmed!';
        showStep(2);
        startCamera();
      },
      (err) => {
        status.textContent = 'Unable to get location. Please allow location access.';
      }
    );
  };

  // Step 2: Take photo
  document.getElementById('btn-photo').onclick = function() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('photo-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    photoData = canvas.toDataURL('image/png');
    showStep(3);
    stopCamera();
  };

  // Step 3: Retake
  document.getElementById('btn-retake').onclick = function() {
    showStep(2);
    startCamera();
  };

  // Step 3: Confirm
  document.getElementById('btn-confirm').onclick = function() {
    // Here you would send photoData and location to your backend
    showStep(4);
  };
});

function startCamera() {
  const video = document.getElementById('webcam');
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(function(s) {
        stream = s;
        video.srcObject = stream;
        video.play();
      })
      .catch(function() {
        alert('Unable to access camera.');
      });
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}
