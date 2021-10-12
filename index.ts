import * as discord from "discord.js";
import * as pg from 'pg';
import fs from 'fs';
fs;
const myIntents = new discord.Intents();
myIntents.add(discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_MESSAGES,
	discord.Intents.FLAGS.DIRECT_MESSAGES, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
	discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, discord.Intents.FLAGS.GUILD_PRESENCES
);
var db: pg.Client;
let dbConnected: boolean = false
const bot = new discord.Client({ intents: myIntents });
const logmessages = false;
const prefix = "g";
//var doheartbeat = true
//const guildID = '576344535622483968';

const token: string = 'NjcxMTU2MTMwNDgzMDExNjA1.Xi402g.f7v2nZdP-U5iMS6YOvg5x16igjI'; //the sacred texts!
console.log(process.version);

bot.on('ready', () => {
	console.log('Preparing to take over the world...');
	console.log('World domination complete.');
	console.log('ONLINE');
	bot.user!.setPresence({ activities: [{ name: 'you.', type: "WATCHING" }], status: 'dnd' });
	//online or dnd
	//bot.emit('heartbeated');
});


bot.login(token);
//egg



let lastChannel: discord.TextBasedChannels;
bot.on('message', (message: discord.Message) => {
	lastChannel = message.channel
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



bot.on('message', async (message: discord.Message) => {
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
		} else if (command === `die`) {
			message.channel.send(`no u`);
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
					if (user) {
						db.query(`INSERT INTO users (userid) VALUES ($1) ON CONFLICT DO NOTHING`, [BigInt(user.id)]);
						db.query(`INSERT INTO gmember (guild, userid, blacklisted) VALUES ($1, $2, true) ON CONFLICT UPDATE`, [BigInt(message.guildId!), BigInt(user.id)]);

					} else {
						db.query(`INSERT INTO users (userid) VALUES ($1)`, [BigInt(args[1])]);
						db.query(`INSERT INTO gmember (guild, userid, blacklisted) VALUES ($1, $2, true) ON CONFLICT UPDATE`, [BigInt(message.guildId!), BigInt(args[1])]);
					}
				};
				let blist = await db.query("SELECT * FROM gmember WHERE guild=$1 AND blacklisted", [BigInt(message.guildId!)]);
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
		} else if (command === 'connect') {
			db = new pg.Client({
				connectionString: args[0],
				ssl: {
					rejectUnauthorized: false
				}
			});
			await db.connect();
			dbConnected = true
			message.channel.send('**Connection established with database**');
		} else if (command === 'query') {
			let str = message.content;
			let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				message.channel.send('You do not have the required permissions');
				return;
			}
			if (dbConnected === true) {
				console.log(out)
				let data = await db.query(out)
				console.log('done')
				try {
					message.channel.send(`${data.command} completed - ${data.rowCount} rows, \n${JSON.stringify(data.rows)}`)
				} catch (error) {
					console.log("error");
					console.log(error);
					if (message.author.id == "471907923056918528" || message.author.id == "811413512743813181") {
						lastChannel.send(`Unhandled exception: \n ${error}`);
						return;
					}
					lastChannel.send(`<@471907923056918528>, <@811413512743813181>\n Unhandled exception: \n ${error}`);
				}

			} else {
				message.channel.send('Not connected to database')
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
				throw error;
			}
			message.channel.send('Completed \n');
		} else if (command === "db-setup") {
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				message.channel.send('You do not have the required permissions.');
				return;
			}
			let users = await message.guild?.members.fetch()
			users?.forEach((i) => {
				db.query('INSERT INTO users (userid) VALUES ($1)', [BigInt(i.id)]);
				db.query('INSERT INTO gmember (guild, userid) VALUES ($1, $2)', [BigInt(i.guild.id), BigInt(i.id)]);
			});
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

process.on('uncaughtException', error => {
	console.log(error)
	lastChannel.send(`<@471907923056918528>, <@811413512743813181>\n ERR: Unhandled exception: \n ${error}\n **Exiting...**`);
	process.exit()
});
