function showImageLoadingIndicator(cardElement, isFirstLoad = false) {
  const existingOverlay = cardElement.querySelector('.image-loading-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'image-loading-overlay';
  
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  
  const progressContainer = document.createElement('div');
  progressContainer.className = 'loading-progress-container';
  
  const progressBar = document.createElement('div');
  progressBar.className = 'loading-progress-bar';
  progressBar.style.width = '0%';
  progressContainer.appendChild(progressBar);
  
  const loadingText = document.createElement('div');
  loadingText.className = 'loading-text';
  
  if (isFirstLoad) {
    loadingText.textContent = 'First photo loads longer than others. Please, wait...';
  } else {
    loadingText.textContent = 'Loading images... (0%)';
  }
  
  overlay.appendChild(spinner);
  overlay.appendChild(progressContainer);
  overlay.appendChild(loadingText);
  
  cardElement.appendChild(overlay);
  
  let progress = 0;
  const duration = isFirstLoad ? 16 : 10; 
  const interval = 300; 
  const totalSteps = (duration * 1000) / interval;
  const increment = 100 / totalSteps;
  
  const progressSimulation = setInterval(() => {
    progress += increment;
    if (progress >= 100) {
      progress = 100;
      clearInterval(progressSimulation);
    }
    
    progressBar.style.width = `${progress}%`;
    
    if (!isFirstLoad) {
      const progressText = Math.round(progress);
      loadingText.textContent = `Photo Loading... (${progressText}%)`;
    }
    
    if (progress >= 100) {
      hideImageLoadingIndicator(cardElement);
    }
  }, interval);
  
  // Сохраняем id интервала в элементе, чтобы иметь возможность очистить его позже
  overlay.dataset.intervalId = progressSimulation;
  
  return overlay;
}

function hideImageLoadingIndicator(cardElement) {
  const overlay = cardElement.querySelector('.image-loading-overlay');
  if (!overlay) return;
  
  if (overlay.dataset.intervalId) {
    clearInterval(parseInt(overlay.dataset.intervalId));
  }
  
  overlay.classList.add('fade-out');
  
  setTimeout(() => {
    if (overlay && overlay.parentNode === cardElement) {
      cardElement.removeChild(overlay);
    }
  }, 300);
}

function loadNewMemeWithIndicator() {
  const card = document.getElementById('current-meme');
  const img = card.querySelector('.meme-image');
  const title = document.getElementById('meme-title');
  
  const isFirstLoad = !img.src || img.src.includes('loading.gif');
  
  gsap.set(card, { x:0, y:0, rotation:0, opacity:1, boxShadow:'0 10px 20px rgba(0,0,0,.1)' });
  
  showImageLoadingIndicator(card, isFirstLoad);
  
  const onImageLoaded = () => {
    hideImageLoadingIndicator(card);
    animateNewCard(card);
    img.removeEventListener('load', onImageLoaded);
  };
  
  img.addEventListener('load', onImageLoaded);
  
  originalLoadNewMeme();
}

function patchLoadNewMeme() {
  window.originalLoadNewMeme = window.loadNewMeme;
  
  window.loadNewMeme = function() {
    const card = document.getElementById('current-meme');
    const img = card.querySelector('.meme-image');
    
    const isFirstLoad = !img.src || img.src.includes('loading.gif');
    
    gsap.set(card, { x:0, y:0, rotation:0, opacity:1, boxShadow:'0 10px 20px rgba(0,0,0,.1)' });
    
    showImageLoadingIndicator(card, isFirstLoad);
    
    const onImageLoaded = () => {
      hideImageLoadingIndicator(card);
      animateNewCard(card);
      img.removeEventListener('load', onImageLoaded);
    };
    
    img.addEventListener('load', onImageLoaded);
    
    return originalLoadNewMeme.apply(this, arguments);
  };
  
  console.log('Функция загрузки мемов успешно расширена индикатором загрузки');
}

document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    .image-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 100;
      border-radius: 12px;
    }

    .loading-spinner {
      width: 60px;
      height: 60px;
      border: 5px solid rgba(93, 63, 211, 0.2);
      border-radius: 50%;
      border-top-color: var(--primary-color);
      animation: spin 1s ease-in-out infinite;
    }

    .loading-progress-container {
      width: 80%;
      height: 8px;
      background-color: rgba(93, 63, 211, 0.2);
      border-radius: 10px;
      margin: 15px 0;
      overflow: hidden;
    }

    .loading-progress-bar {
      height: 100%;
      background-color: var(--primary-color);
      border-radius: 10px;
      transition: width 0.3s ease;
    }

    .loading-text {
      color: #333;
      font-weight: 600;
      text-align: center;
      font-size: 0.9rem;
      margin-top: 5px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .image-loading-overlay.fade-out {
      opacity: 0;
      transition: opacity 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
  
  if (typeof window.loadNewMeme === 'function') {
    patchLoadNewMeme();
  } else {
    const checkInterval = setInterval(function() {
      if (typeof window.loadNewMeme === 'function') {
        patchLoadNewMeme();
        clearInterval(checkInterval);
      }
    }, 100);
    
    setTimeout(function() {
      clearInterval(checkInterval);
    }, 10000);
  }
});
