import * as discord from 'discord.js';
import Bugsnag from '@bugsnag/js';
import * as pg from 'pg';
import cron from 'node-cron';
import * as sapphire from '@sapphire/framework';
import NodeCache from "node-cache";
import * as lux from 'luxon';
//import crypto from "crypto";
Bugsnag.start({
	apiKey: <string>process.env.BUGSNAG_API_KEY,
	appType: 'worker',
	releaseStage: 'production',
	onError: (event) => {
		console.log(JSON.stringify(event));
		void bot.destroy();
		void db.end();
		process.exit(1);	
	}
  })
  
process.on('SIGTERM', async () => {
	console.log('SIGTERM received');
	bot.fetchPrefix = async () => {
		return "EsRtvLIlJ3O5HuNV1Bo824FOzjelsmHmtYFTcBk57";
	};
	await sleep(3000)
	void bot.destroy();
	void db.end();
	process.exit(1);
});

const myIntents = new discord.Intents();
myIntents.add(discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_MESSAGES,
	discord.Intents.FLAGS.DIRECT_MESSAGES, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
	discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS);

export const bot = new sapphire.SapphireClient({
	intents: myIntents,
	partials: ["CHANNEL"],
	fetchPrefix: async (message: discord.Message): Promise<string | Array<string>> => {
		if (message.channel.type === 'DM') {
			return ['', 'g!'];
		}
		try {
			if (!message.guild) return 'g!';
			let x = await guildDataCache.get(message.guild.id, cacheType.prefix);
			return x
		} catch (error) {
			Bugsnag.notify(error as any);
			if (!message.guild) return 'g!';
			await guildDataCache.new(message.guild.id);
			let x = await guildDataCache.get(message.guild.id, cacheType.prefix);
			return x
		}
	},
	defaultCooldown: {
		filteredCommands: process.env.OWNERS!.split(' '),
	}

});
export function durationToMS(duration: string): number | null {
	let timeRegex = /([0-9]+(m($| )|min($| )|mins($| )|minute($| )|minutes($| )|h($| )|hr($| )|hrs($| )|hour($| )|hours($| )|d($| )|day($| )|days($| )|wk($| )|wks($| )|week($| )|weeks($| )|mth($| )|mths($| )|month($| )|months($| )|y($| )|yr($| )|yrs($| )|year($| )|years($| )))+/gmi
	let durationMS = 0;
	let durationArr = duration.match(timeRegex);
	if (!durationArr) return null;
	durationArr.forEach((d) => {
		let time = d.match(/[0-9]+/gmi);
		let unit = d.match(/[a-zA-Z]+/gmi);
		if (!time || !unit) return;
		let timeNum = parseInt(time[0]);
		let unitNum = 0;
		switch (unit[0].toLowerCase()) {
			case 'm':
			case 'min':
			case 'mins':
			case 'minute':
			case 'minutes':
				unitNum = 60000;
				break;
			case 'h':
			case 'hr':
			case 'hrs':
			case 'hour':
			case 'hours':
				unitNum = 3600000;
				break;
			case 'd':
			case 'day':
			case 'days':
				unitNum = 86400000;
				break;
			case 'wk':
			case 'wks':
			case 'week':
			case 'weeks':
				unitNum = 604800000;
				break;
			case 'mth':
			case 'mths':
			case 'month':
			case 'months':
				unitNum = 2592000000;
				break;
			case 'y':
			case 'yr':
			case 'yrs':
			case 'year':
			case 'years':
				unitNum = 31536000000;
				break;
		}
		durationMS += timeNum * unitNum;
	})
	return durationMS;
};
export function durationStringCreator(date1: Date | lux.DateTime , date2: Date | lux.DateTime ): string {
	let startDate = date1 instanceof lux.DateTime ? date1 : lux.DateTime.fromJSDate(date1)
	let endDate = date2 instanceof lux.DateTime ? date2 : lux.DateTime.fromJSDate(date2)
	let duration = startDate.diff(endDate, ["years", "months", "days", "hours", "minutes"], {
		conversionAccuracy: 'casual'
	})
	let durationStr = [];
	if (duration.years) durationStr.push(`${duration.years.toFixed(0)}y`);
	if (duration.months) durationStr.push(`${duration.months.toFixed(0)}mths`);
	if (duration.days) durationStr.push(`${duration.days.toFixed(0)}d`);
	if (duration.hours) durationStr.push(`${duration.hours.toFixed(0)}h`);
	if (duration.minutes) durationStr.push(`${duration.minutes.toFixed(0)}m`);
	return durationStr.join(', ');
}
export enum cacheType {
	disabled = 'disabled',
	prefix = 'prefix',
	delmsgPublicKey = 'delmsgPublicKey',
}
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export function cleanMentions(str: string): string {
	return str.replace(/@everyone/g, '@\u200beveryone').replace(/@here/g, '@\u200bhere');
};

