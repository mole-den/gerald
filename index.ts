import * as discord from "discord.js";
import * as pg from 'pg';
import fs from 'fs';
fs;

process.on('uncaughtException', async error => {
	console.log(error);
	console.log('err');
	if (!bot) { process.exit() }
	let x = await (await bot.guilds.fetch('809675885330432051')).channels.fetch('809675885849739296') as discord.TextChannel
	await x.send(`<@471907923056918528>, <@811413512743813181>\n FATAL:\n ${error}\n Exiting process`)
	process.exit()
});

const myIntents = new discord.Intents();
myIntents.add(discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_MESSAGES,
	discord.Intents.FLAGS.DIRECT_MESSAGES, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
	discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, discord.Intents.FLAGS.GUILD_PRESENCES);
const bot = new discord.Client({ intents: myIntents });
const logmessages = false;
const prefix = "g";
//var doheartbeat = true
//const guildID = '576344535622483968';

const token: string = 'NjcxMTU2MTMwNDgzMDExNjA1.Xi402g.Qt5Ueo_U5m87MLtcnXnM_3xx0yo'; //the sacred texts!
const dbToken: string = `postgres://tlnjcyrrehuvfw:4c8c5cbcc6ed9f37fcab326dcd8e9d847014bc696a2cbd89fa1fe3c30fdc3cc6@ec2-44-194-68-175.compute-1.amazonaws.com:5432/d61trk6httm3q3`; console.log(process.version);

bot.on('ready', () => {
	console.log('Preparing to take over the world...');
	console.log('World domination complete.');
	console.log('ONLINE');
	bot.user!.setPresence({ activities: [{ name: 'you', type: "WATCHING" }], status: 'dnd' });
	//online or dnd
	//bot.emit('heartbeated');
});

const db = new pg.Client({
	connectionString: dbToken,
	ssl: {
		rejectUnauthorized: false
	}
});
(async () => {
	await db.connect();
})()

bot.login(token);
//egg

bot.on('guildMemberAdd', (member) => {
	member;
	db.query(`INSERT INTO gmember (guildid, userid, sexuality) VALUES ($1, $2, 'straight')`,
		[BigInt(member.guild.id), BigInt(member.id)])
})

bot.on('userUpdate', async (user) => {
	console.log('changed');
	let fullUser = ((user.partial) ? (await user.fetch()) : user);
	db.query('UPDATE gmember SET username = $1 WHERE userid = $2',
		[`${fullUser.username}#${fullUser.discriminator}`, fullUser.id]);
});

let lastChannel: discord.TextBasedChannels;
bot.on('messageCreate', (message: discord.Message) => {
	lastChannel = message.channel
	if (message.author.bot) return
	if (logmessages === false) return;
	if (message.channel.type === 'DM') return;
	const channel = message.guild!.channels.cache.find(ch => ch.name === 'gerald');
	console.log(`${message.author.tag} said: "${message.content}" in ${message.guild!.name}`);
	if (!channel) return;
	if (message.channel.name === 'gerald') return;
	if (channel.type === 'GUILD_TEXT') {
		(channel as discord.TextChannel).send(`**${message.author.tag}** said: \`${message.content}\` in ${message.guild!.name}`);
	}
});



