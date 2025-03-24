/**
 * Snowfall Effect for Dark Theme
 * เอฟเฟกต์หิมะตกสำหรับธีมมืด
 */
class Snowfall {
  constructor(options = {}) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // ตั้งค่าเริ่มต้น
    this.options = {
      color: options.color || 'rgba(255, 255, 255, 0.8)',
      count: options.count || 100,
      speed: options.speed || 1,
      opacity: options.opacity || 0.8,
      radius: options.radius || 2,
      wind: options.wind || 0
    };
    
    // สร้างเลเยอร์ canvas
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '-1';
    
    // เพิ่ม canvas เข้าไปใน DOM
    document.body.appendChild(this.canvas);
    
    // สร้างเกล็ดหิมะ
    this.snowflakes = [];
    this.resize();
    this.createSnowflakes();
    
    // เริ่มอนิเมชัน
    this.animate = this.animate.bind(this);
    this.animate();
    
    // จัดการเมื่อขนาดหน้าจอเปลี่ยน
    window.addEventListener('resize', () => this.resize());
  }
  
  // ปรับขนาด canvas ให้เต็มหน้าจอ
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }
  
  // สร้างเกล็ดหิมะ
  createSnowflakes() {
    this.snowflakes = [];
    
    for (let i = 0; i < this.options.count; i++) {
      this.snowflakes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * this.options.radius + 1,
        density: Math.random() * this.options.count,
        speed: Math.random() * this.options.speed + 0.5,
        opacity: Math.random() * this.options.opacity + 0.3
      });
    }
  }
  
  // วาดเกล็ดหิมะ
  drawSnowflakes() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = this.options.color;
    this.ctx.beginPath();
    
    for (let i = 0; i < this.snowflakes.length; i++) {
      const snowflake = this.snowflakes[i];
      
      this.ctx.globalAlpha = snowflake.opacity;
      this.ctx.moveTo(snowflake.x, snowflake.y);
      this.ctx.arc(snowflake.x, snowflake.y, snowflake.radius, 0, Math.PI * 2, true);
    }
    
    this.ctx.fill();
  }
  
  // เคลื่อนที่เกล็ดหิมะ
  moveSnowflakes() {
    for (let i = 0; i < this.snowflakes.length; i++) {
      const snowflake = this.snowflakes[i];
      
      // เคลื่อนที่ลงด้านล่าง
      snowflake.y += snowflake.speed;
      
      // เพิ่มการเคลื่อนที่แบบสุ่มในแนวนอน (ลม)
      snowflake.x += Math.sin(snowflake.density) * this.options.wind;
      
      // ถ้าเกล็ดหิมะตกลงด้านล่างของหน้าจอ ให้ย้ายกลับไปด้านบน
      if (snowflake.y > this.height) {
        this.snowflakes[i] = {
          x: Math.random() * this.width,
          y: 0,
          radius: snowflake.radius,
          density: snowflake.density,
          speed: snowflake.speed,
          opacity: snowflake.opacity
        };
      }
    }
  }
  
  // อนิเมชันหลัก
  animate() {
    this.drawSnowflakes();
    this.moveSnowflakes();
    requestAnimationFrame(this.animate);
  }
}

// เริ่มเอฟเฟกต์หิมะตกเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
  new Snowfall({
    color: 'rgba(255, 255, 255, 0.5)',
    count: 150,
    speed: 0.8,
    wind: 0.5
  });
}); 