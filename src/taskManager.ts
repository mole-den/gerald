import { EventEmitter } from "events"
import * as cron from 'node-cron'
import * as pg from 'pg'
const db = new pg.Pool({
	connectionString: 'postgres://muqznwjuqigmcr:3d5340d954bd33ae21214e07217cd6bd1794d11d38e9de58a667c6363a99cd4d@ec2-34-233-214-228.compute-1.amazonaws.com:5432/d282ttnf02pikk',
	ssl: {
		rejectUnauthorized: false
	}
});
db.connect()
type validJSON = string | number | boolean | null | { [key: string]: validJSON } | Array<validJSON>
interface getParams {
	task?: string,
	id?: number,
	time?: string,
	context?: validJSON
}
class ScheduledTask {
	readonly task: string
	manager: scheduledTaskManager
	when: Date
	context: unknown
	overdue: boolean
	readonly id: number
	constructor(x: { task: string, when: Date, context: validJSON }, manager: scheduledTaskManager, id: number) {
		this.context = x.context
		this.task = x.task
		this.when = x.when
		this.overdue = false
		this.manager = manager
		this.id = id
		db.query('INSERT INTO scheduled_tasks (task, time, context) VALUES ($1, $2, $3)', [this.task, this.when, this.context])
	}
	async cancel(): Promise<void> {
		await db.query('DELETE FROM scheduled_tasks WHERE id = $1', [this.id])
	}

	async alter(x: { when?: Date, context?: validJSON }): Promise<void> {
		this.when = x.when ?? this.when;
		this.context = x.context ?? this.context;
	}

	execute(): void {
		this.manager.emit(this.task, this.context)
	}

}

class scheduledTaskManager extends EventEmitter {
	private id!: number
	constructor() {
		super();
		this.getID().then(x => this.id = x)
	}
	private async getID(): Promise<number> {
		let x = await db.query('SELECT MAX(id) FROM scheduled_tasks')
		return x.rows[0].max + 1 ?? 1;
	}

	public new(task: { task: string, when: Date, context: validJSON }): ScheduledTask {
		return new ScheduledTask(task, this, this.id)
	}

	public get(params: getParams)/*: ScheduledTask | ScheduledTask[]*/ {
		cron; params
	}
}

export default scheduledTaskManager