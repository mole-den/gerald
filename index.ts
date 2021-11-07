import * as discord from "discord.js";
import * as voice from '@discordjs/voice';
import * as pg from 'pg';
import * as lux from 'luxon';
import axios from 'axios';
voice;
process.on('uncaughtException', async error => {
	console.log(error);
	console.log('err');
	if (!bot) { process.exit() }
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
//var doheartbeat = true;
//const guildID = '576344535622483968';
const token = 'NjcxMTU2MTMwNDgzMDExNjA1.Xi402g.HBaMIbEioxYq8r1ZCYvAn2xusbU'
const dbToken = 'postgres://kivpldtxhvcjwt:92eaa0724d983ca89ff6b683be3e1d0ef1a6e7f884b5986816a3810c0eaa5284@ec2-34-194-100-156.compute-1.amazonaws.com:5432/ddo6pnpikd2ji3'

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

(async () => {
	await db.connect();
})();
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

bot.on('guildCreate', (guild) => {
	db.query('INSERT INTO guilds (guildid) VALUES ($1) ON CONFLICT DO NOTHING', [guild.id]);
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
	let delTime = Math.round(+new Date() / 1000);
	if (message.author?.bot) return
	if (message.guild === null) return;
	if (message.partial) return;
	await db.query(`INSERT INTO deletedmsgs (author, content, guildid, timestamp, channel, deleted_time) VALUES ($1, $2, $3, $4, $5, $6)`,
		[BigInt(message.author.id), message.cleanContent, message.guild.id, Math.round((message.createdAt.getTime()) / 1000), message.channel.id, delTime]);
});

bot.on('messageDeleteBulk', async (array) => {
	let delTime = Math.round(+new Date() / 1000);
	array.each(async (message) => {
		if (message.partial || !message.guild || message.author.bot) return;
		await db.query(`INSERT INTO deletedmsgs (author, content, guildid, timestamp, channel, deleted_time) VALUES ($1, $2, $3, $4, $5, $6)`,
			[BigInt(message.author.id), message.cleanContent, message.guild.id, Math.round((message.createdAt.getTime()) / 1000), message.channel.id, delTime]);
	})
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
				message.channel.send('You do not have permission to change the bot status');
				return;
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
		} else if (command === 'setdb') {
			message.channel.send('rebuilding database');
			bot.guilds.fetch().then(async (guilds) => {
				guilds.each(async (guild) => {
					let x = await guild.fetch()
					db.query('INSERT INTO guilds (guildid) VALUES ($1) ON CONFLICT DO NOTHING', [x.id]);
					(await x.members.fetch()).each(async (mem) => {
						db.query(`INSERT INTO members (guild, userid, username) VALUES ($1, $2, $3)`,
							[x.id, mem.id, `${mem.user.username}#${mem.user.discriminator}`]);
					})
				})
			})
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
		} else if (command === 'updatedb') {
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				message.channel.send('');
				return;
			}
			await message.channel.send('Updating database rows');
			let users = await message.guild?.members.fetch()
			users?.forEach((i) => {
				db.query('UPDATE members SET username = $1 WHERE userid = $2',
					[`${i.user.username}#${i.user.discriminator}`, i.id]);
			});
			await message.channel.send('Update complete')
		} else if (command === `die`) {
			message.channel.send(`no u`);
		} else if (command === `politics`) {
			message.channel.send(`https://cdn.discordapp.com/attachments/377228302336655362/886234477578301490/video0.mp4`);
		} else if (command === `cool`) {
			message.channel.send(`You are not as cool as me.`);
		} else if (command === `invite`) {
			message.channel.send(`https://discord.com/oauth2/authorize?client_id=671156130483011605&scope=bot&permissions=8`);
		} else if (command === 'smite') {
			if (message.channel.type === 'DM') return;
			if (message.guild === null) return;
			if (message.member!.permissions.has(discord.Permissions.FLAGS.BAN_MEMBERS)) {
				// if args[0] = 'add' then update the database by adding the mentioned users id to the blacklisted users in the database
				if (args[0] === 'add') {
					let user = message.mentions.members?.first();
					if (user) {
						await db.query(`INSERT INTO members (userid, guild, blacklisted) VALUES ($1, $2, $3) 
						ON CONFLICT (userid, guild) DO UPDATE SET blacklisted = $3`, [user.id, message.guild.id, true]);
						message.guild.bans.create(user, { reason: 'Blacklisted', days: 0 });
						message.channel.send(`${user.user.username} has been added to the blacklist and banned`);
					} else {
						let num = parseInt(args[1]);
						if (num !== NaN) {
							await db.query('INSERT INTO members (userid, blacklisted, guild) VALUES ($1, $2, $3) ON CONFLICT (userid, guild) DO UPDATE SET blacklisted = $2', [num, true, message.guild.id]);
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
				message.channel.send('You are not allowed to use this command.');
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
				message.channel.send('You do not have the required permissions');
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
				message.channel.send('You do not have the required permissions.');
				return;
			}
			try {
				eval(out);
			} catch (error) {
				console.log("error");
				console.log(error);
				message.channel.send(`Unhandled exception: \n ${error}`);
			}
		} else if (command === "db-setup") {
			return
			if (message.author.id !== '811413512743813181') return;
			if (!message.guild) return
			let users = await message.guild!.members.fetch();
			users?.forEach(async (i) => {
				try {
					db.query('INSERT INTO members(guild, userid, username) VALUES ($1, $2, $3)',
						[BigInt(i.guild.id), BigInt(i.user.id), `${i.user.username}#${i.user.discriminator}`])
				} catch (error) {
					console.log("error");
					console.log(error);
					let x = await (await bot.guilds.fetch('895064783135592449')).channels.fetch('903400898397622283') as discord.TextChannel;
					if (message.author.id == "471907923056918528" || message.author.id == "811413512743813181") {
						x.send(` <@!811413512743813181> <@!471907923056918528>\n Unhandled exception: \n ${error}`);
						return;
					}
					x.send(` <@!811413512743813181> <@!471907923056918528>\n Unhandled exception: \n ${error}`);
				}
			});
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
			let del = await db.query('SELECT * FROM deletedmsgs WHERE guildid=$2 ORDER BY timestamp DESC LIMIT $1;',
				[(args[0]) ? Number((args[0])) : 10, message.guildId]);
			del.rows.forEach(async (msg) => {
				let member = await message.guild?.members.fetch(msg.author);
				if (!member) return;
				let timeString = lux.DateTime.fromSeconds(msg.timestamp).setZone("Australia/Sydney").toFormat('tt DD');
				let name = (member?.nickname) ? member.nickname : `${member?.user.username}#${member.user.discriminator}`;
				let cnl = await (await bot.guilds.fetch(message.guildId!.toString())).channels.fetch(msg.channel) as discord.TextChannel;
				await message.channel.send(`**Deleted Message from ${name} in <#${msg.channel}>**: *${timeString}*\n ${discord.Util.cleanContent(msg.content, cnl)}`)
			})
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
//}

bot.on('heartbeated', () => {
	//console.log(`Heartbeat recived. Logged in as ${bot.user.tag}`);
});
//zac cringe 
//gustavo cringe
//gerald cringe 