class Cache {
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

class membersCache {
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
export let guildDataCache: Cache
export let memberCache: membersCache

bot.on('ready', () => {
	bot.guilds.fetch().then(async (g) => {
		g.each(async (guild) => {
			let x = await guild.fetch();
			let channels = (await x.channels.fetch()).filter(c => c.type === 'GUILD_TEXT');
			channels.each(async (ch) => {
				let c = (await ch.fetch() as discord.TextChannel);
				c.messages.fetch({ limit: 100 })
			})
		})
	})
});

export const db = new pg.Pool({
	connectionString: <string>process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});

export function getRandomArbitrary(min: number, max: number) {
	return Math.round(Math.random() * (max - min) + min);
};

cron.schedule('0 0 * * * * *', () => {
	db.query('SELECT ')
});

bot.on('commandDenied', ({ context, message: content }: sapphire.UserError, { message }: sapphire.CommandDeniedPayload) => {
	// `context: { silent: true }` should make UserError silent:
	// Use cases for this are for example permissions error when running a hidden command.
	if (Reflect.get(Object(context), 'silent')) return;
	message.channel.send({ content, allowedMentions: { users: [message.author.id], roles: [] } });
});

bot.on('commandError', (error, payload) => {
	if (error instanceof sapphire.UserError) {
		payload.message.channel.send(error.message)
	} else {
		Bugsnag.notify(error as any);
		payload.message.channel.send(`Unhandled exception:\n${(error as any).message}`)
	}
});

bot.on('guildMemberAdd', async (member) => {
	let x = await db.query(`SELECT * FROM punishments WHERE guild = $1 AND member = $2 AND type = 'blist'`, [BigInt(member.guild.id), BigInt(member.id)]);
	if (x.rows.length > 0) {
		member.ban({ reason: `Blacklisted with reason: ${x.rows[0].reason}` });
	}
})

bot.on('guildCreate', async (guild) => {
	let user = await guild.members.fetch(bot.user!.id)
	if (user.permissions.has(discord.Permissions.FLAGS.ADMINISTRATOR) === false) {
		guild.leave();
	}
	db.query('INSERT INTO guilds (guildid, joined_at) VALUES ($1, $2) ON CONFLICT DO NOTHING', [guild.id, new Date()]);
	(await guild.members.fetch()).each(async (mem) => {
		db.query(`INSERT INTO members (guild, userid) VALUES ($1, $2)`,
			[guild.id, mem.id]);
	})
	guildDataCache.new(guild.id);
	memberCache.add(guild.id)
	guild.channels.fetch().then(async (channels) => {
		channels.each(async (ch) => {
			if (ch.type === 'GUILD_TEXT') {
				let c = (await ch.fetch() as discord.TextChannel);
				c.messages.fetch({ limit: 100 })
			}
		})
	})
});

bot.on('messageDelete', async (message) => {
	console.log('attachments', message.attachments)
	let delTime = new Date()
	if (!message.guild) return
	if (message.partial) return;
	await sleep(100)
	let logs = await message.guild.fetchAuditLogs({
		type: 72
	});
	await memberCache.validate(message.guild.id, message.author.id)
	const auditEntry = logs.entries.find(a =>
		a.target.id === message.author.id
		&& a.extra.channel.id === message.channel.id
		&& Date.now() - a.createdTimestamp < 5000
	);
	let entry = auditEntry
	const executor = (entry && entry.executor) ? entry.executor.tag : 'Unknown (Most likely the author or a bot)';
	if (message.author?.bot) return
	if (message.guild === null) return;
	if (message.partial) return;
	let attachments: Array<{
		url: string,
		name: string | null
	}> | null = [];
	message.attachments.each((attachment) => {
		attachments!.push({
			url: attachment.url,
			name: attachment.name
		});
	});
	if (attachments = []) attachments = null;
	await db.query(`
	INSERT INTO deletedmsgs (author, content, guildid, msgtime, channel, deleted_time, deleted_by, msgid, attachments) 
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		[BigInt(message.author.id), message.content,
		message.guild.id, new Date(message.createdAt.getTime()),
		message.channel.id, delTime, executor, message.id, attachments]);
});
bot.on('messageDeleteBulk', async (array) => {
	let delTime = new Date();
	await sleep(100)
	array.each(async (message) => {
		if (!message.guild) return
		if (message.partial) return;
		let logs = await message.guild.fetchAuditLogs({
			type: 72
		});
		await memberCache.validate(message.guild.id, message.author.id)
		const auditEntry = logs.entries.find(a =>
			a.target.id === message.author.id
			&& a.extra.channel.id === message.channel.id
			&& Date.now() - a.createdTimestamp < 5000
		);
		let entry = auditEntry
		const executor = (entry && entry.executor) ? entry.executor.tag : 'Deleted by Author or Bot';
		if (message.author?.bot) return
		if (message.guild === null) return;
		if (message.partial) return;
		let attachments: Array<{
			url: string,
			name: string | null
		}> = [];
		message.attachments.each((attachment) => {
			attachments.push({
				url: attachment.url,
				name: attachment.name
			});
		});
		let params = [
			BigInt(message.author.id), message.content,
			message.guild.id, new Date(message.createdAt.getTime()),
			message.channel.id, delTime, executor, message.id, ((attachments === []) ? null : JSON.stringify(attachments))
		]
		await db.query(`
		INSERT INTO deletedmsgs (author, content, guildid, msgtime, channel, deleted_time, deleted_by, msgid, attachments)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, params);

	});
});

