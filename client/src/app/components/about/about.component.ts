import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <div class="page-container container animate-fade-in-up">
      <div class="about-card glass-card">
        <div class="card-header text-center">
          <div class="icon-wrap mx-auto">
            <span class="emoji-icon">🎓</span>
          </div>
          <h1>Smart City <span class="gradient-text">Road Intelligence</span></h1>
          <p class="subtitle">AI-Powered Pothole Detection Platform • v1.0.0</p>
        </div>

        <div class="content-section">
          <h2>About The Project</h2>
          <p>
            Road deterioration and potholes present significant ongoing challenges for 
            municipal maintenance teams and everyday drivers. This project aims to 
            automate the detection of road surface damage using state-of-the-art 
            Deep Learning computer vision techniques.
          </p>
          <p>
            By uploading images or dashcam stills, this AI-powered web application instantly 
            identifies and highlights potholes. It evaluates local severity density, granting 
            immediate insight into the potential hazard level of the captured road section.
          </p>
        </div>

        <div class="stack-section">
          <h2>Technology Stack</h2>
          <div class="stack-grid">
            <div class="tech-item">
              <div class="tech-icon-container">
                <div class="tech-icon"><img src="https://upload.wikimedia.org/wikipedia/commons/c/cf/Angular_full_color_logo.svg" alt="Angular"></div>
              </div>
              <h3>Angular 17</h3>
              <p>Frontend SPA framework delivering a smooth, seamless user experience without page reloads.</p>
            </div>
            
            <div class="tech-item">
              <div class="tech-icon-container">
                <div class="tech-icon"><img src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg" alt="Node.js"></div>
              </div>
              <h3>Node & Express</h3>
              <p>Fast, event-driven backend API handling image ingestion, MongoDB querying, and service routing.</p>
            </div>

            <div class="tech-item">
              <div class="tech-icon-container">
                <div class="tech-icon"><img src="https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg" alt="Python"></div>
              </div>
              <h3>Python & Flask</h3>
              <p>Specialized microservice running the heavy YOLOv8 deep learning model inferences.</p>
            </div>

            <div class="tech-item">
              <div class="tech-icon-container">
                <div class="tech-icon"><img src="https://upload.wikimedia.org/wikipedia/commons/9/93/MongoDB_Logo.svg" alt="MongoDB"></div>
              </div>
              <h3>MongoDB</h3>
              <p>NoSQL document store preserving detection history natively, coordinates, and bounding boxes.</p>
            </div>
          </div>
        </div>

        <div class="model-section">
          <h2>YOLOv8 Architecture</h2>
          <p>
            This system utilizes <strong>ultralytics YOLOv8</strong> (You Only Look Once), 
            a cutting-edge, state-of-the-art model built on deep convolutional neural networks. 
            YOLOv8 processes the entire image in a single pass, making it incredibly fast 
            and ideal for scalable detection API implementation.
          </p>
          <div class="model-badges">
            <span class="badge">Object Detection</span>
            <span class="badge">Computer Vision</span>
            <span class="badge">PyTorch Backend</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .about-card {
      max-width: 900px;
      margin: 0 auto;
      padding: 48px;
    }

    .card-header {
      margin-bottom: 48px;
      padding-bottom: 32px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .text-center { text-align: center; }
    .mx-auto { margin: 0 auto; }

    .icon-wrap {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }

    .emoji-icon {
      font-size: 2.5rem;
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 2.5rem;
      font-weight: 600;
      letter-spacing: -1px;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .gradient-text {
      background: linear-gradient(135deg, var(--primary), var(--forecast));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: inline-block;
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
      font-weight: 400;
    }

    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 18px;
      color: var(--text-primary);
      letter-spacing: -0.3px;
    }

    .content-section {
      margin-bottom: 48px;
    }

    .content-section p {
      font-size: 1.05rem;
      line-height: 1.7;
      color: var(--text-primary);
      margin-bottom: 16px;
    }

    .stack-section {
      margin-bottom: 48px;
    }

    .stack-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .tech-item {
      background: rgba(255, 255, 255, 0.45);
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      border-radius: var(--radius-lg);
      padding: 24px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: var(--transition);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .tech-item:hover {
      transform: translateY(-4px);
      background: rgba(255, 255, 255, 0.85);
      border-color: var(--primary);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
    }

    .tech-icon-container {
      height: 48px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
    }

    .tech-icon {
      height: 36px;
      display: flex;
      align-items: center;
    }

    .tech-icon img {
      max-height: 100%;
      max-width: 120px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.05));
    }

    .tech-item h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .tech-item p {
      color: var(--text-secondary);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .model-section {
      background: rgba(191, 90, 242, 0.05);
      border: 0.5px solid rgba(191, 90, 242, 0.15);
      padding: 32px;
      border-radius: var(--radius-lg);
    }

    .model-section h2 {
      color: var(--forecast);
    }

    .model-section p {
      line-height: 1.6;
      color: var(--text-primary);
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .model-section strong {
      color: var(--forecast);
      font-weight: 600;
    }

    .model-badges {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .badge {
      padding: 6px 14px;
      background: rgba(191, 90, 242, 0.08);
      border: 0.5px solid rgba(191, 90, 242, 0.20);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      color: var(--forecast);
    }

    @media (max-width: 768px) {
      .about-card { padding: 24px; }
      .stack-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AboutComponent { }

