let currentMemeId = 1;
let isLoadingMeme = false;
let memesQueue = []; 
let likeCount = 0; 

let savingMemeIds = new Set();


document.addEventListener('DOMContentLoaded', () => {
  new Typed('#greeting-text', {
    strings: ['Ready to discover memes?', 'Swipe right if you like it!', 'Find your meme matches!'],
    typeSpeed: 50, backSpeed: 30, loop: true, loopCount: 3, smartBackspace: true, showCursor: false
  });
  new Typed('#swipe-hint-text', {
    strings: ['Swipe right to like', 'Swipe left to skip', 'Tap star to save'],
    typeSpeed: 40, backSpeed: 20, loop: true, loopCount: 3, startDelay: 1000, showCursor: false
  });

  initSwipe();
  loadNewMeme();
  
  prefetchAIMemes();
});

// fffff

const curatedMemes = [
  { id: 1, src: '/static/mems/meme2.JPG', title: 'Meme 1'},
  { id: 2, src: '/static/mems/meme3.jpg', title: 'Meme 2'},
  { id: 3, src: '/static/mems/3.jpg', title: 'Meme 3'},
  { id: 4, src: '/static/mems/IMG_5573.PNG', title: 'Meme 4'},
  { id: 5, src: '/static/mems/5577.PNG', title: 'Meme 5'},
  { id: 6, src: '/static/mems/6.jpg', title: 'Meme 6'},
  { id: 7, src: '/static/mems/7.jpg', title: 'Meme 7'},
  { id: 8, src: '/static/mems/8.jpg', title: 'Meme 8'},
  { id: 9, src: '/static/mems/9.jpg', title: 'Meme 9'},
  { id: 10, src: '/static/mems/5.jpg', title: 'Meme 10'},
];


let shownMemesCount = 0;

async function prefetchAIMemes() {
  try {
    const response = await fetch('/api/batch-generate-memes?count=3');
    if (!response.ok) {
      console.warn('Failed to prefetch AI memes');
      return;
    }
    console.log('Pre-fetched AI memes for smoother experience');
  } catch (error) {
    console.error('Error pre-fetching AI memes:', error);
  }
}


function loadNewMeme() {
  const card = document.getElementById('current-meme'),
        img = card.querySelector('.meme-image'),
        title = document.getElementById('meme-title');
    if (!img.src.includes('loading.gif')) {
    const originalSrc = img.src;
    img.setAttribute('data-original-src', originalSrc);
  }

  gsap.set(card, { x:0, y:0, rotation:0, opacity:1, boxShadow:'0 10px 20px rgba(0,0,0,.1)' });
  if (shownMemesCount < curatedMemes.length) {
    const meme = curatedMemes[shownMemesCount];
    img.src = meme.src;
    title.textContent = meme.title || '';
    card.setAttribute('data-id', String(meme.id));
    shownMemesCount++;
    animateNewCard(card);
  } else {
    fetchMemeFromAI().then(meme => {
      img.src = meme.imageUrl;
      title.textContent = meme.title || `AI Meme #${currentMemeId}`;
      const memeId = 100 + currentMemeId; 
      card.setAttribute('data-id', String(memeId));
      card.setAttribute('data-image-url', meme.imageUrl);
      currentMemeId++;
      animateNewCard(card);
    }).catch(error => {
      console.error('Error loading AI meme:', error);
      const fallbackIndex = shownMemesCount % curatedMemes.length;
      const fallbackMeme = curatedMemes[fallbackIndex];
      img.src = fallbackMeme.src;
      title.textContent = fallbackMeme.title || `Fallback Meme`;
      card.setAttribute('data-id', String(fallbackMeme.id));
      animateNewCard(card);
      toast('Could not load AI meme, showing you a curated one instead', 'warning');
    });
    shownMemesCount++;


  }
}
function animateNewCard(card) {
  gsap.fromTo(card, 
    { opacity:0, scale:0.9 }, 
    { opacity:1, scale:1, duration:0.5, ease:'elastic.out(1,.6)' }
  );
}

async function fetchMemeFromAI() {
  if (isLoadingMeme) {
    throw new Error('Already loading a meme');
  }
  isLoadingMeme = true;
  try {
    if (memesQueue.length > 0) {
      const meme = memesQueue.shift();
      if (memesQueue.length < 2) {
        prefetchAIMemes();
      }
      
      return meme;
    }
    const response = await fetch('/api/generate-meme');
    if (!response.ok) {
      throw new Error('Failed to fetch AI meme');
    }
    const data = await response.json();   
    if (data.error) {
      throw new Error(data.error);
    }
    return {
      imageUrl: data.imageUrl,
      title: data.title || `AI Meme #${currentMemeId}`
    };
  } catch (error) {
    console.error('Error fetching AI meme:', error);
    const fallbackIndex = (shownMemesCount % curatedMemes.length);
    return {
      imageUrl: curatedMemes[fallbackIndex].src,
      title: `Fallback Meme #${currentMemeId}`
    };
  } finally {
    isLoadingMeme = false;
  }
}