// startup sequence
(async () => {
	console.log('Starting...')
	await db.connect()
	console.log('Connected to database')
	guildDataCache = new Cache(1800)
	memberCache = new membersCache(180000);
	console.log('Loaded caches');
	await sleep(5000)
	await bot.login(process.env.TOKEN);
	console.log('Ready')
})();

export namespace response {
	interface baseResponseOptions {
		ttl?: number,
		content?: string
		replyTo?: boolean,
	};
	//type messageGroup = Array<string | responseOptions>
	interface responseOptions extends baseResponseOptions, Omit<Omit<discord.MessageOptions, 'embeds'
		| 'components' | 'reply'>, keyof baseResponseOptions> { };

	export class Response {
		private message: discord.Message;
		private response?: discord.Message;
		constructor(message: discord.Message) {
			this.message = message;
		}
		public async send(content: string, options?: responseOptions): Promise<discord.Message> {
			if (options === undefined) return this.message.channel.send(content)
			options!.content = content
			if (options.replyTo) {
				this.response = await this.message.reply(options);
			} else {
				this.response = await this.message.channel.send(options)
			}
			if (options.ttl) setTimeout(() => {
				this.response!.delete();
			}, options.ttl);

			return this.response!;
		}
		public async awaitNext(authorOnly: boolean = true): Promise<discord.Message | null> {
			let filter = ((authorOnly === true) ? (m: discord.Message) => m.author.id === this.message.author.id : () => true)
			let x = (await this.message.channel.awaitMessages({
				filter: filter,
				max: 1,
				time: 15000
			})).first();
			return x ? x : null
		}
		//public async sendGroup(group: messageGroup): Promise<discord.Message[]> {}
	}

}

//zac very cringe
//gustavo cringe
//gerald cringe
//gerard not cringe

