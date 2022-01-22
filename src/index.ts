import * as discord from 'discord.js';
import * as pg from 'pg';
import * as sapphire from '@sapphire/framework';
import * as lux from 'luxon';
import { Cache, membersCache, cacheType } from './caches';
import { scheduledTaskManager } from './taskManager'
//import crypto from "crypto";
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

export const bot = new sapphire.SapphireClient({
	intents: new discord.Intents([discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_MESSAGES,
		discord.Intents.FLAGS.DIRECT_MESSAGES, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
		discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS]),
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
			console.error(error)
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
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export function cleanMentions(str: string): string {
	return str.replace(/@everyone/g, '@\u200beveryone').replace(/@here/g, '@\u200bhere');
};


export let guildDataCache: Cache
export let memberCache: membersCache
export let taskScheduler: scheduledTaskManager
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
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (val) => {
	val = val + ' GMT'
	return lux.DateTime.fromSQL(val)
})
export function getRandomArbitrary(min: number, max: number) {
	return Math.round(Math.random() * (max - min) + min);
};


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
		console.error(error);
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
	guildDataCache = new Cache(1800);
	memberCache = new membersCache(180000);
	console.log('Loaded caches');
	await sleep(5000);
	await bot.login(process.env.TOKEN);
	taskScheduler = new scheduledTaskManager()
	console.log('Ready')
})();

//zac very cringe
//gustavo cringe
//gerald cringe
//gerard not cringe