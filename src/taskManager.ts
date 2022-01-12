import { EventEmitter } from "events"
//import * as cron from 'node-cron'
import * as pg from 'pg'
const db = new pg.Pool({
	connectionString: 'postgres://dgwgajohpiooid:d4e3c9d5583ddb1fb429057b86cab5b6e5d28c8669129ea095ff2a899fa9d496@ec2-34-233-214-228.compute-1.amazonaws.com:5432/d282ttnf02pikk',
	ssl: {
		rejectUnauthorized: false
	}
});
db.connect()
type validJSON = string | number | boolean | null | { [key: string]: validJSON } | Array<validJSON>
interface getParams {
	task?: string,
	id?: number,
	time?: Date,
	context?: { [key: string]: validJSON }
}
class ScheduledTask {
	readonly task: string
	manager: scheduledTaskManager
	when: Date
	context: unknown
	overdue: boolean
	readonly id: number
	constructor(x: { task: string, when: Date, context: { [key: string]: validJSON } }, manager: scheduledTaskManager, id: number, init = false) {
		this.context = x.context
		this.task = x.task
		this.when = x.when
		this.overdue = false
		this.manager = manager
		this.id = id
		if (init) db.query('INSERT INTO scheduled_tasks (task, time, context) VALUES ($1, $2, $3)', [this.task, this.when, this.context])
	}
	async cancel(): Promise<void> {
		await db.query('DELETE FROM scheduled_tasks WHERE id = $1', [this.id])
	}

	async alter(x: { when?: Date, context?: { [key: string]: validJSON } }): Promise<void> {
		x.when ??= this.when 
		x.context ??= this.context as { [key: string]: validJSON }
		this.when = x.when;
		this.context = x.context;
		db.query('UPDATE scheduled_tasks SET time = $1, context = $2', [x.when, x.context])
	}

	execute(): void {
		this.manager.emit(this.task, this.context)
	}

}

class scheduledTaskManager extends EventEmitter {
	private _id!: number;
	private get id(): number {
		return this._id++;
	}
	private set id(value: number) {
		this._id = value;
	}
	constructor() {
		super();
		this.getID().then(x => this.id = x)
	}
	private async getID(): Promise<number> {
		let x = await db.query('SELECT MAX(id) FROM scheduled_tasks')
		return (x.rows[0].max ?? 0) + 1 ?? 1;
	}

	public newTask(task: { task: string, when: Date, context: { [key: string]: validJSON } }): ScheduledTask {
		return new ScheduledTask(task, this, this.id, true)
	}

	public async getTasks(params?: getParams): Promise<null | ScheduledTask | ScheduledTask[]> {
		let query = 'SELECT * FROM scheduled_tasks'
		let values: any[] = []
		if (params?.task) {
			query += ' WHERE task = $1'
			values.push(params.task)
		}
		if (params?.id) {
			query += ' WHERE id = $1'
			values.push(params.id)
		}
		if (params?.time) {
			query += ' WHERE time = $1'
			values.push(params.time)
		}

		let x = await db.query(query, values);
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
		if (x.rows.length == 1) {
			return new ScheduledTask({ task: x.rows[0].task, when: x.rows[0].time, context: x.rows[0].context }, this, x.rows[0].id)
		}
		return x.rows.map(x => new ScheduledTask({ task: x.task, when: x.time, context: x.context }, this, x.id))
	}
}

export default scheduledTaskManager