function initSwipe() {
  const memeCard = document.getElementById('current-meme');
  const hammerManager = new Hammer.Manager(memeCard);
  const Pan = new Hammer.Pan({
    direction: Hammer.DIRECTION_HORIZONTAL,
    threshold: 10
  });
  hammerManager.add(Pan);

  let isDragging = false;
  hammerManager.on('panstart', function(e) {
    isDragging = true;
    memeCard.classList.add('swiping');
    gsap.killTweensOf(memeCard);
  });
  hammerManager.on('panmove', function(e) {
    if (isDragging) {
      const xDelta = e.deltaX;
      const angle = xDelta * 0.05;
      gsap.set(memeCard, {
        x: xDelta,
        y: e.deltaY / 4, 
        rotation: angle,
        boxShadow: (xDelta > 50)
          ? glow(xDelta, '#4cd964')   
          : (xDelta < -50)
            ? glow(xDelta, '#ff3b30') 
            : '0 10px 20px rgba(0,0,0,0.1)'
      });
    }
  });
  
  hammerManager.on('panend', function(e) {
    isDragging = false;
    memeCard.classList.remove('swiping');
    
    const threshold = window.innerWidth / 5; 
    const xVelocity = Math.abs(e.velocityX);
    const xDelta = e.deltaX;
    if ((xVelocity > 0.5 && Math.abs(xDelta) > 50) || Math.abs(xDelta) > threshold) {
      if (xDelta > 0) {
        gsap.to(memeCard, {
          x: window.innerWidth + 100,
          y: e.deltaY,
          rotation: 30,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
          onComplete: likeMeme
        });
      }
      else {
        gsap.to(memeCard, {
          x: -window.innerWidth - 100,
          y: e.deltaY,
          rotation: -30,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
          onComplete: dislikeMeme
        });
      }
    } 
    else {
      gsap.to(memeCard, {
        x: 0,
        y: 0,
        rotation: 0,
        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
        duration: 0.5,
        ease: 'elastic.out(1,0.6)'
      });
    }
  });
  document.querySelector('.btn-like').addEventListener('click', function() {
    fling(memeCard, window.innerWidth + 200, 30, likeMeme);
  });
  document.querySelector('.btn-dislike').addEventListener('click', function() {
    fling(memeCard, -window.innerWidth - 200, -30, dislikeMeme);
  });
  document.querySelector('.btn-save').addEventListener('click', saveMeme);
}



function glow(x, color) {
  const spread = Math.min(20 + Math.abs(x) / 10, 40),
        alpha = Math.min(Math.abs(x) / 500, 0.5);
  const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
  return `0 10px ${spread}px ${color}${alphaHex}`;
}

function fling(card, x, rot, callback) {
  gsap.to(card, { 
    x, 
    rotation: rot, 
    opacity: 0, 
    duration: 0.5, 
    ease: 'power2.out', 
    onComplete: callback 
  });
}

function likeMeme() { 
  if (typeof createHeartAnimation === 'function') {
    createHeartAnimation();
  }
  
  const memeCard = document.getElementById('current-meme');
  const memeId = memeCard.getAttribute('data-id');
  const img = memeCard.querySelector('.meme-image');


  const imageUrl = memeCard.getAttribute('data-image-url') || img.src;
  const title = document.getElementById('meme-title').textContent;
  fetch('/api/memes/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      memeId: parseInt(memeId), 
      actionType: 'like',
      imageUrl: imageUrl,
      title: title
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to register like');
    }
    return response.json();
  })
  .then(data => {
    console.log('Лайк зарегистрирован:', data);
    likeCount++;
    if (likeCount === 10) {
      checkShowMatchScreen();
    }
  })
  .catch(error => {
    console.error('Ошибка при регистрации лайка:', error);
  })
  .finally(() => {
    loadNewMeme();
  });
}



function dislikeMeme() { 
  const memeCard = document.getElementById('current-meme');
  const memeId = memeCard.getAttribute('data-id');
  const img = memeCard.querySelector('.meme-image');
  const imageUrl = memeCard.getAttribute('data-image-url') || img.src;
  const title = document.getElementById('meme-title').textContent;
  fetch('/api/memes/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      memeId: parseInt(memeId), 
      actionType: 'dislike',
      imageUrl: imageUrl,
      title: title
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to register dislike');
    }
    return response.json();
  })
  .then(data => {
    console.log('Дизлайк зарегистрирован:', data);
  })
  .catch(error => {
    console.error('Ошибка при регистрации дизлайка:', error);
  })
  .finally(() => {
    loadNewMeme();
  });





}

