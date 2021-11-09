import * as discord from "discord.js";
import * as voice from '@discordjs/voice';
import * as pg from 'pg';
import * as lux from 'luxon';
import axios from 'axios';
import cron from 'node-cron';
voice;
cron;
process.on('uncaughtException', async (error) => {
	console.log(error);
	console.log('err');
	if (!bot) process.exit();
	let x = await (await bot.guilds.fetch('895064783135592449')).channels.fetch('903400898397622283') as discord.TextChannel;
	x.send(` <@!811413512743813181> <@!471907923056918528>\n Unhandled exception: \n ${error}`);
	process.exit();
});
process.on('unhandledRejection', async error => {
	console.log(error);
	console.log('err');
	if (!bot) { process.exit() }
	let x = await (await bot.guilds.fetch('895064783135592449')).channels.fetch('903400898397622283') as discord.TextChannel;
	x.send(` <@!811413512743813181> <@!471907923056918528>\n Unhandled rejection: \n ${error}`);
	process.exit();
});

const myIntents = new discord.Intents();
myIntents.add(discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_MESSAGES,
	discord.Intents.FLAGS.DIRECT_MESSAGES, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
	discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, discord.Intents.FLAGS.GUILD_PRESENCES);
const bot = new discord.Client({ intents: myIntents });
const logmessages = false;
const prefix = "g";
const token = <string>process.env.TOKEN
const dbToken = <string>process.env.HEROKU_POSTGRESQL_BLACK_URL
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
const db = new pg.Pool({
	connectionString: dbToken,
	ssl: {
		rejectUnauthorized: false
	}
});

function getRandomArbitrary(min: number, max: number) {
	return Math.round(Math.random() * (max - min) + min);
};

function durationToMS(duration: string): number | null {
	let timeRegex = /([0-9]+( +|)(m($| )|min($| )|mins($| )|minute($| )|minutes($| )|h($| )|hr($| )|hrs($| )|hour($| )|hours($| )|d($| )|day($| )|days($| )|wk($| )|wks($| )|week($| )|weeks($| )|mth($| )|mths($| )|month($| )|months($| )|y($| )|yr($| )|yrs($| )|year($| )|years($| )))+/gmi
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
}

db.connect();
bot.login(token);
//egg

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
		db.query(`INSERT INTO members (guild, userid, username) VALUES ($1, $2, $3)`,
			[guild.id, mem.id, `${mem.user.username}#${mem.user.discriminator}`]);
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

