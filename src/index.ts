import * as discord from "discord.js";
import * as pg from 'pg';
import axios from 'axios';
import cron from 'node-cron';
import * as sapphire from '@sapphire/framework';
import './functions'
import { guildDataCache } from "./functions";
cron;
process.env.TOKEN = 'NjcxMTU2MTMwNDgzMDExNjA1.Xi402g.NHzwIQy24d9CmvA4KdrKMGlYIUY';
process.env.DATABASE_URL = 'postgres://scitozbklgjuci:f8e96c43d16de31c929393bb9248520157b338a66ed4ba74a1e5bfb6cbc44be7@ec2-34-194-100-156.compute-1.amazonaws.com:5432/ddo6pnpikd2ji3';
process.env.OWNERS = '471907923056918528 811413512743813181';
process.on('SIGTERM', async () => {
	console.log('SIGTERM received');
	let x = await (await bot.guilds.fetch('809675885330432051')).channels.fetch('809675885849739296') as discord.TextChannel;
	await x.send(`SIGTERM recieved:\nProcess terminating`);
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
		let x = await guildDataCache.get(message.guild.id, 'prefix') as string
		return x
	} 

});

const logmessages = false;
const prefix = "g";
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

function getRandomArbitrary(min: number, max: number) {
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
	}
});

