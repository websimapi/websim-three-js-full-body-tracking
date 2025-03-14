import * as THREE from 'three';

// Create a loading manager
export const loadingManager = new THREE.LoadingManager();

// Get the loading div
const loadingElement = document.getElementById('loading');

// Setup loading manager callbacks
loadingManager.onStart = function(url, itemsLoaded, itemsTotal) {
    console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    loadingElement.style.display = 'block';
};

loadingManager.onLoad = function() {
    console.log('Loading complete!');
    loadingElement.style.display = 'none';
};

loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    const progress = Math.floor((itemsLoaded / itemsTotal * 100));
    console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files. (' + progress + '%)');
    loadingElement.innerHTML = `Loading 3D model...<br>${progress}%`;
};

loadingManager.onError = function(url) {
    console.log('There was an error loading ' + url);
    loadingElement.innerHTML = `Error loading model!<br>Please refresh the page.`;
};