bot.on('userUpdate', async (user) => {
	console.log('changed');
	let fullUser = ((user.partial) ? (await user.fetch()) : user);
	db.query('UPDATE members SET username = $1 WHERE userid = $2',
		[`${fullUser.username}#${fullUser.discriminator}`, fullUser.id]);
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
		} else if (command === 'smite') {
			if (message.channel.type === 'DM') return;
			if (message.guild === null) return;
			if (message.member!.permissions.has(discord.Permissions.FLAGS.BAN_MEMBERS)) {
				// if args[0] = 'add' then update the database by adding the mentioned users id to the blacklisted users in the database
				if (args[0] === 'add') {
					let reason;
					let user = message.mentions.members?.first();
					let content =  args.slice(2, 4).join(' ');
					let time = durationToMS(content);
					if (time === null) {
						reason = args.slice(2).join(' ');
					} else {
					reason = args.slice(4).join(' ');
					}
					if (user) {
						if (user.roles.highest.position >= message.member!.roles.highest.position) {
							message.channel.send(`You do not have a high enough role to do this.`);
							return;
						}
						await db.query(`INSERT INTO punishments (member, guild, type, reason, created_time, duration) VALUES ($1, $2, $3, $4, $5, $6) `, 
						[user.id, message.guild.id, 'blist', reason, new Date(), time]);
						message.guild.bans.create(user, { reason: 'Blacklisted', days: 0 });
						message.channel.send(`${user.user.username} has been added to the blacklist and banned${(time === null) ? '.': `for ${content}`}\n Provided reason: ${reason}`);
					} else {
						let num = parseInt(args[1]);
						if (num !== NaN) {
							await db.query(`INSERT INTO punishments (member, guild, type, reason, created_time, duration) VALUES ($1, $2, $3, $4, $5, $6) `,
								[num, message.guild.id, 'blist', reason, new Date(), time]);
							message.channel.send(`${num} has been added to the blacklist`);
						};
					};
					// if args[0] = 'remove' then update the database by removing the mentioned users id from the blacklisted users in the database
				} else if (args[0] === 'remove') {
					let user = message.mentions.users?.first();
					if (user) {
						db.query('UPDATE members SET blacklisted = false WHERE userid = $1 AND guild = $2', [user.id, message.guild.id]);
						message.channel.send(`${user.username} has been removed from the blacklist`);
						message.guild.members.unban(user);
					} else {
						let num = parseInt(args[1]);
						if (num === NaN) return;
						let q = await db.query('UPDATE members SET blacklisted = false WHERE userid = $1 AND guild = $2', [num, message.guild.id]);
						if (q.rowCount === 0) return;
						await message.guild.members.unban(num.toString()).then(() => {
							message.channel.send(`${num} has been removed from the blacklist`);
						});
					};
					// if args[0] = 'list' then send a message containing all the blacklisted users in the database
				} else if (args[0] === 'list') {
					let smite = await db.query('SELECT * FROM members WHERE blacklisted AND guild = $1', [message.guild.id]);
					if (smite.rowCount === 0) message.channel.send(`No users are blacklisted`);
					smite.rows.forEach((i) => {
						message.channel.send(`${i.userid} is blacklisted`);
					});
					// if args[0] = 'clear' then clear the database of all blacklisted users
				} else if (args[0] === 'clear') {
					let banned = await db.query('SELECT * FROM members WHERE blacklisted AND guild = $1', [message.guild.id]);
					await db.query('UPDATE members SET blacklisted = false WHERE blacklisted AND guild = $1', [message.guild.id]);
					message.channel.send(`The blacklist has been cleared`);
					banned.rows.forEach((i) => {
						message.guild!.members.unban(i.userid);
					});
				}
			} else {
				message.channel.send('You are missing permission \`BAN_MEMBERS\`.');
			}
		} else if (command === 'uptime') {
			let totalSeconds = Math.round(process.uptime())
			let hours = Math.floor(totalSeconds / 3600);
			totalSeconds %= 3600;
			let minutes = Math.floor(totalSeconds / 60);
			let seconds = totalSeconds % 60;
			message.channel.send(`${hours} hours, ${minutes} mins, ${seconds} seconds`)
		} else if (command === 'query') {
			let str = message.content;
			let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				message.channel.send('You do not have permission to do this');
				return;
			}
			console.log(out);
			let data = await db.query(out);
			console.log('done');
			let JSONdata = JSON.stringify(data.rows, null, 1);
			if (JSONdata?.length && JSONdata.length < 2000) {
				message.channel.send(`${data.command} completed - ${data.rowCount} rows, \n${JSONdata}`);
				return;
			} else if (JSONdata?.length && JSONdata.length > 2000) {
				const buffer = Buffer.from(JSONdata)
				const attachment = new discord.MessageAttachment(buffer, 'file.json');
				message.channel.send(`${data.command} completed - ${data.rowCount} rows,`);
				message.channel.send({ files: [attachment] });
			} else {
				message.channel.send(`${data.command} completed - ${data.rowCount} rows,`);
			}

		} else if (command === "eval") {
			let str = message.content;
			let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				message.channel.send('You do not have permission to do this');
				return;
			}
			try {
				eval(out);
			} catch (error) {
				console.log("error");
				console.log(error);
				message.channel.send(`Unhandled exception: \n ${error}`);
			}
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
		} else if (command === 'gay') {
			if (args[0] === 'add') {
				if (args[1] === undefined) return;
				await db.query('UPDATE members SET sexuality=$1 WHERE userid = $2',
					[args[1], message.author.id]);
				message.channel.send(`set ${message.author.username} to ${args[1]}`);
				return;
			} else if (args[0] === 'alter') {
				let mem = message.mentions.members?.first()
				if (!mem) return;
				if (message.member?.permissions.has(discord.Permissions.FLAGS.MANAGE_NICKNAMES)) {
					await db.query('UPDATE members SET sexuality=$1 WHERE userid = $2',
						[args[2], mem.id]);
					message.channel.send(`set ${mem.user.username} to ${args[2]}`);
				};
				return;
			}
			message.mentions.members?.each(async (eachmem) => {
				let s = await db.query('SELECT * FROM members WHERE userid = $1', [BigInt(eachmem.id)])
				message.channel.send(`${(eachmem.nickname !== null) ? eachmem.nickname : eachmem.user.username} is ${s.rows[0].sexuality}`);
			})
			message.mentions.roles?.each(async (eachrole) => {
				eachrole.members.each(async (eachmem) => {
					let s = await db.query('SELECT * FROM members WHERE userid = $1', [BigInt(eachmem.id)])
					message.channel.send(`${(eachmem.nickname !== null) ? eachmem.nickname : eachmem.user.username} is ${s.rows[0].sexuality}`)
				})
			})
		} else if (command === 'dump') {
			let id = message.mentions.channels.first()?.id;
			if (id) {
				let channel = await message.guild?.channels.fetch(id);
				if (!channel || channel.type === 'GUILD_STAGE_VOICE' || channel.type === 'GUILD_VOICE'
					|| channel.type === 'GUILD_CATEGORY' || channel.type === 'GUILD_STORE') return;
				let lim = parseInt(args[1]);
				if (lim === NaN) return;
				let messages = await channel.messages.fetch({ limit: lim });
				messages = messages.filter(msg => (msg.system === false));
				let messagesArray = Array.from(messages.values()).reverse();
				messagesArray.forEach(async msg => {
					let member = await msg.guild?.members.fetch(msg);
					if (!member) return;
					let timestamp = lux.DateTime.fromJSDate(msg.createdAt);
					let timeString = timestamp.setZone("Australia/Sydney").toFormat('FFFF');
					let name = (member.nickname) ? member.nickname : `${msg.author.username}#${msg.author.discriminator}`;
					await message.channel.send(`**Message from ${name}**: *${timeString}*\n ${msg.content}`)
				});
			}
		} else if (command === 'deleted') {
			if (!message.guildId) return
			if (!message.member?.permissions.has('MANAGE_MESSAGES')) {
				message.channel.send('You are missing permission \`MANAGE_MESSAGES\`.');
				return
			}
			let del = await db.query('SELECT * FROM deletedmsgs WHERE guildid=$2 ORDER BY msgtime DESC LIMIT $1;',
				[(args[0]) ? Number((args[0])) : 10, message.guildId]);
			del.rows.forEach(async (msg) => {
				const DeleteEmbed = new discord.MessageEmbed()
					.setTitle("Deleted Message")
					.setColor("#fc3c3c")
					.addField("Author", `<@${msg.author}>`, true)
					.addField("Deleted By", msg.deleted_by, true)
					.addField("Channel", `<#${msg.channel}>`, true)
					.addField("Message", msg.content || "None")
					.setFooter(`Message ID: ${msg.msgid} | Author ID: ${msg.author}`);
				message.channel.send({
					embeds: [DeleteEmbed]
				})
			})
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


async function heartbeat() {
	//console.log('Heartbeat sent.');
	await new Promise(r => setTimeout(r, 500));
	bot.emit('heartbeated');
};

//if doheartbeat = true {
setInterval(heartbeat, 5000);
//};

bot.on('heartbeated', () => {
	//console.log(`Heartbeat recived. Logged in as ${bot.user.tag}`);
});

//zac cringe
//gustavo cringe
//gerald cringe 