bot.on('guildMemberAdd', async (member) => {
	db.query(`INSERT INTO members (guild, userid, username) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		[BigInt(member.guild.id), BigInt(member.id), member.user.username]);
	let x = await db.query(`SELECT * FROM members WHERE guild = $1 AND userid = $2 AND blacklisted`, [BigInt(member.guild.id), BigInt(member.id)]);
	if (x.rows.length > 0) {
		member.ban({ reason: 'Blacklisted' });
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

bot.on('messageCreate', (message: discord.Message) => {
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
		console.log(executor);
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
bot.on('messageCreate', async (message: discord.Message) => {
	try {
		if (!message.content.startsWith(prefix) || message.author.bot) { return };
		const args = message.content.slice(prefix.length).trim().split(' ');
		const command = args.shift()?.toLowerCase();
		if (message.author.id === '536047005085204480') {
			let x = getRandomArbitrary(1, 20)
			if (x > 15) await message.channel.send('fuck you');
		}
		let x = getRandomArbitrary(1, 100)
		if (x === 1) await message.channel.send('Next time eat a salad!');
		if (command === 'cat') {
			let user = message.mentions.members?.first();
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				message.channel.send(`${(user?.nickname) ? user?.nickname : user?.user.username} has killed ${getRandomArbitrary(0, 1000)} kittens`);
				return
			}
			message.channel.send(`${(user?.nickname) ? user?.nickname : user?.user.username} has killed ${getRandomArbitrary(0, 2000)} kittens`)

		} else if (command === 'guilds') {
			let x = await bot.guilds.fetch();
			x.each((a) => { message.channel.send(`In guild '${a.name}'', (${a.id})'\n Owner is ${a.owner}`) });
		} else if (command === 'ask') {
			function getRandomArbitrary(min: number, max: number) {
				return Math.round(Math.random() * (max - min) + min);
			}
			if (/-user[0-9]+/gm.test(args[0])) {
				let y = await message.guild?.roles.fetch('858473576335540224');
				let i = await message.guild?.roles.fetch('877133047210852423');
				if (!y) return;
				if (!i) return;
				let member: Array<discord.GuildMember | string> = []
				y.members.each((mem) => member.push(mem));
				i.members.each((mem) => member.push(mem));
				member.push('Illible');
				let uniq = [...new Set(member)];
				let x = /[0-9]+/gm.exec(args[0])![0];
				if (parseInt(x) > 10) return
				for (let i = 0; i < parseInt(x); i++) {
					let ask = uniq[getRandomArbitrary(0, member.length - 1)]
					if (typeof ask === 'string') {
						message.channel.send(`${ask}`);
						return
					} else {
						await message.channel.send(`${(ask.nickname) ? ask.nickname : ask.user.username}`);
					}
				}
				return
			} else if (args[0] === '-user') {
				let y = await message.guild?.roles.fetch('858473576335540224');
				let i = await message.guild?.roles.fetch('877133047210852423');
				if (!y) return;
				if (!i) return;
				let member: Array<discord.GuildMember | string> = []
				y.members.each((mem) => member.push(mem));
				i.members.each((mem) => member.push(mem));
				member.push('nobody');
				member.push('Illible');
				let uniq = [...new Set(member)];
				let ask = uniq[getRandomArbitrary(0, member.length - 1)]
				if (typeof ask === 'string') {
					message.channel.send(`${ask}`);
					return
				}
				await message.channel.send(`${(ask.nickname) ? ask.nickname : ask.user.username}`);
				return;
			}
			else if (args[0] === '-percent') {
				message.channel.send(`${getRandomArbitrary(0, 100)}%`);
				return;
			}
			if (getRandomArbitrary(0, 20) > 9) {
				message.channel.send('yes');
			} else {
				message.channel.send('no');
			}
		} else if (command === 'setstatus') {
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				return
			}
			let stat = args[0];
			if (stat === 'online' || stat === 'idle' || stat === 'dnd' || stat === 'invisible') {
				bot.user!.setStatus(stat);
			};
			const activity = args[1];
			if (activity === 'playing' || activity === 'streaming' || activity === 'watching' || activity === 'listening' || activity === 'none') {
				let stat = (activity === 'none') ? undefined : <discord.ActivityType>activity.toUpperCase();
				let name = args.slice(2).join(' ')
				bot.user!.setActivity(name, { type: (stat as any) });
				return;
			};
		} else if (command === 'https') {
			axios({
				method: 'get',
				url: args[0],
				responseType: 'json'
			}).then(function (response) {
				const buffer = Buffer.from(response.data)
				const attachment = new discord.MessageAttachment(buffer, 'file.json');
				message.channel.send(`GET completed`);
				message.channel.send({ files: [attachment] });
			});
		} else if (command === 'vc') {
		} else if (command === `help`) {
			message.channel.send('Hello! I am Gerald. I will enable you to take control of your server by my rules >:)');
		} else if (command === `setup`) {
			message.channel.send(`Beginning setup but no because zac cant code`);
			//if (err) return console.log(err);
			console.log(`L`);

			//im a gnome
		} else if (command === `die`) {
			message.channel.send(`no u`);
		} else if (command === `politics`) {
			message.channel.send(`https://cdn.discordapp.com/attachments/377228302336655362/886234477578301490/video0.mp4`);
		} else if (command === `repo`) {
			message.channel.send(`https://github.com/mole-den/Gerald`);
		} else if (command === `invite`) {
			message.channel.send(`https://discord.com/oauth2/authorize?client_id=671156130483011605&scope=bot&permissions=829811966`);
		} else if (command === 'uptime') {
			let totalSeconds = Math.round(process.uptime())
			let hours = Math.floor(totalSeconds / 3600);
			totalSeconds %= 3600;
			let minutes = Math.floor(totalSeconds / 60);
			let seconds = totalSeconds % 60;
			message.channel.send(`${hours} hours, ${minutes} mins, ${seconds} seconds`)
		} else if (command === 'status') {

			let user = message.mentions.users.first()
			if (user) {
				let member = await message.guild?.members.fetch(user);
				if (member && member.presence) {
					let presence = member.presence.activities.filter(x => x.type === "PLAYING");
					let x = "";
					if (presence[0]) x = `Playing **${presence[0].name}**`;
					let status = (member.id !== "536047005085204480") ? member.presence.status : "cringe";
					message.channel.send(`${(member.nickname || user.username)} is ${status}\n${x}`);
				}
			}
		} else if (command === 'ping') {
			let start = Date.now()
			await db.query('select 1;')
			let elapsed = Date.now() - start
			message.channel.send(`Websocket heartbeat: ${bot.ws.ping}ms \nDatabase heartbeat: ${elapsed}ms`)
		} else if (command === 'sex') {
			if (getRandomArbitrary(1, 50) === 2) {
				let msg = discord.Util.splitMessage(`
It was a wonderful monday morning... 
BigUniverse got out of bed and immediatly grabbed his phone to talk to his wonderful boyfriend, Gustavo. He messaged him, "Squish me daddy!!!"
Unfortunately, Gustavo had greater plans then going over to BigUniverse's house and railing him. Gustavo wanted a better boyfriend.
He had been programming an AI that would function as a boyfriend for him, but he did not have a body for it. He messaged BigUniverse,
"Im sorry but I dont think we can continue this relationship."
BigUniverse was distraught. He replied, "I will 1v1 you in minecraft bedwars!"
But nothing could change this. Gustavo would date a robot.
If u want more, dm me :)
-sirmole
		`);
				msg.forEach(x => message.channel.send(x));
				return
			}

			let msg = discord.Util.splitMessage(`
No. You aren't having this.
But... you can have this https://www.youtube.com/watch?v=k4FF7x8vnZg&t=0s&ab_channel=Hepburn
		`);
			msg.forEach(x => message.channel.send(x));

		}
	} catch (error) {
		let x = <discord.TextChannel>await (await bot.guilds.fetch('895064783135592449')).channels.fetch('903400898397622283')
		console.log("error");
		console.log(error);
		x.send(` <@!811413512743813181> <@!471907923056918528>\n Unhandled exception: \n ${error}`);
	}
});

//zac cringe
//gustavo cringe
//gerald cringe 
