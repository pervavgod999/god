document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const uploadForm = document.getElementById('uploadForm');
  const slipImage = document.getElementById('slipImage');
  const dropArea = document.getElementById('dropArea');
  const previewContainer = document.getElementById('previewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const removeImage = document.getElementById('removeImage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultContainer = document.getElementById('resultContainer');
  const noResultMessage = document.getElementById('noResultMessage');
  const errorContainer = document.getElementById('errorContainer');
  const errorMessage = document.getElementById('errorMessage');
  
  // Result Elements
  const validationBadge = document.getElementById('validationBadge');
  const resultTitle = document.getElementById('resultTitle');
  const bankResult = document.getElementById('bankResult');
  const amountResult = document.getElementById('amountResult');
  const dateResult = document.getElementById('dateResult');
  const accountResult = document.getElementById('accountResult');
  const qrResult = document.getElementById('qrResult');
  const promptpayResult = document.getElementById('promptpayResult');
  const hasAccountResult = document.getElementById('hasAccountResult');
  const timestampResult = document.getElementById('timestampResult');
  const ocrResult = document.getElementById('ocrResult');
  
  // Metadata Elements
  const fileSizeResult = document.getElementById('fileSizeResult');
  const dimensionsResult = document.getElementById('dimensionsResult');
  const formatResult = document.getElementById('formatResult');
  const creationTimeResult = document.getElementById('creationTimeResult');
  const exifResult = document.getElementById('exifResult');
  const isEditedResult = document.getElementById('isEditedResult');
  const trustScoreResult = document.getElementById('trustScoreResult');
  const trustScoreBar = document.getElementById('trustScoreBar');
  
  // เพิ่มอนิเมชั่นให้กับองค์ประกอบเมื่อโหลดหน้าเว็บ
  animateElements();
  
  // File Upload Preview
  slipImage.addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      
      // Check file type
      if (!file.type.match('image.*')) {
        showError('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น');
        resetForm();
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showError('ขนาดไฟล์ต้องไม่เกิน 10MB');
        resetForm();
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = function(e) {
        imagePreview.src = e.target.result;
        previewContainer.classList.remove('d-none');
        previewContainer.classList.add('fade-in');
        hideError();
      };
      
      reader.readAsDataURL(file);
    }
  });
  
  // Remove Image with Animation
  removeImage.addEventListener('click', function() {
    previewContainer.classList.add('fade-out');
    setTimeout(() => {
      resetForm();
      previewContainer.classList.remove('fade-out');
    }, 300);
  });
  
  // Drag and Drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    dropArea.classList.add('dragover');
    // เพิ่มอนิเมชั่นเมื่อลากไฟล์มาวาง
    dropArea.querySelector('i').classList.add('pulse-animation');
  }
  
  function unhighlight() {
    dropArea.classList.remove('dragover');
    // ลบอนิเมชั่นเมื่อลากไฟล์ออกไป
    dropArea.querySelector('i').classList.remove('pulse-animation');
  }
  
  dropArea.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files && files.length) {
      slipImage.files = files;
      const event = new Event('change');
      slipImage.dispatchEvent(event);
      
      // เพิ่มอนิเมชั่นเมื่อวางไฟล์
      dropArea.classList.add('success-drop');
      setTimeout(() => {
        dropArea.classList.remove('success-drop');
      }, 1000);
    }
  }
  
  // Form Submission with Animation
  uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!slipImage.files || !slipImage.files[0]) {
      showError('กรุณาเลือกไฟล์รูปภาพก่อน');
      // เพิ่มอนิเมชั่นเมื่อเกิดข้อผิดพลาด
      dropArea.classList.add('error-shake');
      setTimeout(() => {
        dropArea.classList.remove('error-shake');
      }, 500);
      return;
    }
    
    // Show loading with animation
    uploadForm.classList.add('fade-out');
    setTimeout(() => {
      uploadForm.classList.add('d-none');
      loadingIndicator.classList.remove('d-none');
      loadingIndicator.classList.add('fade-in');
    }, 300);
    
    resultContainer.classList.add('d-none');
    noResultMessage.classList.add('d-none');
    hideError();
    
    const formData = new FormData();
    formData.append('slipImage', slipImage.files[0]);
    
    try {
      const response = await fetch('/verify', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป');
      }
      
      const result = await response.json();
      
      // Hide loading with animation
      loadingIndicator.classList.add('fade-out');
      setTimeout(() => {
        loadingIndicator.classList.add('d-none');
        loadingIndicator.classList.remove('fade-out');
        displayResult(result);
        uploadForm.classList.remove('d-none');
        uploadForm.classList.remove('fade-out');
      }, 300);
      
    } catch (error) {
      console.error('Error:', error);
      
      // Hide loading with animation
      loadingIndicator.classList.add('fade-out');
      setTimeout(() => {
        loadingIndicator.classList.add('d-none');
        loadingIndicator.classList.remove('fade-out');
        showError(error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป');
        uploadForm.classList.remove('d-none');
        uploadForm.classList.remove('fade-out');
      }, 300);
    }
  });
  
  // Display Result with Animation
  function displayResult(data) {
    // Show result container with animation
    resultContainer.classList.remove('d-none');
    resultContainer.classList.add('fade-in');
    noResultMessage.classList.add('d-none');
    
    // Set validation badge with animation
    if (data.isValid) {
      validationBadge.textContent = 'สลิปจริง';
      validationBadge.className = 'badge fs-5 py-2 px-3 mb-2 badge-valid';
      resultTitle.textContent = 'ตรวจสอบสลิปสำเร็จ';
      resultTitle.classList.add('text-success');
      
      // เพิ่มอนิเมชั่นเมื่อสลิปจริง
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      validationBadge.textContent = 'สลิปปลอม';
      validationBadge.className = 'badge fs-5 py-2 px-3 mb-2 badge-invalid';
      resultTitle.textContent = 'พบความผิดปกติในสลิป';
      resultTitle.classList.add('text-danger');
    }
    
    // Fill in details with animation
    bankResult.textContent = data.bank;
    amountResult.textContent = data.amount;
    dateResult.textContent = data.date;
    accountResult.textContent = data.accountNumber;
    qrResult.innerHTML = data.hasQR ? '<span class="text-success">✓ มี</span>' : '<span class="text-danger">✗ ไม่มี</span>';
    promptpayResult.innerHTML = data.hasPromptPay ? '<span class="text-success">✓ มี</span>' : '<span class="text-danger">✗ ไม่มี</span>';
    hasAccountResult.innerHTML = data.hasAccount ? '<span class="text-success">✓ มี</span>' : '<span class="text-danger">✗ ไม่มี</span>';
    timestampResult.textContent = data.timestamp;
    
    // OCR Result
    if (data.ocrText) {
      ocrResult.textContent = data.ocrText;
    } else {
      ocrResult.textContent = 'ไม่มีข้อมูล OCR';
    }
    
    // แสดงข้อมูล Metadata
    if (data.metadata) {
      displayMetadata(data.metadata);
    }
    
    // Remove animation class after animation completes
    setTimeout(() => {
      resultContainer.classList.remove('fade-in');
    }, 500);
  }
  
  // แสดงข้อมูล Metadata
  function displayMetadata(metadata) {
    // ข้อมูลไฟล์
    fileSizeResult.textContent = metadata.fileSize;
    dimensionsResult.textContent = metadata.dimensions;
    formatResult.textContent = metadata.format;
    creationTimeResult.textContent = metadata.creationTime;
    
    // ข้อมูลการวิเคราะห์
    exifResult.innerHTML = metadata.exif ? 
      '<span class="text-success">✓ มี</span>' : 
      '<span class="text-danger">✗ ไม่มี</span>';
    
    isEditedResult.innerHTML = metadata.isEdited ? 
      '<span class="text-danger">✓ มีการแก้ไข</span>' : 
      '<span class="text-success">✗ ไม่มีการแก้ไข</span>';
    
    // คะแนนความน่าเชื่อถือ
    const trustScore = metadata.trustScore;
    let trustScoreClass = 'bg-success';
    let trustScoreText = 'สูง';
    
    if (trustScore < 50) {
      trustScoreClass = 'bg-danger';
      trustScoreText = 'ต่ำ';
    } else if (trustScore < 80) {
      trustScoreClass = 'bg-warning';
      trustScoreText = 'ปานกลาง';
    }
    
    trustScoreResult.innerHTML = `<span class="${trustScoreClass} badge">${trustScore}/100 (${trustScoreText})</span>`;
    
    // อัพเดท Progress Bar
    trustScoreBar.style.width = `${trustScore}%`;
    trustScoreBar.setAttribute('aria-valuenow', trustScore);
    trustScoreBar.textContent = `${trustScore}%`;
    trustScoreBar.className = `progress-bar progress-bar-striped progress-bar-animated ${trustScoreClass}`;
    
    // เพิ่มอนิเมชั่นให้กับ Progress Bar
    setTimeout(() => {
      trustScoreBar.style.transition = 'width 1.5s ease-in-out';
      trustScoreBar.style.width = `${trustScore}%`;
    }, 100);
  }
  
  // Helper Functions
  function resetForm() {
    slipImage.value = '';
    imagePreview.src = '#';
    previewContainer.classList.add('d-none');
  }
  
  function showError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('d-none');
    errorContainer.classList.add('fade-in');
    
    // เพิ่มอนิเมชั่นเมื่อแสดงข้อผิดพลาด
    setTimeout(() => {
      errorContainer.classList.add('shake-animation');
      setTimeout(() => {
        errorContainer.classList.remove('shake-animation');
      }, 500);
    }, 100);
  }
  
  function hideError() {
    errorContainer.classList.add('fade-out');
    setTimeout(() => {
      errorContainer.classList.add('d-none');
      errorContainer.classList.remove('fade-out');
    }, 300);
  }
  
  // เพิ่มอนิเมชั่นให้กับองค์ประกอบเมื่อโหลดหน้าเว็บ
  function animateElements() {
    // เพิ่มคลาสอนิเมชั่นให้กับองค์ประกอบต่างๆ
    document.querySelector('header').classList.add('fade-in');
    document.querySelectorAll('.card').forEach((card, index) => {
      card.style.animationDelay = `${index * 0.2}s`;
      card.classList.add('fade-in');
    });
    
    // เพิ่มอนิเมชั่นให้กับปุ่ม
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('mouseenter', function() {
        this.classList.add('pulse-hover');
      });
      btn.addEventListener('mouseleave', function() {
        this.classList.remove('pulse-hover');
      });
    });
  }
  
  // เพิ่ม Confetti Effect
  function confetti(options) {
    const defaults = {
      particleCount: 50,
      angle: 90,
      spread: 45,
      startVelocity: 45,
      decay: 0.9,
      gravity: 1,
      drift: 0,
      ticks: 200,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      shapes: ['circle', 'square'],
      scalar: 1,
      zIndex: 100,
      disableForReducedMotion: false
    };
    
    const mergedOptions = { ...defaults, ...options };
    
    const count = mergedOptions.particleCount;
    const origin = mergedOptions.origin;
    
    const particles = [];
    
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(origin, mergedOptions));
    }
    
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = 0;
    container.style.left = 0;
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = mergedOptions.zIndex;
    
    document.body.appendChild(container);
    
    particles.forEach(particle => {
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.width = `${particle.size}px`;
      element.style.height = `${particle.size}px`;
      element.style.background = particle.color;
      element.style.borderRadius = particle.shape === 'circle' ? '50%' : '0';
      element.style.top = `${particle.y}px`;
      element.style.left = `${particle.x}px`;
      element.style.transform = 'translate(-50%, -50%)';
      
      container.appendChild(element);
      
      const animation = element.animate(
        [
          {
            transform: `translate(-50%, -50%) translate(${particle.x}px, ${particle.y}px) rotate(0deg)`,
            opacity: 1
          },
          {
            transform: `translate(-50%, -50%) translate(${particle.x + particle.vx}px, ${particle.y + particle.vy}px) rotate(${particle.rotation}deg)`,
            opacity: 0
          }
        ],
        {
          duration: mergedOptions.ticks * 10,
          easing: 'cubic-bezier(0, .9, .57, 1)',
          fill: 'forwards'
        }
      );
      
      animation.onfinish = () => {
        element.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      };
    });
  }
  
  function createParticle(origin, options) {
    const angle = options.angle * (Math.PI / 180);
    const spread = options.spread * (Math.PI / 180);
    const startVelocity = options.startVelocity;
    
    const radAngle = angle + (Math.random() - 0.5) * spread;
    const vx = Math.cos(radAngle) * startVelocity;
    const vy = Math.sin(radAngle) * startVelocity;
    
    return {
      x: origin.x * window.innerWidth,
      y: origin.y * window.innerHeight,
      vx: vx * options.scalar,
      vy: vy * options.scalar,
      color: options.colors[Math.floor(Math.random() * options.colors.length)],
      shape: options.shapes[Math.floor(Math.random() * options.shapes.length)],
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360
    };
  }
}); 