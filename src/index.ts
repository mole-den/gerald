import * as discord from "discord.js";
import * as pg from 'pg';
import cron from 'node-cron';
import * as sapphire from '@sapphire/framework';
import NodeCache from "node-cache";
cron;
process.on('SIGTERM', async () => {
	console.log('SIGTERM received');
	db.end();
	bot.destroy();
	process.exit(1);
});


const myIntents = new discord.Intents();
myIntents.add(discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_MESSAGES,
	discord.Intents.FLAGS.DIRECT_MESSAGES, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
	discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, discord.Intents.FLAGS.GUILD_PRESENCES);

const bot = new sapphire.SapphireClient({
	intents: myIntents,
	defaultPrefix: 'g',
	fetchPrefix: async (message: discord.Message): Promise<string> => {
		if (!message.guild) return 'g';
		let x = await guildDataCache.get(message.guild.id, 'prefix') as string;
		return x
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

class Cache {
	cache: NodeCache;
	constructor(ttlSeconds: number) {
		this.cache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: ttlSeconds * 0.2, useClones: false });
	}

	async get(guild: string, type: string): Promise<any> {
		let key = `${guild}-${type}`
		const value = this.cache.get(key) as string;
		if (value) {
			return Promise.resolve(value);
		}
		let data = await db.query('SELECT * FROM guilds WHERE guildid = $1', [guild])
		if (data.rowCount === 0) throw new Error(`No data found in database for guild ${guild}`);
		this.cache.set(key, data.rows[0][type]);
		return Promise.resolve(data.rows[0][type]);
	};
	async change(guild: string, type: string, input: any): Promise<any> {
		await db.query(`UPDATE guilds SET ${type} = $1 WHERE guildid = $2`, [input, guild]);
		let x = await db.query("SELECT * FROM guilds WHERE guildid = $1", [guild]);
		this.cache.set(`${guild}-${type}`, x.rows[0][type]);
		return Promise.resolve(x.rows[0][type]);
	}
}

export const guildDataCache = new Cache(1800)

const logmessages = false;
const token = <string>process.env.TOKEN
const dbToken = <string>process.env.DATABASE_URL;
bot.on('ready', () => {
	console.log('Preparing to take over the world...');
	console.log('World domination complete.');
	console.log('ONLINE');
	bot.user!.setPresence({ activities: [{ name: 'you', type: "WATCHING" }], status: 'dnd' });
	//online or dnd
	//bot.emit('heartbeated');
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
	// Use cases for this are for example permissions error when running the `eval` command.
	if (Reflect.get(Object(context), 'silent')) return;
	message.channel.send({ content, allowedMentions: { users: [message.author.id], roles: [] } });
});
bot.on('commandError', (error, payload) => {
	if (error instanceof sapphire.UserError) {
		payload.message.channel.send(error.message)
	} else {
		let owners = process.env.OWNERS!.split(' ');
		let x = owners.includes(payload.message.author.id);
		payload.message.channel.send(`${x ? 'Error: ' : `<@!811413512743813181> <@!471907923056918528>\nError: `}${(error as any).message}`)
	}
});

bot.on('guildMemberAdd', async (member) => {
	db.query(`INSERT INTO members (guild, userid, username) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		[BigInt(member.guild.id), BigInt(member.id), member.user.username]);
	let x = await db.query(`SELECT * FROM punishments WHERE guild = $1 AND userid = $2 AND type = 'blist'`, [BigInt(member.guild.id), BigInt(member.id)]);
	if (x.rows.length > 0) {
		member.ban({ reason: `Blacklisted with reason: ${x.rows[0].reason}` });
	}
})
bot.on('guildCreate', async (guild) => {
	db.query('INSERT INTO guilds (guildid, joined_at) VALUES ($1, $2) ON CONFLICT DO NOTHING', [guild.id, new Date()]);
	(await guild.members.fetch()).each(async (mem) => {
		db.query(`INSERT INTO members (guild, userid) VALUES ($1, $2)`,
			[guild.id, mem.id]);
	})
	guild.channels.fetch().then(async (channels) => {
		channels.each(async (ch) => {
			if (ch.type === 'GUILD_TEXT') {
				let c = (await ch.fetch() as discord.TextChannel);
				c.messages.fetch({ limit: 100 })
			}
		})
	})
});

bot.on('messageCreate', async (message: discord.Message) => {
	if (message.author.id === '536047005085204480') {
		let x = getRandomArbitrary(1, 20)
		if (x > 15) message.channel.send('fuck you');
	}
	if (getRandomArbitrary(1, 1000) === 1) message.channel.send('Next time eat a salad!');
	if (/\bez\b/gmi.test(message.content)) {
		if (message.author.bot) return;
		message.delete();
		const number = getRandomArbitrary(0, 7);
		if (number === 0) {
			message.channel.send(`${message.author} likes long walks on the beach and talking in Mole Den!`);
		} else if (number === 1) {
			message.channel.send(`${message.author} tries to say bad things and this happens. :(`);
		} else if (number === 2) {
			message.channel.send(`${message.author} loves watching mole videos on youtube!`);
		} else if (number === 3) {
			message.channel.send(`${message.author} wants to know if anyone else really likes Rick Astley.`);
		} else if (number === 4) {
			message.channel.send(`This isnt what ${message.author} typed.`);
		} else if (number === 5) {
			message.channel.send(`I am truly better than ${message.author}.`);
		} else if (number === 6) {
			message.channel.send(`${message.author} sometimes sings soppy love songs in the car.`);
		} else if (number === 7) {
			message.channel.send(`My clicks per second are godly, ${message.author}!`);
		}
	}
	if (/\bfamily\b/gmi.test(message.content)) {
		if (message.author.bot) return
		message.channel.send(`Nothing is more important than family.`);
	}
	if (message.author.bot) return
	if (logmessages === false) return;
	if (message.channel.type === 'DM') return;
	const channel = message.guild!.channels.cache.find(ch => ch.name === 'gerald');
	console.log(`${message.author.tag} said: "${message.content}" in ${message.guild!.name}`);
	if (!channel) return;
	if (message.channel.name === 'gerald') return;
	if (channel.type === 'GUILD_TEXT') {
		(channel as discord.TextChannel).send(`**${message.author.tag}** said: \`${message.content}\` in ${message.guild!.name}`);
	};
});

bot.on('messageDelete', async (message) => {
	let delTime = new Date()
	if (!message.guild) return
	if (message.partial) return;
	await discord.Util.delayFor(900);
	let logs = await message.guild.fetchAuditLogs({
		type: 72
	});
	const auditEntry = logs.entries.find(a =>
		// @ts-expect-error ts(2339)
		a.target.id === message.author.id
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
	await db.query(`
	INSERT INTO deletedmsgs (author, content, guildid, msgtime, channel, deleted_time, deleted_by, msgid, attachments) 
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		[BigInt(message.author.id), message.content,
		message.guild.id, new Date(message.createdAt.getTime()),
		message.channel.id, delTime, executor, message.id, JSON.stringify(attachments)]);
});

bot.on('messageDeleteBulk', async (array) => {
	let delTime = new Date()
	array.each(async (message) => {
		if (!message.guild) return
		await discord.Util.delayFor(900);
		let logs = await message.guild.fetchAuditLogs({
			type: 72
		});
		const auditEntry = logs.entries.find(a =>
			// @ts-expect-error
			a.target.id === message.author.id &&
			(a.extra as any).channel.id === message.channel.id &&
			Date.now() - a.createdTimestamp < 5000
		);
		let entry = auditEntry
		const executor = (entry && entry.executor) ? entry.executor.tag : 'Deleted by Author or Bot';
		if (message.author?.bot) return
		if (message.guild === null) return;
		if (message.partial) return;
		await db.query(`
	INSERT INTO deletedmsgs (author, content, guildid, msgtime, channel, deleted_time, deleted_by, msgid) 
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[BigInt(message.author.id), message.content,
			message.guild.id, new Date(message.createdAt.getTime()),
			message.channel.id, delTime, executor, message.id]);

	});
});

//zac cringe
//gustavo cringe
//gerald cringe 

