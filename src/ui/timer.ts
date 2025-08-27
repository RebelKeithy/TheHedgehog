export class Timer {
    private startTime: number | null = null;
    private elapsed = 0;
    private running = false;
    private enabled = false;
    private displayElement: HTMLElement | null = null;
    private containerElement: HTMLElement | null = null;
    private intervalId: number | null = null;

    constructor() {
        this.displayElement = document.getElementById('timer-display');
        this.containerElement = document.getElementById('timer-container');
    }

    toggle() {
        this.enabled = !this.enabled;
        console.log(`Timer toggled: enabled=${this.enabled}`);
        if (this.containerElement) {
            this.containerElement.style.display = this.enabled ? 'block' : 'none';
        }
        if (!this.enabled) {
            this.stop();
        }
        return this.enabled;
    }

    start() {
        console.log(`Timer start called: enabled=${this.enabled}, running=${this.running}`);
        if (!this.enabled || this.running) return;
        
        console.log('Timer starting...');
        this.startTime = Date.now() - this.elapsed;
        this.running = true;
        this.intervalId = window.setInterval(() => {
            this.updateDisplay();
        }, 10);
    }

    stop() {
        if (!this.running) return;
        
        this.running = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    reset() {
        this.stop();
        this.elapsed = 0;
        this.startTime = null;
        this.updateDisplay();
    }

    private updateDisplay() {
        if (!this.displayElement) return;
        
        if (this.running && this.startTime) {
            this.elapsed = Date.now() - this.startTime;
        }
        
        const totalMs = this.elapsed;
        const minutes = Math.floor(totalMs / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const centiseconds = Math.floor((totalMs % 1000) / 10);
        
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
        this.displayElement.textContent = timeString;
    }

    isEnabled() {
        return this.enabled;
    }

    isRunning() {
        return this.running;
    }
}