function saveMeme() {
  const memeCard = document.getElementById('current-meme');
  const memeId = memeCard.getAttribute('data-id');
  if (savingMemeIds.has(memeId)) {
    console.log('Уже идет сохранение этого мема, игнорируем повторный запрос');
    return;
  }
  
  savingMemeIds.add(memeId);
  const saveButton = document.querySelector('.action-btn.btn-save');
  saveButton.disabled = true;
  
  const img = memeCard.querySelector('.meme-image');
  const imageUrl = memeCard.getAttribute('data-image-url') || img.src;
  const title = document.getElementById('meme-title').textContent;
  fetch('/api/favorites/' + memeId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      imageUrl: imageUrl,
      title: title
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to save meme');
    }
    return response.json();
  })
  .then(data => {
    console.log('Мем сохранен:', data);
    pulse('.action-btn.btn-save');
    toast('Мем добавлен в избранное!');
  })
  .catch(error => {
    console.error('Ошибка при сохранении мема:', error);
    toast('Не удалось сохранить мем', 'error');
  })
  .finally(() => {
    savingMemeIds.delete(memeId);
    saveButton.disabled = false;
  });
}

function checkShowMatchScreen() {
  fetchUserMatches().then(matches => {
    window.userMatches = matches;
    showMatchScreen();
  }).catch(error => {
    console.error('Ошибка при получении совпадений:', error);
    showMatchScreen();
  });
}

async function fetchUserMatches() {
  try {
    const response = await fetch('/api/get-user-matches');
    if (!response.ok) throw new Error('Failed to fetch matches');
    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error('Error fetching user matches:', error);
    return [];
  }
}

const toast = (msg, type = 'info') => {
  const bgColor = type === 'error' ? '#ff3b30' : 
                 (type === 'warning' ? '#ffcc00' : '#5d3fd3');
  const el = Object.assign(document.createElement('div'), {
    className: 'position-fixed bottom-0 start-50 translate-middle-x mb-4 p-2 px-4 rounded-pill',
    textContent: msg,
    style: `background:${bgColor};color:#fff;z-index:999;box-shadow:0 5px 15px rgba(0,0,0,.2)`
  });
  document.body.appendChild(el);
  gsap.fromTo(el, 
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out',
      onComplete: () => gsap.to(el, {
        opacity: 0, 
        y: -20, 
        delay: 1.5, 
        duration: 0.5, 
        onComplete: () => el.remove()
      })
    }
  );
};

const pulse = sel => gsap.fromTo(
  sel,
  { scale: 1 },
  { scale: 1.3, duration: 0.2, ease: 'power1.out', yoyo: true, repeat: 1 }
);

function showMatchScreen() {
  const screen = document.getElementById('match-screen');
  screen.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'match-container';
  const header = document.createElement('div');
  header.className = 'match-header';
  header.innerHTML = `
    <div class="match-title-wrapper">
      <div class="match-icon-pulse">
        <i class="fas fa-users"></i>
      </div>
      <h2 class="match-title">Your Meme Matches</h2>
    </div>
    <p class="match-subtitle">Check out people have the same taste as you!</p>
  `;
  
  const usersContainer = document.createElement('div');
  usersContainer.className = 'match-users-container';
  usersContainer.id = 'match-users-container';
  const footer = document.createElement('div');
  footer.className = 'match-footer';
  footer.innerHTML = `
    <button class="match-close-btn" onclick="hideMatchScreen()">
      <i class="fas fa-arrow-left"></i>Back To Swipes
    </button>
  `;
  
  container.appendChild(header);
  container.appendChild(usersContainer);
  container.appendChild(footer);
  screen.appendChild(container);
  
  createConfetti(screen);
  screen.style.display = 'flex';
  gsap.fromTo(screen, 
    { opacity: 0 }, 
    { opacity: 1, duration: 0.5, ease: 'power2.out' }
  );
  
  gsap.fromTo(container, 
    { scale: 0.8, opacity: 0, y: 50 }, 
    { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)', 
      onComplete: () => {
        displayUserMatches();
      } 
    }
  );
}





