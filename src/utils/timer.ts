export class Timer {
    #accumulatedDuration = 0;
    #lastResumeTime = 0;
    #timerId = 0;
    #onTick: () => void;
    #interval: number;

    constructor(onTick: () => void, interval = 5000) {
        this.#onTick = onTick;
        this.#interval = interval;
    }

    start() {
        if (this.#timerId === 0) {
            this.#lastResumeTime = Date.now();
            this.#timerId = window.setInterval(this.#onTick, this.#interval);
        }
    }

    stop() {
        if (this.#timerId !== 0) {
            window.clearInterval(this.#timerId);
            this.#timerId = 0;
        }

        if (this.#lastResumeTime > 0) {
            this.#accumulatedDuration += Date.now() - this.#lastResumeTime;
            this.#lastResumeTime = 0;
        }
    }

    getDuration() {
        const currentSession = this.#lastResumeTime > 0 ? Date.now() - this.#lastResumeTime : 0;
        return (this.#accumulatedDuration + currentSession) / 1000;
    }

    setDuration(seconds: number) {
        this.#accumulatedDuration = seconds * 1000;
        this.#lastResumeTime = 0;
    }

    isActive() {
        return this.#timerId !== 0;
    }
}
