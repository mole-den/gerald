import { EventEmitter } from "events"
import * as cron from 'node-cron'

class ScheduledTask {
	identifier: string
	when: Date
	context: unknown
	constructor(x: { identifier: string, when: Date, context: unknown }) {
		this.context = x.context
		this.identifier = x.identifier
		this.when = x.when
	}
	cancel(): void {}
	execute(): void {}
}

class scheduledTaskManager extends EventEmitter {
	constructor() {
		super();
	}
	
	public new(task: Omit<ScheduledTask, 'cancel' | 'execute'>): ScheduledTask {
		let x = new ScheduledTask(task);
		return x
	}
}


export default scheduledTaskManager