function createConfetti(container) {
  const confettiWrapper = document.createElement('div');
  confettiWrapper.className = 'confetti-container';
  
  const colors = ['#FFC107', '#E91E63', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800', '#03A9F4'];
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 5;
    const left = Math.random() * 100;
    
    confetti.style.backgroundColor = color;
    confetti.style.width = `${size}px`;
    confetti.style.height = `${size}px`;
    confetti.style.left = `${left}%`;
    
    const delay = Math.random() * 3;
    const duration = Math.random() * 3 + 2;
    const rotation = Math.random() * 360;
    
    if (Math.random() > 0.5) {
      confetti.style.borderRadius = '50%';
    }   
    gsap.fromTo(confetti,
      { y: -100, opacity: 1, rotation: 0 },
      { 
        y: window.innerHeight, 
        opacity: 0, 
        rotation: rotation,
        delay: delay,
        duration: duration,
        ease: 'linear'
      }
    );
    confettiWrapper.appendChild(confetti);


  }

  container.appendChild(confettiWrapper);
  setTimeout(() => {
    if (confettiWrapper.parentNode === container) {
      container.removeChild(confettiWrapper);
    }
  }, 5000);
}

function displayUserMatches() {
  const container = document.getElementById('match-users-container');
  if (!window.userMatches || window.userMatches.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-matches';
    emptyState.innerHTML = `
      <div class="empty-icon">
        <i class="fas fa-search"></i>
      </div>
      <p>We haven't people who have the similar taste as you. Continue liking memes!</p>
    `;
    container.appendChild(emptyState);
    return;



  }
  
  window.userMatches.forEach((user, index) => {
    const firstName = extractFirstName(user.name);
    const enhancedUser = {
      ...user, 
      firstName: firstName,
      avatar: generateAvatarUrl(user.id)
    };
    const card = createUserCard(enhancedUser);
    container.appendChild(card);
    gsap.fromTo(card,
      { opacity: 0, y: 30, scale: 0.9 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        duration: 0.5, 
        delay: 0.1 * index,
        ease: 'back.out(1.7)'
      }
    );
  });
}


function createUserCard(user) {
  const card = document.createElement('div');
  card.className = 'user-card';
  const matchPercent = user.similarity || Math.floor(Math.random() * 31) + 70;
  card.innerHTML = `
    <div class="user-card-inner">
      <div class="user-avatar-container">
        <img src="${user.avatar}" alt="${user.name}" class="user-avatar">
        <div class="user-similarity">${matchPercent}%</div>
      </div>
      <div class="user-info">
        <h3 class="user-name">${user.name}</h3>
        <div class="user-match-info">
          <i class="fas fa-thumbs-up"></i> Similarity Score: ${matchPercent}%
        </div>
        <button class="add-friend-btn">
          <i class="fas fa-user-plus"></i> Become Friends!
        </button>
      </div>
    </div>
  `;
  card.addEventListener('mouseenter', () => {
    gsap.to(card, {
      scale: 1.03,
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      duration: 0.3
    });
    const addButton = card.querySelector('.add-friend-btn');
    gsap.to(addButton, {
      backgroundColor: '#5d3fd3',
      color: '#ffffff',
      duration: 0.3
    });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(card, {
      scale: 1,
      boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
      duration: 0.3
    });
    const addButton = card.querySelector('.add-friend-btn');
    gsap.to(addButton, {
      backgroundColor: '#f0f0f0',
      color: '#5d3fd3',
      duration: 0.3
    });
  });
  const addButton = card.querySelector('.add-friend-btn');
  addButton.addEventListener('click', function() {
    gsap.to(this, {
      scale: 1.2,
      duration: 0.1,
      onComplete: () => {
        gsap.to(this, {
          scale: 1,
          duration: 0.2,
          ease: 'back.out(2)'
        });
        this.innerHTML = '<i class="fas fa-check"></i> Request Sent';
        gsap.to(this, {
          backgroundColor: '#4CAF50',
          color: '#ffffff',
          duration: 0.3
        });
        
        this.disabled = true;
      }
    });
  });
  return card;
}

function hideMatchScreen() {
  const screen = document.getElementById('match-screen');
  const container = screen.querySelector('.match-container');
  gsap.to(container, {
    scale: 0.9,
    opacity: 0,
    duration: 0.4,
    ease: 'power2.in'
  });
  gsap.to(screen, {
    opacity: 0,
    duration: 0.5,
    delay: 0.2,
    onComplete: () => {
      screen.style.display = 'none';
    }
  });
}

function extractFirstName(username) {
  if (username.includes(' ')) {
    return username.split(' ')[0];
  }
  const separators = ['.', '_', '-'];
  for (const sep of separators) {
    if (username.includes(sep)) {
      return username.split(sep)[0];
    }
  }
  return username;
}

function generateAvatarUrl(userId) {
  const avatarTypes = ['identicon', 'monsterid', 'wavatar', 'retro', 'robohash'];
  const type = avatarTypes[userId % avatarTypes.length];
  return `https://secure.gravatar.com/avatar/${userId}?s=150&d=${type}&r=g`;
}
