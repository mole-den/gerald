import * as discord from "discord.js";
import * as pg from 'pg';
import cron from 'node-cron';
import * as sapphire from '@sapphire/framework';
import NodeCache from "node-cache";
//import crypto from "crypto";
cron;
process.on('SIGTERM', async () => {
	console.log('SIGTERM received');
	bot.fetchPrefix = async () => {
		return "EsRtvLIlJ3O5HuNV1Bo824FOzjelsmHmtYFTcBk57";
	};
	await discord.Util.delayFor(3000)
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

export enum cacheType {
	disabled = 'disabled',
	prefix = 'prefix',
	delmsgPublicKey = 'delmsgPublicKey',
	members = 'members',
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
				db.query(`SELECT userid FROM members WHERE guild = $1`, [BigInt(row.guildid)]).then((data) => {
					let i: Array<string> = [];
					data.rows.forEach((row) => i.push(row.userid));
					this.caches[`${row.guildid}`].set(`members`, i);
				})
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
		let members = await db.query(`SELECT userid FROM members WHERE guild = $1`, [BigInt(guildid)])
		let i: Array<string> = [];
		members.rows.forEach((row) => i.push(row.userid));
		this.caches[`${guildid}`].set(`members`, i);
		this.caches[`${guildid}`].set(`disabled`, guild.rows[0].disabled);
		this.caches[`${guildid}`].set(`prefix`, guild.rows[0].prefix);
	}
	public async get(guild: string, type: cacheType.disabled): Promise<string>
	public async get(guild: string, type: cacheType.prefix): Promise<string>
	public async get(guild: string, type: cacheType.delmsgPublicKey): Promise<string>
	public async get(guild: string, type: cacheType.members): Promise<Array<string>>
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
	public async change(guild: string, type: cacheType.disabled | cacheType.prefix, input: any): Promise<any> {
		await db.query(`UPDATE guilds SET ${type} = $2 WHERE guildid = $1`, [guild, input]);
		let x = await db.query("SELECT * FROM guilds WHERE guildid = $1", [guild]);
		this.caches[`${guild}`].set(`${type}`, x.rows[0][type]);
		return Promise.resolve(x.rows[0][type]);
	};
}
export let guildDataCache: Cache
const token = <string>process.env.TOKEN
const dbToken = <string>process.env.DATABASE_URL;
bot.on('ready', () => {
	console.log('Preparing to take over the world...');
	console.log('World domination complete.');
	console.log('ONLINE');
	guildDataCache = new Cache(1800)
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
	connectionString: dbToken,
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

void db.connect();
void bot.login(token);
//egg

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
		payload.message.channel.send(`Unhandled exception:\n${(error as any).message}`)
	}
});

bot.on('guildMemberAdd', async (member) => {
	db.query(`INSERT INTO members (guild, userid) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		[BigInt(member.guild.id), BigInt(member.id)]);
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
	await discord.Util.delayFor(100);
	let logs = await message.guild.fetchAuditLogs({
		type: 72
	});
	const auditEntry = logs.entries.find(a =>
		(a.target as discord.GuildMember).id === message.author.id
		&& (a.extra as any).channel.id === message.channel.id
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
	await discord.Util.delayFor(1000);
	array.each(async (message) => {
		if (!message.guild) return
		if (message.partial) return;
		let logs = await message.guild.fetchAuditLogs({
			type: 72
		});
		const auditEntry = logs.entries.find(a =>
			(a.target as discord.GuildMember).id === message.author.id
			&& (a.extra as any).channel.id === message.channel.id
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
		console.log(params)
		await db.query(`
		INSERT INTO deletedmsgs (author, content, guildid, msgtime, channel, deleted_time, deleted_by, msgid, attachments)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, params);

	});
});

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
		constructor(message: discord.Message, startTyping: boolean = true) {
			this.message = message;
			if (startTyping) message.channel.sendTyping()
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

