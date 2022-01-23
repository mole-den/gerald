import NodeCache from 'node-cache';
import { db } from './index';

export class membersCache {
	private readonly ttlSeconds: number
	cache: NodeCache
	constructor(ttlSeconds: number) {
		this.ttlSeconds = ttlSeconds;
		this.cache = new NodeCache({
			stdTTL: this.ttlSeconds,
			checkperiod: this.ttlSeconds * 0.2,
			useClones: false
		});
		db.query('SELECT * FROM guilds').then((output) => {
			output.rows.forEach(async (row) => {
				let x = await db.query(`SELECT userid FROM members WHERE guild = $1`, [row.guildid])
				this.cache.set(`${row.guildid}`, x.rows.map(x => x.userid));
			})
		})
	}
	async validate(guild: string, users: string | Array<string>, checkOnly: boolean = false): Promise<boolean | Array<boolean>> {
		let x = <Array<string>>this.cache.get(guild);
		if ((typeof users === 'string') && x.includes(users)) return true;
		else if (typeof users === 'string') {
			if (checkOnly) return false
			await db.query(`INSERT INTO members (guild, userid) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
				[BigInt(guild), BigInt(users)]);
			return true;
		}
		else {
			let res: Array<boolean> = [];
			users.forEach((user) => {
				if (!x.includes(user)) {
					if (checkOnly) res.push(false);
					else { db.query(`INSERT INTO members (guild, userid) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
						[BigInt(guild), BigInt(user)])};
				} else {
					if (checkOnly) res.push(true);
				}
			})
			return res
		}
	}

	async add(guild: string) {
		let x = await db.query(`SELECT userid FROM members WHERE guild = $1`, [guild])
		this.cache.set(`${guild}`, x.rows.map(x => x.userid));
	}
}
