import type { MachineAction } from '../types';

export interface AutomationState {
  currentStep: number;
  totalSteps: number;
  isRunning: boolean;
  currentMessage?: string;
}

export type AutomationCallback = (state: AutomationState) => void;

class UIAutomationEngine {
  private isRunning = false;
  private currentElement: HTMLElement | null = null;
  private highlightOverlay: HTMLDivElement | null = null;
  private tooltipElement: HTMLDivElement | null = null;
  private pointerElement: HTMLDivElement | null = null;
  private animationFrameId: number | null = null;

  async executeActions(
    actions: MachineAction[],
    onProgress?: AutomationCallback
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('Automation already running');
    }

    this.isRunning = true;
    this.createOverlayElements();

    try {
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];

        if (onProgress) {
          onProgress({
            currentStep: i + 1,
            totalSteps: actions.length,
            isRunning: true,
            currentMessage: action.message,
          });
        }

        await this.executeAction(action);
      }
    } finally {
      this.cleanup();
      this.isRunning = false;

      if (onProgress) {
        onProgress({
          currentStep: actions.length,
          totalSteps: actions.length,
          isRunning: false,
        });
      }
    }
  }

  private async executeAction(action: MachineAction): Promise<void> {
    // Retry logic for finding elements
    let element: HTMLElement | null = null;
    const maxRetries = 3;
    const retryDelay = 500;

    if (action.action !== 'wait') {
      for (let i = 0; i < maxRetries; i++) {
        element = document.querySelector(action.selector) as HTMLElement;
        if (element) break;
        if (i < maxRetries - 1) {
          console.log(`Retry ${i + 1}/${maxRetries} for selector: ${action.selector}`);
          await this.delay(retryDelay);
        }
      }

      if (!element) {
        console.warn(`Element not found after ${maxRetries} retries: ${action.selector}`);
        await this.delay(action.delay || 1000);
        return;
      }
    }

    switch (action.action) {
      case 'move':
        await this.moveToElement(element!, action.message);
        break;

      case 'click':
        await this.clickElement(element!, action.message);
        break;

      case 'input':
      case 'type':
        await this.inputText(element!, action.value || '', action.message);
        break;

      case 'wait':
        await this.waitForElement(action.selector, action.delay || 2000);
        break;

      case 'open':
        // Open action can be used to navigate or trigger modals
        if (action.selector.startsWith('http')) {
          window.open(action.selector, '_blank');
        } else {
          window.location.hash = action.selector;
        }
        break;

      case 'scroll':
        if (element!) {
          await this.scrollToElement(element!, action.message);
        }
        break;

      case 'tooltip':
        if (element!) {
          await this.showTooltipAt(element!, action.message || 'See this element');
        }
        break;
    }

    await this.delay(action.delay || 1000);
  }

  private async showTooltipAt(
    element: HTMLElement,
    message: string
  ): Promise<void> {
    await this.animatePointerTo(element);
    this.highlightElement(element);
    this.showTooltip(element, message);
    await this.delay(2000); // Show tooltip for 2 seconds
  }

  private async scrollToElement(
    element: HTMLElement,
    message?: string
  ): Promise<void> {
    this.showTooltip(element, message || 'Scrolling to element');

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

    await this.delay(800);
  }

  private async moveToElement(
    element: HTMLElement,
    message?: string
  ): Promise<void> {
    this.currentElement = element;

    // Smooth scroll into view first
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

    await this.delay(400); // Wait for scroll

    // Animate pointer to element
    await this.animatePointerTo(element);

    this.highlightElement(element);
    this.showTooltip(element, message || 'Moving to element');

    await this.delay(600);
  }

  private async clickElement(
    element: HTMLElement,
    message?: string
  ): Promise<void> {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

    await this.delay(400);

    // Animate pointer to element
    await this.animatePointerTo(element);

    this.highlightElement(element);
    this.showTooltip(element, message || 'Clicking element');

    await this.delay(400);

    // Trigger click with visual feedback
    await this.animateClick(element);

    element.click();
  }

  private async inputText(
    element: HTMLElement,
    value: string,
    message?: string
  ): Promise<void> {
    this.highlightElement(element);
    this.showTooltip(element, message || 'Entering text');

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

    await this.delay(500);

    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.focus();
      element.value = '';

      // Type character by character for visual effect
      for (const char of value) {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        await this.delay(50);
      }

      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  private async waitForElement(
    selector: string,
    timeout: number
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return;
      }
      await this.delay(100);
    }

    console.warn(`Element not found within timeout: ${selector}`);
  }

  private highlightElement(element: HTMLElement): void {
    if (!this.highlightOverlay) return;

    const rect = element.getBoundingClientRect();

    this.highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
    this.highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
    this.highlightOverlay.style.width = `${rect.width}px`;
    this.highlightOverlay.style.height = `${rect.height}px`;
    this.highlightOverlay.style.display = 'block';
  }

  private showTooltip(element: HTMLElement, message: string): void {
    if (!this.tooltipElement) return;

    const rect = element.getBoundingClientRect();

    this.tooltipElement.textContent = message;
    this.tooltipElement.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
    this.tooltipElement.style.top = `${rect.top - 40 + window.scrollY}px`;
    this.tooltipElement.style.display = 'block';
  }

  private async animatePointerTo(element: HTMLElement): Promise<void> {
    if (!this.pointerElement) return;

    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2 + window.scrollX;
    const targetY = rect.top + rect.height / 2 + window.scrollY;

    // Get current position
    const currentX = parseFloat(this.pointerElement.style.left) || 0;
    const currentY = parseFloat(this.pointerElement.style.top) || 0;

    // Animate using requestAnimationFrame for smooth motion
    const duration = 600; // ms
    const startTime = performance.now();

    return new Promise((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-in-out)
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const x = currentX + (targetX - currentX) * eased;
        const y = currentY + (targetY - currentY) * eased;

        this.pointerElement!.style.left = `${x}px`;
        this.pointerElement!.style.top = `${y}px`;
        this.pointerElement!.style.display = 'block';

        if (progress < 1) {
          this.animationFrameId = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      this.animationFrameId = requestAnimationFrame(animate);
    });
  }

  private async animateClick(element: HTMLElement): Promise<void> {
    if (!this.pointerElement) return;

    // Add click ripple effect
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.4);
      pointer-events: none;
      z-index: 10002;
      transform: translate(-50%, -50%) scale(0);
      animation: clickRipple 0.6s ease-out;
      left: ${this.pointerElement.style.left};
      top: ${this.pointerElement.style.top};
    `;

    // Add keyframe animation
    if (!document.getElementById('click-ripple-keyframes')) {
      const style = document.createElement('style');
      style.id = 'click-ripple-keyframes';
      style.textContent = `
        @keyframes clickRipple {
          to {
            transform: translate(-50%, -50%) scale(3);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(ripple);

    // Scale down pointer slightly
    this.pointerElement.style.transform = 'translate(-50%, -50%) scale(0.85)';
    await this.delay(100);
    this.pointerElement.style.transform = 'translate(-50%, -50%) scale(1)';

    // Remove ripple after animation
    setTimeout(() => ripple.remove(), 600);
  }

  private createOverlayElements(): void {
    // Create synthetic mouse pointer
    this.pointerElement = document.createElement('div');
    this.pointerElement.style.cssText = `
      position: absolute;
      width: 24px;
      height: 24px;
      pointer-events: none;
      z-index: 10003;
      display: none;
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease;
    `;
    this.pointerElement.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="#3B82F6" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="2" fill="white" opacity="0.8"/>
      </svg>
    `;
    document.body.appendChild(this.pointerElement);

    // Create highlight overlay
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 3px solid #3b82f6;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.1);
      z-index: 10000;
      transition: all 0.3s ease;
      display: none;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
    `;
    document.body.appendChild(this.highlightOverlay);

    // Create tooltip
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.style.cssText = `
      position: absolute;
      pointer-events: none;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10001;
      transform: translateX(-50%);
      white-space: nowrap;
      display: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(this.tooltipElement);
  }

  private cleanup(): void {
    // Cancel any ongoing animations
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.pointerElement) {
      this.pointerElement.remove();
      this.pointerElement = null;
    }

    if (this.highlightOverlay) {
      this.highlightOverlay.remove();
      this.highlightOverlay = null;
    }

    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }

    // Remove click ripple keyframes style if it exists
    const keyframeStyle = document.getElementById('click-ripple-keyframes');
    if (keyframeStyle) {
      keyframeStyle.remove();
    }

    this.currentElement = null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  stop(): void {
    this.cleanup();
    this.isRunning = false;
  }

  // Public helper methods for manual control
  public async runHelpFlow(steps: MachineAction[], onProgress?: AutomationCallback): Promise<void> {
    return this.executeActions(steps, onProgress);
  }

  public isFlowRunning(): boolean {
    return this.isRunning;
  }
}

export const uiAutomation = new UIAutomationEngine();
