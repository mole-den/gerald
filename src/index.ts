import * as discord from 'discord.js';
import * as sapphire from '@sapphire/framework';
import { scheduledTaskManager } from './taskManager'
import { membersCache } from './caches';
import { PrismaClient } from '@prisma/client';
import Time from '@sapphire/time-utilities'
import WebSocket from 'ws'
//import crypto from "crypto";
process.on('SIGTERM', async () => {
	console.log('SIGTERM received');
	bot.fetchPrefix = async () => {
		return "EsRtvLIlJ3O5HuNV1Bo824FOzjelsmHmtYFTcBk57";
	};
	await sleep(3000)
	void bot.destroy();
	void prisma.$disconnect();
	process.exit(0);
});

process.on('uncaughtException', (err) => {
	process.exit(1)
	let x = {
		type: 'exception',
		data: [err.name, err.message, err.stack]
	};
	new WebSocket(Buffer.from(process.env.ERROR_URL!, 'hex').toString()).send(JSON.stringify(x))
	console.error(err)
	process.exit(1)
})

process.on('unhandledRejection', (err: any) => {
	process.exit(1)
	let x = {
		type: 'rejection',
		data: [err?.name, err?.message, err?.stack, JSON.stringify(err)]
	};
	new WebSocket(Buffer.from(process.env.ERROR_URL!, 'hex').toString()).send(JSON.stringify(x))
	console.error(err)
	process.exit(1)
})

export const bot = new sapphire.SapphireClient({
	typing: true,
	caseInsensitiveCommands: true,
	caseInsensitivePrefixes: true,
	intents: new discord.Intents([discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_MESSAGES,
	discord.Intents.FLAGS.DIRECT_MESSAGES, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
	discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS]),
	partials: ["CHANNEL"],
	defaultPrefix: 'EsRtvLIlJ3O5HuNV1Bo824FOzjelsmHmtYFTcBk57',
	defaultCooldown: {
		scope: 3,
		limit: 3,
		delay: Time.Time.Second * 15
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
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export function cleanMentions(str: string): string {
	return str.replace(/@everyone/g, '@\u200beveryone').replace(/@here/g, '@\u200bhere');
};


export let memberCache: membersCache
export let taskScheduler: scheduledTaskManager
export const prisma = new PrismaClient({
	log: ['info', 'warn', 'error'],
});
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
		payload.message.channel.send("Unhandled exception:\n```" + (error as any).message + "```")
	}
});

bot.on('guildCreate', async (guild) => {
	let user = await guild.members.fetch(bot.user!.id)
	if (user.permissions.has(discord.Permissions.FLAGS.ADMINISTRATOR) === false) {
		guild.leave();
	}
	prisma.guild.create({
		data: {
			guildId: guild.id,
			joinedTime: new Date(),
		},
	});
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
	await prisma.deleted_msg.create({
		data: {
			author: message.author.id,
			content: message.content,
			guildId: message.guildId!,
			msgTime: new Date(message.createdAt.getTime()),
			channel: message.channel.id,
			deletedTime: delTime,
			deletedBy: executor,
			msgId: message.id,
			attachments: attachments
		}
	}).catch((e) => {
		throw e;
	})
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
		const executor = (entry && entry.executor) ? entry.executor.tag : 'Unknown (Most likely the author or a bot)';
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
		prisma.deleted_msg.create({
			data: {
				author: message.author.id,
				content: message.content,
				guildId: message.guildId!,
				msgTime: new Date(message.createdAt.getTime()),
				channel: message.channel.id,
				deletedTime: delTime,
				deletedBy: executor,
				msgId: message.id,
				attachments: attachments
			}
		})

	});
});

async function initTasks() {
	taskScheduler.on('unban', async (a) => {
		let x = Reflect.get(Object(a), 'guild')
		let guild = await bot.guilds.fetch(x)
		guild.bans.remove(Reflect.get(Object(a), 'user') as string)
	})
}
(async () => {
	console.log('Starting...')
	await prisma.$connect()
	console.log('Connected to database')
	memberCache = new membersCache(18000)
	await sleep(1000);
	await bot.login(process.env.TOKEN);
	taskScheduler = new scheduledTaskManager()
	initTasks()
	let x = await prisma.guild.count();
	let guilds = await bot.guilds.fetch()
	if (guilds.size > x) {
		console.log('Guilds:', guilds.size, 'Database:', x)
		guilds.each(async (guild) => {
			await prisma.guild.create({
				data: {
					guildId: guild.id,
					joinedTime: new Date()
				}
			})
			memberCache.add(guild.id)
		})
	}
	await sleep(4000);
	bot.user?.setPresence({
		activities: [{
			name: 'ghelp',
			type: 'LISTENING'
		}],
		status: 'dnd',
	})
	bot.fetchPrefix = async (message) => {		
		if (message.channel.type === 'DM') {
			return ['', 'g'];
		}
		try {
			let x = await prisma.guild.findUnique({
				where: {
					guildId: message.guildId!
				},
				select: {
					prefix: true
				}
			})
			return x?.prefix ?? 'g';
		} catch (error) {
			console.error(error)
			return 'g';
		}
	}
	console.log('Ready')
})();

//zac very cringe
//gustavo cringe
//gerald cringe