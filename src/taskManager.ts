import { EventEmitter } from "events";
import { bot } from ".";
import { CronJob } from "cron";
import { DateTime } from "luxon";
import { Time } from "@sapphire/time-utilities";

type validJSON = string | number | boolean | null | { [key: string]: validJSON } | validJSON[]
interface getParams {
	id?: number,
	task?: string,
	time?: Date
	context?: { [key: string]: validJSON }
}

class ScheduledTask {
	readonly task: string;
	readonly when: DateTime;
	private readonly manager: scheduledTaskManager;
	readonly context: {
		[key: string]: unknown
	};
	readonly overdue: boolean;
	trigger: NodeJS.Timeout | undefined;
	canceled: boolean;
	readonly id: number;
	constructor(x: { task: string, when: DateTime, context: { [key: string]: validJSON } }, id: number, init = false, manager: scheduledTaskManager) {
		this.context = x.context,
		this.manager = manager;
		this.canceled = false;
		this.task = x.task;
		if (init && x.when.diffNow().as("seconds") < 0) throw new Error("Task cannot be scheduled for date in the past");
		this.when = x.when;
		this.overdue = (x.when.diffNow().as("seconds") < 0);
		this.id = id;
		if (init) bot.db.scheduled_task.create({
			data: {
				task: this.task,
				time: this.when.toJSDate(),
				context: <validJSON>this.context ?? {}
			}
		});
	}
	async cancel(): Promise<void> {
		if (this.trigger) clearTimeout(this.trigger);
		this.manager.loadedIds = this.manager.loadedIds.filter(x => Number(x) !== this.id);
		this.manager.loadedTasks = this.manager.loadedTasks.filter(x => x.task.id !== this.id);
		bot.db.scheduled_task.update({
			where: { id: this.id },
			data: { done: true }
		});
		this.canceled = true;
		this.trigger = undefined;
	}

	async run(): Promise<void> {
		console.log("task running, id:", this.id);
		this.manager.emitTask(this.task, this);
		this.manager.emitTask("every", this);
		if (this.overdue) this.manager.emitTask("overdue", this);
		this.cancel();
	}
}

export class scheduledTaskManager extends EventEmitter {
	private _id!: number;
	private readonly cronJob: CronJob;
	public emitTask(eventName: string | symbol, arg: ScheduledTask): boolean {
		return super.emit(eventName, arg);
	}
	public override on(eventName: string | symbol, listener: (arg: ScheduledTask) => void): this {
		return super.on(eventName, listener);
	}
	public loadedIds: string[] = [];
	public loadedTasks: {
		task: ScheduledTask,
		trigger: NodeJS.Timeout
	}[] = [];
	private get id(): number {
		return this._id++;
	}
	private set id(value: number) {
		this._id = value;
	}
	constructor() {
		super();
		this.getID().then(x => this.id = x);
		this.cronJob = new CronJob("*/5 * * * *", () => this.handleTasks());
		this.cronJob.start();
		this.handleTasks(true);
	}
	private handleTasks(startup = false): void {
		const time = startup ? { time: this.cronJob.nextDate().toDate() } : { time: new Date(Date.now() + (Time.Minute * 5)) };
		this.getTasks(time).then(x => {
			if (!x) return;
			x.forEach(y => {
				if (y.id.toString() in this.loadedIds) return;
				const timeout = setTimeout(() => y.run(), y.when.diffNow().as("seconds") * 1000);
				y.trigger = timeout;
				this.loadedIds.push(y.id.toString());
				this.loadedTasks.push({
					task: y,
					trigger: timeout,
				});

			});
		});
	}
	private async getID(): Promise<number> {
		const x = await bot.db.scheduled_task.count();
		return (x ?? 0) + 1 ?? 1;
	}

	public newTask(task: { task: string, when: DateTime, context: { [key: string]: validJSON } }): ScheduledTask {
		const a = new ScheduledTask(task, this.id, true, this);
		if (a.when.toMillis() < this.cronJob.nextDate().valueOf()) {
			const x = setTimeout(() => a.run(), a.when.diffNow().as("seconds") * 1000);
			a.trigger = x;
			this.loadedIds.push(a.id.toString());
			this.loadedTasks.push({
				task: a,
				trigger: x,
			});

		}
		return a;
	}

	public async getTasks(params?: getParams): Promise<null | ScheduledTask[]> {
		let q = await bot.db.scheduled_task.findMany({ where: { done: false } });
		if (params) q = q.filter(x => {
			((params.id ? params.id === x.id : true) ||
				(params.task ? params.task === x.task : true) ||
				(params.time ? params.time <= x.time : true));
		});
		if (q.length === 0) return null;
		if (params?.context !== undefined) {
			const keys = Object.keys(params.context);
			const i = params.context;
			keys.forEach(key => {
				if (params.context === undefined) return;
				q = q.filter(y => (y.context as { [key: string]: validJSON })[key] === i[key]);
			});
		}
		if (q.length === 0) return null;
		const loaded: ScheduledTask[] = [];
		this.loadedTasks.forEach(x => loaded.push(x.task));
		const tasks: ScheduledTask[] = (q.map(x =>
			new ScheduledTask({ task: x.task, when: DateTime.fromJSDate(x.time), context: <{ [key: string]: validJSON }>x.context }, x.id, false, this)
		)).filter(x => !(x.id in this.loadedIds)).concat(loaded);
		return tasks;
	}
}
