import * as discord from 'discord.js';
import * as sapphire from '@sapphire/framework';
import { scheduledTaskManager } from './taskManager'
import { PrismaClient } from '@prisma/client';
import Time from '@sapphire/time-utilities';
import Bugsnag from '@bugsnag/js'
import { Levelling } from './modules/levelling';
export let bugsnag = Bugsnag
if (process.env.BUGSNAG_KEY) bugsnag.start({
	apiKey: process.env.BUGSNAG_KEY,
	appVersion: (require('../package.json').version)
});

process.on('SIGTERM', async () => {
	console.log('SIGTERM received');
	void bot.destroy();
	process.exit(0);
});
class Gerald extends sapphire.SapphireClient {
	constructor() {
		super({
			typing: true,
			caseInsensitiveCommands: true,
			caseInsensitivePrefixes: true,
			fetchPrefix: async (message) => {
				try {
					let x = await prisma.guild.findUnique({
						where: {
							guildId: message.guildId!
						},
						select: {
							prefix: true
						}
					});
					return x?.prefix ?? 'g';
				} catch (error) {
					return 'g';
				}

			},
			loadMessageCommandListeners: true,
			intents: new discord.Intents([discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_MESSAGES,
			discord.Intents.FLAGS.DIRECT_MESSAGES, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
			discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS]),
			partials: ["CHANNEL"],
			defaultCooldown: {
				scope: 3,
				limit: 2,
				delay: Time.Time.Second * 3
			}
		})
		sapphire.container.modules = [new Levelling()]
	}
	
	public async start(): Promise<void> {
		console.log('Starting...')
		await prisma.$connect()
		console.log('Connected to database')
		await sleep(1000);
		await super.login(process.env.TOKEN);
		taskScheduler = new scheduledTaskManager()
		let x = await prisma.guild.count();
		let guilds = await this.guilds.fetch()
		if (guilds.size > x) {
			console.log('Guilds:', guilds.size, 'Database:', x)
			guilds.each(async (guild) => {
				await prisma.guild.create({
					data: {
						guildId: guild.id,
						joinedTime: new Date()
					}
				})
			})
		}
		await sleep(4000);
		this.user?.setStatus("dnd")
		console.log('Ready')
	} 
	public override destroy(): void {
		prisma.$disconnect()
		taskScheduler.removeAllListeners()
		super.destroy()
	}
}
export const bot = new Gerald();
export function durationToMS(duration: string): number {
	let timeRegex = /([0-9]+(m($| )|min($| )|mins($| )|minute($| )|minutes($| )|h($| )|hr($| )|hrs($| )|hour($| )|hours($| )|d($| )|day($| )|days($| )|wk($| )|wks($| )|week($| )|weeks($| )|mth($| )|mths($| )|month($| )|months($| )|y($| )|yr($| )|yrs($| )|year($| )|years($| )))+/gmi
	let durationMS = 0;
	if (duration.length > 30) return NaN
	let durationArr = duration.match(timeRegex);
	if (!durationArr) return NaN;
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


export let taskScheduler: scheduledTaskManager
export const prisma = new PrismaClient({
	log: ['info', 'warn', 'error'],
});
export function getRandomArbitrary(min: number, max: number) {
	return Math.round(Math.random() * (max - min) + min);
};

bot.on('messageCommandDenied', ({ context, message: content }: sapphire.UserError, { message }: sapphire.MessageCommandDeniedPayload) => {
	// `context: { silent: true }` should make UserError silent:
	// Use cases for this are for example permissions error when running a hidden command.
	if (Reflect.get(Object(context), 'silent')) return;
	message.channel.send({ content, allowedMentions: { users: [message.author.id], roles: [] } });
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
	guild.channels.fetch().then(async (channels) => {
		channels.each(async (ch) => {
			if (ch.type === 'GUILD_TEXT') {
				let c = (await ch.fetch() as discord.TextChannel);
				c.messages.fetch({ limit: 100 })
			}
		})
	})
});
async function deletedMessageHandler(message: discord.Message | discord.PartialMessage, delTime: Date) {
	if (message.partial || message.author.bot || message.guild === null) return;
	await sleep(100)
	let logs = await message.guild.fetchAuditLogs({
		type: 72
	});
	const auditEntry = logs.entries.find(a =>
		a.target.id === message.author.id
		&& a.extra.channel.id === message.channel.id
		&& Date.now() - a.createdTimestamp < 5000
	);
	let entry = auditEntry
	const executor = (entry && entry.executor) ? entry.executor.tag : 'Unknown (Most likely the author or a bot)';
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
	await prisma.member.createMany({
		data: [{
			userid: message.author.id,
			guildid: message.guildId!
		}],
		skipDuplicates: true
	})
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
			attachments: attachments,
		}

	})
}

bot.on('messageDelete', async (message) => await deletedMessageHandler(message, new Date()));
bot.on('messageDeleteBulk', async (array) => {
	let delTime = new Date();
	await sleep(100)
	array.each(async (message) => {
		await deletedMessageHandler(message, delTime)
	});
});

bot.start()
//zac very cringe
//gustavo cringe
//gerald cringe