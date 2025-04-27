function createHeartAnimation() {
  const memeContainer = document.querySelector('.meme-container');
  
  let heartsContainer = document.querySelector('.hearts-container');
  if (!heartsContainer) {
    heartsContainer = document.createElement('div');
    heartsContainer.className = 'hearts-container';
    memeContainer.appendChild(heartsContainer);
  }
  
  const heartsCount = 5 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < heartsCount; i++) {
    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.innerHTML = '<i class="fas fa-heart"></i>';
    
    const startX = 45 + Math.random() * 10;
    const startY = 45 + Math.random() * 10;
    const size = 20 + Math.random() * 30;
    const hue = 345 + Math.random() * 30;
    const saturation = 80 + Math.random() * 20;
    const lightness = 50 + Math.random() * 20;
    
    heart.style.left = `${startX}%`;
    heart.style.top = `${startY}%`;
    heart.style.fontSize = `${size}px`;
    heart.style.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    heart.style.opacity = '0';
    heart.style.transform = 'scale(0.3)';
    
    heartsContainer.appendChild(heart);
    
    const duration = 0.6 + Math.random() * 0.3;
    const delay = Math.random() * 0.15;
    const endX = startX + (Math.random() * 40 - 20);
    const endY = startY - 30 - Math.random() * 30;
    const endRotation = Math.random() * 30 - 15;
    
    gsap.timeline()
      .to(heart, {
        opacity: 1,
        scale: 1,
        duration: 0.15,
        delay: delay,
        ease: 'back.out(1.7)'
      })
      .to(heart, {
        x: `${endX - startX}%`,
        y: `${endY - startY}%`,
        rotation: endRotation,
        opacity: 0,
        scale: 0.5,
        duration: duration,
        ease: 'power1.out',
        onComplete: () => {
          if (heart.parentNode === heartsContainer) {
            heartsContainer.removeChild(heart);
          }
        }
      }, '-=0.1');
  }
  
  const bigHeart = document.createElement('div');
  bigHeart.className = 'big-heart';
  bigHeart.innerHTML = '<i class="fas fa-heart"></i>';
  heartsContainer.appendChild(bigHeart);
  
  gsap.timeline()
    .fromTo(bigHeart, 
      { opacity: 0, scale: 0.5 }, 
      { opacity: 1, scale: 1.8, duration: 0.2, ease: 'back.out(1.7)' }
    )
    .to(bigHeart, { 
      opacity: 0, 
      scale: 2.2, 
      duration: 0.25,
      delay: 0.05,
      ease: 'power2.out',
      onComplete: () => {
        if (bigHeart.parentNode === heartsContainer) {
          heartsContainer.removeChild(bigHeart);
        }
      }
    });
}




function initButtonAnimations() {
  const actionButtons = document.querySelectorAll('.action-btn');
  actionButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const isLikeButton = this.classList.contains('btn-like');
      const isDislikeButton = this.classList.contains('btn-dislike');
      const isSaveButton = this.classList.contains('btn-save');
      const timeline = gsap.timeline();
      
      timeline.to(this, {
        scale: 1.3,
        duration: 0.1,
        ease: 'back.out(2)',
        backgroundColor: isLikeButton ? 'rgba(255, 90, 95, 0.9)' : 
                         isDislikeButton ? 'rgba(26, 171, 152, 0.9)' : 
                         'rgba(255, 193, 7, 0.9)'
      });
      
      timeline.to(this, {
        scale: 1,
        duration: 0.08,
        ease: 'power1.out',
        backgroundColor: '',
        onComplete: () => {
          if (isLikeButton) {
            createHeartAnimation();
            
            setTimeout(() => {
              fling(document.getElementById('current-meme'), window.innerWidth + 200, 30, likeMeme);
            }, 50);
          } else if (isDislikeButton) {
            fling(document.getElementById('current-meme'), -window.innerWidth - 200, -30, dislikeMeme);
          } else if (isSaveButton) {
            saveMeme();
          }
        }
      });
      
      return false;
    });
    button.addEventListener('mouseenter', function() {
      gsap.to(this, {
        scale: 1.1,
        duration: 0.15,
        ease: 'power1.out',
        boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
      });
    });
    button.addEventListener('mouseleave', function() {
      gsap.to(this, {
        scale: 1,
        duration: 0.15,
        ease: 'power1.out',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      });
    });
  });
  document.querySelector('.btn-like').onclick = null;
  document.querySelector('.btn-dislike').onclick = null;
  document.querySelector('.btn-save').onclick = null;
}

function fling(card, x, rot, callback) {
  gsap.to(card, { 
    x, 
    rotation: rot, 
    opacity: 0, 
    duration: 0.3, 
    ease: 'power2.out', 
    onComplete: callback 
  });
}

function animateNewCard(card) {
  gsap.fromTo(card, 
    { opacity: 0, scale: 0.9 }, 
    { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.5)' }
  );
}



function enhancedPanEnd(e, memeCard, likeIndicator, dislikeIndicator) {
  const isDragging = false;
  memeCard.classList.remove('swiping');
  const threshold = window.innerWidth / 6;
  const xVelocity = Math.abs(e.velocityX);
  const xDelta = e.deltaX;
  gsap.to([likeIndicator, dislikeIndicator], {
    opacity: 0,
    scale: 0.5,
    duration: 0.2
  });
  if ((xVelocity > 0.4 && Math.abs(xDelta) > 40) || Math.abs(xDelta) > threshold) {
    if (xDelta > 0) {
      gsap.to(memeCard, {
        x: window.innerWidth + 100,
        y: e.deltaY,
        rotation: 30,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          createHeartAnimation();
          
          setTimeout(likeMeme, 100);
        }
      });
    }
    else {
      gsap.to(memeCard, {
        x: -window.innerWidth - 100,
        y: e.deltaY,
        rotation: -30,
        opacity: 0,
        duration: 0.3,
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
      duration: 0.3,
      ease: 'back.out(1.5)'
    });
  }
}

function prefetchMoreMemes() {
  try {
    fetch('/api/batch-generate-memes?count=5')
      .then(response => {
        if (!response.ok) {
          console.warn('Failed to prefetch more AI memes');
          return;
        }
        console.log('Pre-fetched 5 AI memes for smoother experience');
      });
  } catch (error) {
    console.error('Error pre-fetching AI memes:', error);
  }
}