bot.on('messageCreate', async (message: discord.Message) => {
	try {
		const userID = message.author;
		userID;
		if (!message.content.startsWith(prefix) || message.author.bot) return;

		const args = message.content.slice(prefix.length).trim().split(' ');
		const command = args.shift()?.toLowerCase();

		if (command === `help`) {
			message.channel.send('Hello! I am Gerald. I will enable you to take control of your server by my rules >:)');
		} else if (command === `detect`) {
			// grab the "first" mentioned user from the message
			// this will return a `User` object, just like `message.author`
			const taggedUser = message.mentions.users.first();
			if (taggedUser) {
				message.channel.send(`User detected: ${taggedUser.username} User ID is: ` + taggedUser);
			}

		} else if (command === `t-servertest`) {
			if (message.channel.type !== 'DM') {
				message.channel.send(`This server's name is: ${message.guild!.name}`);
			}
		} else if (command === `setup`) {
			message.channel.send(`Beginning setup but no because zac cant code`);
			//if (err) return console.log(err);
			console.log(`L`);

			//im a gnome
		} else if (command === 'updatedb') {
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				message.channel.send('Go away');
				return;
			}
			await message.channel.send('Updating database rows');
			let users = await message.guild?.members.fetch()
			users?.forEach((i) => {
				db.query('UPDATE gmember SET username = $1 WHERE userid = $2',
					[`${i.user.username}#${i.user.discriminator}`, i.id]);
			});
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
			let author = await message.guild?.members.fetch(message.author)
			if (author && author.permissions.has(discord.Permissions.FLAGS.BAN_MEMBERS)) {
				if (args[0] && args[0] === "add") {
					let user = message.mentions.users?.first();
					db.query(`INSERT INTO gmember (guildid, userid, blacklisted) VALUES ($1, $2, true) ON CONFLICT UPDATE`, [BigInt(message.guildId!), BigInt(user?.id || args[1])]);
				};
				let blist = await db.query("SELECT * FROM gmember WHERE guildid=$1 AND blacklisted", [BigInt(message.guildId!)]);
				blist.rows.forEach(user => message.guild!.members.ban(user.userid, {
					reason: "Blacklisted by Gerald"
				}));
				message.channel.send('Smite thee with thunderbolts!');

			} else {
				message.channel.send('You do not have the required permissions')
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
			console.log(out)
			let data = await db.query(out)
			console.log('done');
			let JSONdata = JSON.stringify(data.rows);
			if (JSONdata.length < 4000) {
				message.channel.send(`${data.command} completed - ${data.rowCount} rows, \n${JSONdata}`);
				return;
			} else {
				const buffer = Buffer.from(JSONdata)
				const attachment = new discord.MessageAttachment(buffer, 'file.json');
				message.channel.send(`${data.command} completed - ${data.rowCount} rows,`);
				message.channel.send({ files: [attachment] });
			}

		} else if (command === "eval") {
			let str = message.content;
			let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
			// if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
			// 	message.channel.send('You do not have the required permissions.');
			// 	return;
			// }
			try {
				eval(out);
			} catch (error) {
				console.log("error");
				console.log(error);
				if (message.author.id == "471907923056918528" || message.author.id == "811413512743813181") {
					lastChannel.send(`Unhandled exception: \n ${error}`);
					return;
				}

				lastChannel.send(`<@471907923056918528>, <@811413512743813181>\n Unhandled exception: \n ${error}`);
			}
			message.channel.send('Completed \n');
		} else if (command === "db-setup") {
			return;
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				message.channel.send('You do not have the required permissions.');
				return;
			}
			let users = await message.guild?.members.fetch()
			users?.forEach((i) => {
				db.query('INSERT INTO gmember (guildid, userid) VALUES ($1, $2)', [BigInt(i.guild.id), BigInt(i.id)]);
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
			message.channel.send(`Websocket heartbeat: ${bot.ws.ping}ms`)
		} else if (command === 'gay') {
			let user = message.mentions.members?.first();
			if (args[0] === 'add') {
				if (args[1] === undefined) return;
				let updated = args.slice(1).join('');
				await db.query('UPDATE gmember SET sexuality=$1 WHERE userid = $2',
					[updated, message.author.id]);
				message.channel.send(`set ${message.author.username} to ${args[1]}`);
				return;
			}
			if (user) {
				let s = await db.query('SELECT * FROM gmember WHERE userid = $1', [BigInt(user.id)])
				message.channel.send(`${(user.nickname !== null) ? user.nickname : user.user.username} is ${s.rows[0].sexuality}`)
			}
		} else if (command === 'dump') {
			let id = message.mentions.channels.first()?.id;
			if (id) {
				let channel = await message.guild?.channels.fetch(id);
				if (!channel || channel.type === 'GUILD_STAGE_VOICE' || channel.type === 'GUILD_VOICE' 
				|| channel.type === 'GUILD_CATEGORY' || channel.type === 'GUILD_STORE')return;
				let lim = parseInt(args[1]);
				if (lim === NaN) return;
				let messages = await channel.messages.fetch({limit: lim});
				messages = messages.filter(msg => (msg.author.bot === false));
				messages = messages.filter(msg => (msg.system === false));
				let messagesArray = Array.from(messages.values()).reverse();
				messagesArray.forEach(async msg => {
					let member= await msg.guild?.members.fetch(msg);
					if (!member) return;
					let name = (member.nickname) ? member.nickname : `${msg.author.username}#${msg.author.discriminator}`;
					await message.channel.send(`**Message from ${name}** \n ${msg.content}`)
				})
			}
		}
	} catch (error) {
		console.log("error");
		console.log(error);
		if (message.author.id == "471907923056918528" || message.author.id == "811413512743813181") {
			lastChannel.send(`Unhandled exception: \n ${error}`);
			return;
		}
		lastChannel.send(`<@471907923056918528>, <@811413512743813181>\n Unhandled exception: \n ${error}`);
	}
});


async function heartbeat() {
	//console.log('Heartbeat sent.');
	await new Promise(r => setTimeout(r, 500));
	bot.emit('heartbeated');
}

//if doheartbeat = true {
setInterval(heartbeat, 5000);
//}

bot.on('heartbeated', () => {
	//console.log(`Heartbeat recived. Logged in as ${bot.user.tag}`);
});
