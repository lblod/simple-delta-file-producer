export class ProcessingQueue {
  constructor() {
    this.queue = [];
    this.run();
  }

  async run() {
    if (this.queue.length > 0) {
      console.log("executing oldest task on queue");
      await this.queue.shift()();
      this.run();
    }
    else {
      setTimeout(() => {this.run();}, 3000);
    }
  }

  addJob(origin) {
    this.queue.push(origin);
  }
}
