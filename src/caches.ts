import NodeCache from 'node-cache';
import { db } from './index';

export enum cacheType {
	disabled = 'disabled',
	prefix = 'prefix',
	delmsgPublicKey = 'delmsgPublicKey',
};

export class Cache {
	private readonly ttlSeconds: number
	private caches: {
		[key: string]: NodeCache;
	} = {};
	constructor(ttlSeconds: number) {
		this.ttlSeconds = ttlSeconds;
		db.query('SELECT * FROM guilds').then((data) => {
			data.rows.forEach((row) => {
				this.caches[`${row.guildid}`] = new NodeCache({
					stdTTL: this.ttlSeconds,
					checkperiod: this.ttlSeconds * 0.2,
					useClones: false
				});
				this.caches[`${row.guildid}`].set(`disabled`, row.disabled);
				this.caches[`${row.guildid}`].set(`prefix`, row.prefix);
			});
		})
	}
	public async new(guildid: string) {
		this.caches[`${guildid}`] = new NodeCache({
			stdTTL: this.ttlSeconds,
			checkperiod: this.ttlSeconds * 0.2,
			useClones: false
		});
		let guild = await db.query('SELECT * FROM guilds WHERE guildid = $1', [BigInt(guildid)]);
		this.caches[`${guildid}`].set(`disabled`, guild.rows[0].disabled);
		this.caches[`${guildid}`].set(`prefix`, guild.rows[0].prefix);
	}
	public async get(guild: string, type: cacheType.disabled): Promise<string>
	public async get(guild: string, type: cacheType.prefix): Promise<string>
	public async get(guild: string, type: cacheType.delmsgPublicKey): Promise<string>
	public async get(guild: string, type: cacheType): Promise<any>
	public async get(guild: string, type: cacheType): Promise<any> {
		if (this.caches[`${guild}`] === undefined) {
			await this.new('652383576117084160');
			this.get(guild, cacheType[type] as any);
			return await this.get(guild, type);
		}
		const value = this.caches[`${guild}`].get(type)
		if (value) {
			return Promise.resolve(value);
		}
		let data = await db.query('SELECT * FROM guilds WHERE guildid = $1', [guild])
		if (data.rowCount === 0) throw new Error(`No data found in database for guild ${guild}`);
		this.caches[`${guild}`].set(type, data.rows[0][type]);
		return Promise.resolve(data.rows[0][type]);
	};
	public async change(guild: string, type: cacheType.prefix, input: string): Promise<string>
	public async change(guild: string, type: cacheType.disabled, input: string): Promise<string>
	public async change(guild: string, type: cacheType, input: any): Promise<any> {
		await db.query(`UPDATE guilds SET ${type} = $2 WHERE guildid = $1`, [guild, input]);
		let x = await db.query("SELECT * FROM guilds WHERE guildid = $1", [guild]);
		this.caches[`${guild}`].set(`${type}`, x.rows[0][type]);
		return Promise.resolve(x.rows[0][type]);
	};

}

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
