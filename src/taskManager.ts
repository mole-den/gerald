import { EventEmitter } from "events"
import { CronJob } from 'cron'
import { DateTime } from 'luxon';
import { db } from '.'

type validJSON = string | number | boolean | null | { [key: string]: validJSON } | Array<validJSON>
interface getParams {
	query?: string,
	values?: Array<any>
	context?: { [key: string]: validJSON }
};

class ScheduledTask {
	readonly task: string
	readonly when: DateTime
	private readonly manager: scheduledTaskManager
	readonly context: unknown
	readonly overdue: boolean
	trigger: NodeJS.Timeout | undefined
	canceled: boolean
	readonly id: number
	constructor(x: { task: string, when: DateTime, context: { [key: string]: validJSON } }, id: number, init = false, manager: scheduledTaskManager) {
		this.context = x.context,
			this.manager = manager
		this.canceled = false
		this.task = x.task
		if (init && x.when.diffNow().as('seconds') < 0) {
			throw new Error('Task cannot be scheduled for date in the past')
		}
		this.when = x.when
		this.overdue = (x.when.diffNow().as('seconds') < 0)
		this.id = id
		if (init) db.query('INSERT INTO scheduled_tasks (task, time, context) VALUES ($1, $2, $3)', [this.task, this.when, this.context])
	}
	async cancel(): Promise<void> {
		if (this.trigger) clearTimeout(this.trigger)
		this.manager.loadedIds = this.manager.loadedIds.filter(x => Number(x) !== this.id);
		this.manager.loadedTasks = this.manager.loadedTasks.filter(x => x.task.id !== this.id);
		await db.query('UPDATE scheduled_tasks SET done = true WHERE id = $1', [this.id])
		this.canceled = true
		this.trigger = undefined
	}

	async run(): Promise<void> {
		console.log('task running, id:', this.id);
		this.manager.emit(this.task, this)
		this.manager.emit("every", this)
		if (this.overdue) this.manager.emit("overdue", this)
		this.cancel()
	}
}

export class scheduledTaskManager extends EventEmitter {
	private _id!: number;
	private readonly cronJob: CronJob;
	public loadedIds: string[] = []
	public loadedTasks: Array<{
		task: ScheduledTask,
		trigger: NodeJS.Timeout
	}> = []
	private get id(): number {
		return this._id++;
	}
	private set id(value: number) {
		this._id = value;
	}
	constructor() {
		super();
		this.getID().then(x => this.id = x);
		this.cronJob = new CronJob('*/5 * * * *', () => this.handleTasks())
		this.cronJob.start()
		this.handleTasks(true)
	}
	private handleTasks(startup = false): void {
		let time = startup ? { query: `WHERE time < $1 and done = false`, values: [this.cronJob.nextDate()] } : { query: `WHERE time < now() + interval '5 minutes' and done = false` }
		this.getTasks(time).then(x => {
			if (!x) return;
			x.forEach(y => {
				if (y.id.toString() in this.loadedIds) return;
				let x = setTimeout(() => y.run(), y.when.diffNow().as('seconds') * 1000)
				y.trigger = x
				this.loadedIds.push(y.id.toString())
				this.loadedTasks.push({
					task: y,
					trigger: x,
				});

			})
		})
	}
	private async getID(): Promise<number> {
		let x = await db.query('SELECT MAX(id) FROM scheduled_tasks')
		return (x.rows[0].max ?? 0) + 1 ?? 1;
	}

	public newTask(task: { task: string, when: DateTime, context: { [key: string]: validJSON } }): ScheduledTask {
		let a = new ScheduledTask(task, this.id, true, this);
		if (a.when.toMillis() < this.cronJob.nextDate().valueOf()) {
			let x = setTimeout(() => a.run(), a.when.diffNow().as('seconds') * 1000)
			a.trigger = x
			this.loadedIds.push(a.id.toString())
			this.loadedTasks.push({
				task: a,
				trigger: x,
			});

		}
		return a
	}

	public async getTasks(params?: getParams): Promise<null | ScheduledTask[]> {
		let query = params ? `SELECT * FROM scheduled_tasks ${params.query ?? ''}` : 'SELECT * FROM scheduled_tasks WHERE done = false';
		let x = (params && params.values) ? await db.query(query, params.values) : await db.query(query);
		if (x.rows.length == 0) {
			return null
		}
		if (params?.context !== undefined) {
			let keys = Object.keys(params.context)
			keys.forEach(key => {
				x.rows = x.rows.filter(y => y.context[key] == params.context![key])
			})
		}
		if (x.rows.length == 0) {
			return null
		}
		let loaded: Array<ScheduledTask> = [];
		this.loadedTasks.forEach(x => loaded.push(x.task))
		let tasks: Array<ScheduledTask> = (x.rows.map(x =>
			new ScheduledTask({ task: x.task, when: x.time, context: x.context }, x.id, false, this)
		)).filter(x => !(x.id in this.loadedIds)).concat(loaded)
		return tasks
	}
}
